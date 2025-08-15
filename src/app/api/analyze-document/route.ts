// src/app/api/analyze-document/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "../../../lib/firebase/admin";
import * as admin from "firebase-admin";
import mammoth from "mammoth";
import { extractText } from "unpdf";

// Define the interface for the structured metadata expected from Gemini
interface StructuredDocumentMetadata {
  documentName: string;
  class: string;
  subject: string;
  topic: string;
  chapter: string;
  dateCreated: string; // Use string for date as LLM often returns text, will parse later if needed
}

/**
 * API route to analyze a document using the Gemini API.
 * This route fetches the user's Gemini API key from Firestore (for BYOK)
 * and then sends the document content for analysis.
 *
 * It's structured as an Edge Function compatible route.
 * IMPORTANT: This route now uses Firebase Admin SDK for secure server-side Firestore operations.
 */
export async function POST(req: NextRequest) {
  let requestBody;

  try {
    requestBody = await req.json();
    const { documentUrl, documentId, userId, fileName, fileType } = requestBody;

    // Basic validation for required fields
    if (!documentUrl || !documentId || !userId || !fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields for analysis." },
        { status: 400 }
      );
    }

    // 1. Fetch the user's Gemini API Key from Firestore using ADMIN SDK
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      try {
        await adminDb
          .collection("users")
          .doc(userId)
          .collection("documents")
          .doc(documentId)
          .update({
            status: "failed",
            analysisError: "User profile not found for API key lookup.",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } catch (firestoreError: any) {
        console.error(
          "Failed to update document status after user profile not found (Admin SDK):",
          firestoreError
        );
      }
      return NextResponse.json(
        {
          error:
            "User profile not found or Gemini API Key not set. Please set your API key in settings.",
        },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const geminiApiKey = userData?.geminiApiKey;

    if (!geminiApiKey) {
      try {
        await adminDb
          .collection("users")
          .doc(userId)
          .collection("documents")
          .doc(documentId)
          .update({
            status: "failed",
            analysisError: "Gemini API Key missing or invalid in user profile.",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } catch (firestoreError: any) {
        console.error(
          "Failed to update document status after missing API key (Admin SDK):",
          firestoreError
        );
      }
      return NextResponse.json(
        {
          error:
            "Gemini API Key not found for user. Please set it in your settings.",
        },
        { status: 401 }
      );
    }

    // Initialize Gemini model with the user's API key
    // Use gemini-2.5-flash-preview-05-20 for text and structured responses
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const textModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
    });

    let documentTextContent = "";

    // Update document status to 'processing' before fetching content
    try {
      await adminDb
        .collection("users")
        .doc(userId)
        .collection("documents")
        .doc(documentId)
        .update({
          status: "processing",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (firestoreError: any) {
      console.error(
        "Failed to update document status to 'processing' (Admin SDK):",
        firestoreError
      );
    }

    try {
      console.log(
        `Attempting to fetch document from Storage using Admin SDK for: ${fileName}`
      );

      const bucket = admin.storage().bucket();
      const url = new URL(documentUrl);
      const filePath = decodeURIComponent(
        url.pathname.split("/o/")[1].split("?")[0]
      );
      const [buffer] = await bucket.file(filePath).download();

      console.log(
        `Document buffer created with size: ${buffer.byteLength} bytes using Admin SDK Storage.`
      );
      console.log(`Attempting to extract text from file type: ${fileType}`);

      if (fileType === "application/pdf") {
        console.log("Extracting text from PDF using unpdf...");
        const uint8Array = new Uint8Array(buffer);
        const unpdfResult = await extractText(uint8Array);
        documentTextContent = unpdfResult.text.join("\n"); // Join pages with newlines
        console.log("PDF text extracted successfully.");
      } else if (
        fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        console.log("Extracting text from DOCX using mammoth...");
        const result = await mammoth.extractRawText({ buffer: buffer });
        documentTextContent = result.value;
        console.log("DOCX text extracted successfully.");
      } else if (fileType === "text/plain") {
        documentTextContent = buffer.toString("utf8");
      } else {
        documentTextContent = `Unable to extract text from this file type: ${fileType}. Analyzing based on file name and URL.`;
        console.warn(`Unsupported file type for text extraction: ${fileType}`);
      }

      const maxTextLength = 10000;
      if (documentTextContent.length > maxTextLength) {
        documentTextContent =
          documentTextContent.substring(0, maxTextLength) +
          "\n... [Document content truncated]";
        console.log(
          `Document text content truncated to ${maxTextLength} characters.`
        );
      } else {
        console.log(
          `Extracted document text content length: ${documentTextContent.length} characters.`
        );
      }
    } catch (contentError: any) {
      console.error(
        "Error fetching or extracting document content:",
        contentError
      );
      await adminDb
        .collection("users")
        .doc(userId)
        .collection("documents")
        .doc(documentId)
        .update({
          status: "failed",
          analysisError: `Failed to fetch or extract content from Storage: ${contentError.message}`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      return NextResponse.json(
        {
          error: `Failed to fetch or extract content for analysis: ${contentError.message}`,
        },
        { status: 500 }
      );
    }

    // PROMPT FOR GENERAL ANALYSIS (TEXT) - Now focused ONLY on structured Markdown summary
    const analysisPrompt = `Generate a precise, condensed summary of the following educational document. Focus exclusively on the academic or core subject matter of the document. **Ignore and filter out any promotional content, advertisements, or information unrelated to the main educational topic (e.g., course schemes, institution details, personal endorsements).**
    The summary should be between 10-15 lines and structured using Markdown headings for each section, as follows:

    ### 1. Why this topic matters (Hook)
    [1-2 sentences explaining relevance]

    ### 2. Core Concepts
    [2-3 sentences introducing core concepts with context]

    ### 3. Key Points & Processes
    [4-5 sentences explaining key points, theories, or processes]

    ### 4. Real-world Applications
    [2 sentences on applications or examples]

    ### 5. Conclusion & Takeaways
    [2 sentences summarizing key takeaways and actionable insights]

    STYLE GUIDELINES:
    - Use active voice and clear transitions within each section.
    - Adapt vocabulary to student level.
    - Include specific examples from the document where appropriate.
    - Maintain logical flow between concepts.
    - The content within each heading should be prose; avoid bullet points within these sections.

    AVOID:
    - Technical jargon without explanation.
    - Redundant information.
    - Overly complex sentence structures.
    - **Do NOT include multiple-choice questions or lists of key topics/subheadings in this summary output. This output is ONLY for the structured summary.**

    --- Document Content ---
    ${documentTextContent}
    --- End Document Content ---
    `;

    // PROMPT FOR STRUCTURED METADATA (JSON)
    // The model will generate a JSON object based on this prompt.
    // We explicitly ask for JSON format in the prompt and set responseMimeType to 'application/json'.
    const metadataPrompt = `Based on the following educational document, extract the following information as a JSON object: Focus exclusively on the academic or core subject matter of the document. **Ignore and filter out any promotional content, advertisements, or information unrelated to the main educational topic (e.g., course schemes, institution details, personal endorsements).**
    {
      "documentName": "The primary title or name of the document. Default to original filename if not clear.",
      "class": "The suggested educational class or grade level (e.g., '10th Grade', 'Primary School', 'College Level Chemistry').",
      "subject": "The main academic subject (e.g., 'Mathematics', 'History', 'Physics').",
      "topic": "A specific topic or unit covered (e.g., 'Algebraic Equations', 'World War II', 'Quantum Mechanics').",
      "chapter": "A specific chapter or section name/number (e.g., 'Chapter 4: Electrostatics', 'Section 2.1: Data Structures').",
      "dateCreated": "The approximate date the document content was created or pertains to (e.g., '2023-05-15', 'circa 1945', 'October 2024')."
    }
    Provide ONLY the JSON object. Do not include any other text or formatting.

    Document Name: "${fileName}"
    Document Content:
    ${documentTextContent}
    `;

    console.log(
      `Sending analysis requests to Gemini for document: ${fileName}`
    );

    let analysisText = "";
    let structuredMetadata: StructuredDocumentMetadata | null = null;
    let analysisSuccess = false;

    try {
      // First, get the general analysis text (Summary only)
      const textResult = await textModel.generateContent(analysisPrompt);
      analysisText = textResult.response.text();

      // Then, get the structured metadata
      const structuredResult = await textModel.generateContent({
        contents: [{ role: "user", parts: [{ text: metadataPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const structuredResponseText = structuredResult.response.text();
      // Attempt to parse the JSON response
      structuredMetadata = JSON.parse(
        structuredResponseText
      ) as StructuredDocumentMetadata;

      analysisSuccess = true;
      console.log(`Gemini analysis complete for ${fileName}`);
      console.log("Structured Metadata:", structuredMetadata);
    } catch (geminiError: any) {
      console.error(
        "Error during Gemini API call (text or structured):",
        geminiError
      );
      analysisSuccess = false;
      analysisText = `AI analysis failed: ${
        geminiError.message || "Unknown API error."
      }`;
      structuredMetadata = {
        // Default fallback metadata in case of AI failure
        documentName: fileName,
        class: "N/A",
        subject: "N/A",
        topic: "N/A",
        chapter: "N/A",
        dateCreated: new Date().toISOString().split("T")[0],
      };
    }

    try {
      await adminDb
        .collection("users")
        .doc(userId)
        .collection("documents")
        .doc(documentId)
        .update({
          status: analysisSuccess ? "analyzed" : "failed",
          analysisResult: analysisText,
          // Save the structured metadata as a separate field
          structuredMetadata: structuredMetadata,
          analysisError: analysisSuccess
            ? admin.firestore.FieldValue.delete()
            : analysisText, // Clear error if successful
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      console.log(
        `Document status and analysis results saved to Firestore for ${fileName}`
      );
    } catch (firestoreError: any) {
      console.error(
        "Failed to update document status or save results (Admin SDK):",
        firestoreError
      );
      return NextResponse.json(
        {
          message:
            "Document analyzed, but failed to save analysis results to Firestore.",
          analysis: analysisText,
          structuredMetadata: structuredMetadata,
          firestoreUpdateError: firestoreError.message,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Document analyzed successfully!",
        analysis: analysisText,
        structuredMetadata: structuredMetadata,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API Route Global Error:", error);
    if (requestBody && requestBody.documentId && requestBody.userId) {
      try {
        await adminDb
          .collection("users")
          .doc(requestBody.userId)
          .collection("documents")
          .doc(requestBody.documentId)
          .update({
            status: "failed",
            analysisError: error.message || "Unknown error during analysis.",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } catch (firestoreError: any) {
        console.error(
          "Failed to update document status to 'failed' in catch block (Admin SDK):",
          firestoreError
        );
      }
    }
    return NextResponse.json(
      { error: error.message || "Internal server error during analysis." },
      { status: 500 }
    );
  }
}
