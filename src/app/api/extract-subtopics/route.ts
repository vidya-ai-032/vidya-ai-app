// src/app/api/extract-subtopics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "../../../lib/firebase/admin";
import * as admin from "firebase-admin";
import mammoth from "mammoth";
import { extractText } from "unpdf";

/**
 * API route to extract subtopics from a document using the Gemini API.
 * This route fetches the user's Gemini API key from Firestore (for BYOK)
 * and then sends the document content for subtopic extraction.
 *
 * It's structured as an Edge Function compatible route.
 * This route focuses specifically on generating structured subtopics.
 */
export async function POST(req: NextRequest) {
  let requestBody;

  try {
    requestBody = await req.json();
    const {
      documentUrl,
      documentId,
      userId,
      fileName,
      fileType,
      studentLevel,
    } = requestBody;

    // Basic validation for required fields
    if (
      !documentUrl ||
      !documentId ||
      !userId ||
      !fileName ||
      !fileType ||
      !studentLevel
    ) {
      return NextResponse.json(
        { error: "Missing required fields for subtopic extraction." },
        { status: 400 }
      );
    }

    // 1. Fetch the user's Gemini API Key from Firestore using ADMIN SDK
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        {
          error:
            "User profile not found. Please ensure you are logged in and your profile exists.",
        },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const geminiApiKey = userData?.geminiApiKey;

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Key not found for user. Please set it in your settings to use this feature.",
        },
        { status: 401 }
      );
    }

    // Initialize Gemini model with the user's API key
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const textModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
    });

    let documentTextContent = "";

    // 2. Fetch and extract document content from Firebase Storage
    try {
      console.log(
        `Attempting to fetch document from Storage for subtopic extraction: ${fileName}`
      );

      const bucket = admin.storage().bucket();
      const url = new URL(documentUrl);
      const filePath = decodeURIComponent(
        url.pathname.split("/o/")[1].split("?")[0]
      );
      const [buffer] = await bucket.file(filePath).download();

      console.log(
        `Document buffer created with size: ${buffer.byteLength} bytes.`
      );
      console.log(`Attempting to extract text from file type: ${fileType}`);

      if (fileType === "application/pdf") {
        const uint8Array = new Uint8Array(buffer);
        const unpdfResult = await extractText(uint8Array);
        documentTextContent = unpdfResult.text.join("\n");
      } else if (
        fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer: buffer });
        documentTextContent = result.value;
      } else if (fileType === "text/plain") {
        documentTextContent = buffer.toString("utf8");
      } else {
        documentTextContent = `Unable to extract text from this file type: ${fileType}.`;
        console.warn(
          `Unsupported file type for text extraction for subtopics: ${fileType}`
        );
      }

      // Truncate document text content to prevent hitting Gemini token limits
      const maxTextLength = 10000; // Keep consistent with analyze-document route
      if (documentTextContent.length > maxTextLength) {
        documentTextContent =
          documentTextContent.substring(0, maxTextLength) +
          "\n... [Document content truncated for subtopic extraction]";
      }
    } catch (contentError: any) {
      console.error(
        "Error fetching or extracting document content for subtopics:",
        contentError
      );
      return NextResponse.json(
        {
          error: `Failed to fetch or extract content for subtopic extraction: ${contentError.message}`,
        },
        { status: 500 }
      );
    }

    // 3. Define the Subtopic Extraction Prompt
    const subtopicPrompt = `You are an expert curriculum designer. Extract and organize subtopics from educational content into a structured learning hierarchy. Focus exclusively on the academic or core subject matter of the document. **Ignore and filter out any promotional content, advertisements, or information unrelated to the main educational topic (e.g., course schemes, institution details, personal endorsements).**

SOURCE DOCUMENT: ${documentTextContent}
ACADEMIC LEVEL: ${studentLevel}

TASK: Create a comprehensive and elaborate subtopic breakdown with proper hierarchical structure, including key concepts and specific details as outlined below.

OUTPUT STRUCTURE:
# MAIN TOPIC: ${
      fileName.split(".").slice(0, -1).join(".") || "Document Content"
    }

## I. [Primary Subtopic 1]
    A. [Key Concept 1]
      1. [Specific Detail/Example]
      2. [Specific Detail/Example]
    B. [Key Concept 2]
      1. [Specific Detail/Example]

## II. [Primary Subtopic 2]
    [Continue pattern...]

## III. [Primary Subtopic 3]
    [Continue pattern...]

REQUIREMENTS:
- 3-6 primary subtopics maximum
- 2-4 key concepts per primary subtopic
- 1-3 specific details per key concept
- Use parallel structure throughout
- Ensure logical progression of complexity
- Include page references when applicable

QUALITY CHECKS:
- Each subtopic should be teachable in 10-15 minutes
- Concepts should build upon previous knowledge
- Details should include concrete examples from text
`;

    console.log(
      `Sending subtopic extraction request to Gemini for document: ${fileName}`
    );

    let extractedSubtopics = "";
    try {
      const result = await textModel.generateContent(subtopicPrompt);
      extractedSubtopics = result.response.text();
      console.log(`Gemini subtopic extraction complete for ${fileName}`);
    } catch (geminiError: any) {
      console.error(
        "Error during Gemini API call for subtopic extraction:",
        geminiError
      );
      extractedSubtopics = `Failed to extract subtopics: ${
        geminiError.message || "Unknown API error."
      }`;
      return NextResponse.json({ error: extractedSubtopics }, { status: 500 });
    }

    // Return the extracted subtopics to the frontend
    return NextResponse.json(
      {
        message: "Subtopics extracted successfully!",
        subtopics: extractedSubtopics,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API Route Global Error (subtopic extraction):", error);
    return NextResponse.json(
      {
        error:
          error.message || "Internal server error during subtopic extraction.",
      },
      { status: 500 }
    );
  }
}
