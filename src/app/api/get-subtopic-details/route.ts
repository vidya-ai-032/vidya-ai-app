// src/app/api/get-subtopic-details/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "../../../lib/firebase/admin";
import * as admin from "firebase-admin";
import mammoth from "mammoth";
import { extractText } from "unpdf";

/**
 * API route to get detailed content for a specific subtopic.
 * It fetches the original document content, and then uses Gemini to:
 * 1. Extract relevant information from the original document for the subtopic.
 * 2. Generate additional explanatory content, examples, and definitions (simulating external research).
 */
export async function POST(req: NextRequest) {
  let requestBody;

  try {
    requestBody = await req.json();
    const { documentId, userId, subtopicQuery } = requestBody;

    // Basic validation
    if (!documentId || !userId || !subtopicQuery) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: documentId, userId, or subtopicQuery.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch user's Gemini API Key
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "User profile not found." },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const geminiApiKey = userData?.geminiApiKey;
    const userRole = userData?.role || "student"; // Get user role for tailored responses

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Key not found for user. Please set it in your settings.",
        },
        { status: 401 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const textModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
    });

    // 2. Fetch the original document details and content from Firestore
    const documentDocRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("documents")
      .doc(documentId);
    const documentDocSnap = await documentDocRef.get();

    if (!documentDocSnap.exists) {
      return NextResponse.json(
        { error: "Document not found in your library." },
        { status: 404 }
      );
    }

    const documentData = documentDocSnap.data();
    const documentUrl = documentData?.downloadURL;
    const fileType = documentData?.fileType;
    const fileName = documentData?.fileName;

    if (!documentUrl || !fileType || !fileName) {
      return NextResponse.json(
        { error: "Missing document file details." },
        { status: 500 }
      );
    }

    let originalDocumentTextContent = "";
    try {
      const bucket = admin.storage().bucket();
      const url = new URL(documentUrl);
      const filePath = decodeURIComponent(
        url.pathname.split("/o/")[1].split("?")[0]
      );
      const [buffer] = await bucket.file(filePath).download();

      if (fileType === "application/pdf") {
        const uint8Array = new Uint8Array(buffer);
        const unpdfResult = await extractText(uint8Array);
        originalDocumentTextContent = unpdfResult.text.join("\n");
      } else if (
        fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer: buffer });
        originalDocumentTextContent = result.value;
      } else if (fileType === "text/plain") {
        originalDocumentTextContent = buffer.toString("utf8");
      } else {
        originalDocumentTextContent = `Unable to extract text from file type: ${fileType}.`;
      }

      const maxTextLength = 10000; // Keep consistent for input
      if (originalDocumentTextContent.length > maxTextLength) {
        originalDocumentTextContent =
          originalDocumentTextContent.substring(0, maxTextLength) +
          "\n... [Document content truncated]";
      }
    } catch (contentError: any) {
      console.error(
        "Error fetching or extracting original document content:",
        contentError
      );
      return NextResponse.json(
        {
          error: `Failed to retrieve original document content for analysis: ${contentError.message}`,
        },
        { status: 500 }
      );
    }

    // 3. Define prompts for two distinct AI calls
    const documentSpecificPrompt = `Based SOLELY on the following educational document content, provide detailed information, definitions, and examples specifically for the subtopic: "${subtopicQuery}".
    If the document does not contain sufficient information, state that clearly. Focus only on what is present in this text.
    
    Document Content:
    ---
    ${originalDocumentTextContent}
    ---
    
    Target Subtopic: "${subtopicQuery}"
    `;

    const researchedExplanationPrompt = `Provide a comprehensive explanation, intuitive definitions, and practical examples for the academic concept "${subtopicQuery}".
    Assume you are performing external research (do NOT reference any specific document or page numbers).
    The explanation should be suitable for a ${userRole} level. Make it easy to understand and provide diverse examples if applicable.`;

    console.log(
      `Sending subtopic detail requests to Gemini for "${subtopicQuery}" from document "${fileName}"`
    );

    let documentContentResult = "";
    let researchedContentResult = "";
    let subtopicDetailSuccess = false;

    try {
      // AI Call 1: Extract from original document
      const documentResult = await textModel.generateContent(
        documentSpecificPrompt
      );
      documentContentResult = documentResult.response.text();

      // AI Call 2: Generate researched explanation
      const researchedResult = await textModel.generateContent(
        researchedExplanationPrompt
      );
      researchedContentResult = researchedResult.response.text();

      subtopicDetailSuccess = true;
      console.log(
        `Gemini subtopic detail generation complete for: ${subtopicQuery}`
      );
    } catch (geminiError: any) {
      console.error(
        "Error during Gemini API calls for subtopic details:",
        geminiError
      );
      subtopicDetailSuccess = false;
      documentContentResult = `Failed to retrieve document-specific content: ${
        geminiError.message || "Unknown API error."
      }`;
      researchedContentResult = `Failed to generate researched content: ${
        geminiError.message || "Unknown API error."
      }`;
      // Do not return error here, proceed to return what we have (even if it's error messages)
    }

    // 4. Return results to the frontend
    return NextResponse.json(
      {
        message: subtopicDetailSuccess
          ? "Subtopic details generated successfully!"
          : "Partial success or failure in generating subtopic details.",
        documentContent: documentContentResult,
        researchedContent: researchedContentResult,
      },
      { status: subtopicDetailSuccess ? 200 : 500 } // Reflect overall success in status
    );
  } catch (error: any) {
    console.error("API Route Global Error (get-subtopic-details):", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Internal server error during subtopic detail generation.",
      },
      { status: 500 }
    );
  }
}
