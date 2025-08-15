// src/app/api/generate-quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "../../../lib/firebase/admin";
import * as admin from "firebase-admin";
import mammoth from "mammoth";
import { extractText } from "unpdf";

/**
 * API route to generate quiz questions from a document using the Gemini API.
 * This route fetches the user's Gemini API key from Firestore (for BYOK)
 * and then sends the document content for quiz generation.
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
        { error: "Missing required fields for quiz generation." },
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
        `Attempting to fetch document from Storage for quiz generation: ${fileName}`
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
          `Unsupported file type for text extraction for quiz: ${fileType}`
        );
      }

      // Truncate document text content to prevent hitting Gemini token limits
      const maxTextLength = 10000; // Keep consistent with other routes
      if (documentTextContent.length > maxTextLength) {
        documentTextContent =
          documentTextContent.substring(0, maxTextLength) +
          "\n... [Document content truncated for quiz generation]";
      }
    } catch (contentError: any) {
      console.error(
        "Error fetching or extracting document content for quiz generation:",
        contentError
      );
      return NextResponse.json(
        {
          error: `Failed to fetch or extract content for quiz generation: ${contentError.message}`,
        },
        { status: 500 }
      );
    }

    // 3. Define the Quiz Generation Prompt
    const quizPrompt = `You are an expert assessment creator specializing in educational quizzes. Generate comprehensive multiple-choice questions that test understanding, not just memorization. Focus exclusively on the academic or core subject matter of the document. **Ignore and filter out any promotional content, advertisements, or information unrelated to the main educational topic (e.g., course schemes, institution details, personal endorsements).**

SOURCE MATERIAL: ${documentTextContent}
STUDENT LEVEL: ${studentLevel}
QUIZ LENGTH: 10

QUESTION DISTRIBUTION:
- 40% Knowledge/Recall questions
- 35% Comprehension/Application questions
- 25% Analysis/Synthesis questions

FOR EACH QUESTION:
1. Write clear, specific question stem
2. Provide 4 answer choices (A, B, C, D)
3. Mark correct answer
4. Include detailed explanations for ALL choices
5. Add difficulty rating (Easy/Medium/Hard)
6. Include TRUE/FALSE type questions if applicable and relevant to the content.

OUTPUT FORMAT:
\`\`\`json
{
  "question_1": {
    "question": "clear_question_text",
    "options": {
      "A": "option_text",
      "B": "option_text",
      "C": "option_text",
      "D": "option_text"
    },
    "correct_answer": "A",
    "explanations": {
      "A": "why_this_is_correct",
      "B": "why_this_is_wrong_and_learning_point",
      "C": "why_this_is_wrong_and_learning_point",
      "D": "why_this_is_wrong_and_learning_point"
    },
    "difficulty": "Medium",
    "concept_tested": "specific_learning_objective"
  }
}
\`\`\`

QUALITY STANDARDS:
- Distractors should be plausible but clearly wrong
- Avoid "all of the above" or "none of the above"
- Questions should require understanding, not just recall
- Use scenarios and applications when possible
- Ensure cultural neutrality and accessibility

Provide ONLY the JSON object. Do not include any other text or formatting outside the JSON.
`;

    console.log(
      `Sending quiz generation request to Gemini for document: ${fileName}`
    );

    let quizResultText = "";
    let quizQuestions: any = null;
    let quizSuccess = false;

    try {
      const result = await textModel.generateContent({
        contents: [{ role: "user", parts: [{ text: quizPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });
      quizResultText = result.response.text();
      quizQuestions = JSON.parse(quizResultText);
      quizSuccess = true;
      console.log(`Gemini quiz generation complete for ${fileName}`);
    } catch (geminiError: any) {
      console.error(
        "Error during Gemini API call for quiz generation:",
        geminiError
      );
      quizResultText = `Failed to generate quiz: ${
        geminiError.message || "Unknown API error."
      }`;
      // Set to empty object on error to avoid parsing issues
      quizQuestions = {};
    }

    // Return the generated quiz to the frontend
    return NextResponse.json(
      {
        message: quizSuccess
          ? "Quiz generated successfully!"
          : "Failed to generate quiz.",
        quizQuestions: quizQuestions,
        rawResponse: quizResultText, // Include raw response for debugging
      },
      { status: quizSuccess ? 200 : 500 }
    );
  } catch (error: any) {
    console.error("API Route Global Error (quiz generation):", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error during quiz generation.",
      },
      { status: 500 }
    );
  }
}
