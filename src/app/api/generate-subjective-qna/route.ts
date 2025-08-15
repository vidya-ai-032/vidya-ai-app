// src/app/api/generate-subjective-qna/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "../../../lib/firebase/admin";
import * as admin from "firebase-admin";
import mammoth from "mammoth";
import { extractText } from "unpdf";

/**
 * API route to generate subjective questions from a document using the Gemini API.
 * This route fetches the user's Gemini API key from Firestore (for BYOK)
 * and then sends the document content for subjective question generation.
 *
 * It's structured as an Edge Function compatible route.
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
        { error: "Missing required fields for subjective Q&A generation." },
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
        `Attempting to fetch document from Storage for subjective Q&A generation: ${fileName}`
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
          `Unsupported file type for text extraction for subjective Q&A: ${fileType}`
        );
      }

      // Truncate document text content to prevent hitting Gemini token limits
      const maxTextLength = 10000; // Keep consistent with other routes
      if (documentTextContent.length > maxTextLength) {
        documentTextContent =
          documentTextContent.substring(0, maxTextLength) +
          "\n... [Document content truncated for subjective Q&A generation]";
      }
    } catch (contentError: any) {
      console.error(
        "Error fetching or extracting document content for subjective Q&A generation:",
        contentError
      );
      return NextResponse.json(
        {
          error: `Failed to fetch or extract content for subjective Q&A generation: ${contentError.message}`,
        },
        { status: 500 }
      );
    }

    // 3. Define the Subjective Q&A Generation Prompt
    const qnaPrompt = `You are a master educator creating thought-provoking questions that inspire critical thinking and deep learning. Focus exclusively on the academic or core subject matter of the document. **Ignore and filter out any promotional content, advertisements, or information unrelated to the main educational topic (e.g., course schemes, institution details, personal endorsements).**

SOURCE CONTENT: ${documentTextContent}
STUDENT LEVEL: ${studentLevel}
NUMBER OF QUESTIONS: 5 - 20 (depending on the length of the document)

CREATE questions that:
1. Encourage analysis and synthesis
2. Connect concepts to real-world applications
3. Prompt personal reflection and opinion
4. Challenge assumptions and promote debate
5. Require evidence-based reasoning

QUESTION TYPES TO INCLUDE:
- "What if" scenarios (25%)
- Comparison and contrast (25%)
- Problem-solving applications (25%)
- Ethical/philosophical implications (25%)

OUTPUT FORMAT:
\`\`\`json
{
  "questions": [
    {
      "question": "thought_provoking_question_text",
      "type": "scenario/comparison/application/ethical",
      "complexity_level": "medium/high",
      "suggested_response_length": "150-300 words",
      "key_concepts": ["concept1", "concept2"],
      "evaluation_criteria": [
        "understanding of core concepts",
        "use of evidence from text",
        "critical thinking demonstrated",
        "real-world connections made"
      ]
    }
  ]
}
\`\`\`

QUESTION QUALITY STANDARDS:
- Open-ended with multiple valid approaches
- Require integration of multiple concepts
- Encourage creative and original thinking
- Cannot be answered with simple yes/no
- Promote deeper understanding over memorization

Provide ONLY the JSON object. Do not include any other text or formatting outside the JSON.
`;

    console.log(
      `Sending subjective Q&A generation request to Gemini for document: ${fileName}`
    );

    let qnaResultText = "";
    let subjectiveQuestions: any = null;
    let qnaSuccess = false;

    try {
      const result = await textModel.generateContent({
        contents: [{ role: "user", parts: [{ text: qnaPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });
      qnaResultText = result.response.text();
      subjectiveQuestions = JSON.parse(qnaResultText);
      qnaSuccess = true;
      console.log(`Gemini subjective Q&A generation complete for ${fileName}`);
    } catch (geminiError: any) {
      console.error(
        "Error during Gemini API call for subjective Q&A generation:",
        geminiError
      );
      qnaResultText = `Failed to generate subjective questions: ${
        geminiError.message || "Unknown API error."
      }`;
      // Set to empty array on error to avoid parsing issues
      subjectiveQuestions = { questions: [] };
    }

    // Return the generated subjective questions to the frontend
    return NextResponse.json(
      {
        message: qnaSuccess
          ? "Subjective questions generated successfully!"
          : "Failed to generate subjective questions.",
        subjectiveQuestions: subjectiveQuestions,
        rawResponse: qnaResultText, // Include raw response for debugging
      },
      { status: qnaSuccess ? 200 : 500 }
    );
  } catch (error: any) {
    console.error("API Route Global Error (subjective Q&A generation):", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Internal server error during subjective Q&A generation.",
      },
      { status: 500 }
    );
  }
}
