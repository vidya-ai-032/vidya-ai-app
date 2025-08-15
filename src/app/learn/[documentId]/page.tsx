// src/app/learn/[documentId]/page.tsx
"use client"; // This directive marks it as a client component

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useRef } from "react"; // Import useRef
import { onAuthStateChanged, User as FirebaseAuthUser } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore"; // Import addDoc, serverTimestamp, query, orderBy
import { auth, db } from "../../../lib/firebase/firebase";
import Link from "next/link";
import SubtopicDetailModal from "../../../components/SubtopicDetailModal";
import QuizHistoryModal from "../../../components/QuizHistoryModal"; // Import the new QuizHistoryModal

// Define interfaces for data
interface LibraryDocument {
  id: string;
  uid: string;
  fileName: string;
  fileType: string;
  downloadURL: string;
  status: "uploaded" | "processing" | "analyzed" | "failed";
  documentName?: string;
  class?: string;
  subject?: string;
  topic?: string;
  chapter?: string;
  dateCreated?: string;
  analysisResult?: string; // Stores the comprehensive summary text from initial analysis
  extractedSubtopics?: string; // Stores extracted subtopics
  quizQuestions?: string; // Stores quiz questions JSON string
  subjectiveQuestions?: string; // Stores subjective questions JSON string
  analysisError?: string;
}

interface FirestoreUser {
  uid: string;
  email: string;
  name?: string;
  image?: string;
  role: "student" | "parent" | "tutor"; // Default role
  schoolBoard?: string;
  grade?: string;
  language?: string;
  geminiApiKey?: string; // For BYOK (Bring Your Own Key) feature
}

// Define interfaces for Quiz and Subjective Q&A data (parsed from analysisResult)
interface QuizQuestion {
  id: string; // Add id to uniquely identify quiz questions (e.g., "question_1")
  question: string;
  options: { [key: string]: string };
  correct_answer: string;
  explanations: { [key: string]: string };
  difficulty: string;
  concept_tested: string;
}

interface SubjectiveQuestion {
  question: string;
  type: string;
  complexity_level: string;
  suggested_response_length: string;
  key_concepts: string[];
  evaluation_criteria: string[]; // This can be undefined if data is malformed
}

// Interface for Quiz Attempt History
interface QuizAttempt {
  id: string; // Firestore document ID
  score: number;
  totalQuestions: number;
  timestamp: any; // Firestore Timestamp
  attemptedQuestions: { [key: string]: string }; // Store question_id: selected_answer
  correctAnswers: { [key: string]: string }; // Store question_id: correct_answer
}

/**
 * LearningPage component displays the detailed learning content for a specific document.
 * It fetches the document's analysis and subtopics, and allows users to click on
 * subtopics to view detailed explanations in a modal. It also provides re-analysis
 * functionality for different content types, and an.
 */
const LearningPage: React.FC = () => {
  const params = useParams();
  const documentId = params.documentId as string;
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(
    null
  );
  const [libraryDocument, setLibraryDocument] =
    useState<LibraryDocument | null>(null); // Renamed 'document' to 'libraryDocument'
  const [loading, setLoading] = useState(true); // Changed initial value to true
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "documentAnalysis"
    | "extractedSubtopics"
    | "aiTutor"
    | "generateQuiz"
    | "subjectiveQnA"
  >("documentAnalysis");

  // Content states for specific features, initially null
  const [documentSummary, setDocumentSummary] = useState<string | null>(null);
  const [extractedSubtopicsContent, setExtractedSubtopicsContent] = useState<
    string | null
  >(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [subjectiveQuestions, setSubjectiveQuestions] = useState<
    SubjectiveQuestion[]
  >([]);

  // Quiz Attempt States
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: string;
  }>({}); // { "question_1": "A", "question_2": "C" }
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuizScore, setCurrentQuizScore] = useState<number | null>(null); // Score for current attempt

  // Quiz History States
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [isQuizHistoryModalOpen, setIsQuizHistoryModalOpen] = useState(false);

  // Loading and error states for each feature
  const [isDocumentAnalysisLoading, setIsDocumentAnalysisLoading] =
    useState(false);
  const [documentAnalysisError, setDocumentAnalysisError] = useState<
    string | null
  >(null);
  const [isSubtopicsLoading, setIsSubtopicsLoading] = useState(false);
  const [subtopicsError, setSubtopicsError] = useState<string | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isQnALoading, setIsQnALoading] = useState(false);
  const [qnaError, setQnaError] = useState<string | null>(null);

  // States for the SubtopicDetailModal
  const [isSubtopicDetailModalOpen, setIsSubtopicDetailModalOpen] =
    useState(false);
  const [selectedSubtopicTitle, setSelectedSubtopicTitle] = useState("");
  const [detailedDocumentContent, setDetailedDocumentContent] = useState("");
  const [detailedResearchedContent, setDetailedResearchedContent] =
    useState("");
  const [isSubtopicDetailLoading, setIsSubtopicDetailLoading] = useState(false);
  const [subtopicDetailError, setSubtopicDetailError] = useState<string | null>(
    null
  );

  // Pagination states for main content
  const itemsPerPageSubtopics = 10;
  const [currentPageSubtopics, setCurrentPageSubtopics] = useState(1);
  const itemsPerPageQuiz = 10;
  const [currentPageQuiz, setCurrentPageQuiz] = useState(1);
  const itemsPerPageQnA = 5;
  const [currentPageQnA, setCurrentPageQnA] = useState(1);

  // Confirmation Modal States
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(
    null
  );

  // Ref for the Quiz section to manage keyboard events
  const quizSectionRef = useRef<HTMLDivElement>(null);

  // Authenticate and fetch user/document
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setFirestoreUser(userSnap.data() as FirestoreUser);
        } else {
          setError("User profile not found in Firestore.");
        }

        const docRef = doc(db, `users/${user.uid}/documents`, documentId);
        const unsubscribeDoc = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const docData = {
                id: docSnap.id,
                ...docSnap.data(),
              } as LibraryDocument;
              setLibraryDocument(docData); // Use setLibraryDocument
              setLoading(false);

              // Populate initial content from Firestore if available
              if (docData.analysisResult)
                setDocumentSummary(docData.analysisResult);
              if (docData.extractedSubtopics)
                setExtractedSubtopicsContent(docData.extractedSubtopics);

              // Parse quiz and subjective questions
              if (docData.quizQuestions) {
                try {
                  // Parse quizQuestions and add the 'id' field
                  const rawQuizQuestions = JSON.parse(docData.quizQuestions);
                  const parsedQuiz: QuizQuestion[] = Object.entries(
                    rawQuizQuestions
                  ).map(([key, value]: [string, any]) => ({
                    id: key, // Use the original key as the id
                    question: value.question,
                    options: value.options,
                    correct_answer: value.correct_answer,
                    explanations: value.explanations,
                    difficulty: value.difficulty,
                    concept_tested: value.concept_tested,
                  }));
                  setQuizQuestions(parsedQuiz);
                } catch (e) {
                  console.error("Error parsing stored quiz questions:", e);
                  setQuizQuestions([]);
                }
              } else {
                setQuizQuestions([]);
              }

              if (docData.subjectiveQuestions) {
                try {
                  setSubjectiveQuestions(
                    JSON.parse(docData.subjectiveQuestions).questions || []
                  );
                } catch (e) {
                  console.error(
                    "Error parsing stored subjective questions:",
                    e
                  );
                  setSubjectiveQuestions([]);
                }
              } else {
                setSubjectiveQuestions([]);
              }
            } else {
              setError("Document not found in your library.");
              setLoading(false);
            }
          },
          (dbError) => {
            console.error("Error fetching document from Firestore:", dbError);
            setError("Failed to load document details.");
            setLoading(false);
          }
        );

        // Setup real-time listener for quiz attempts history
        const quizHistoryRef = collection(
          db,
          `users/${user.uid}/documents/${documentId}/quizAttempts`
        );
        const q = query(quizHistoryRef, orderBy("timestamp", "desc")); // Order by newest first
        const unsubscribeQuizHistory = onSnapshot(
          q,
          (snapshot) => {
            const history: QuizAttempt[] = [];
            snapshot.forEach((docSnap) => {
              history.push({
                id: docSnap.id,
                ...docSnap.data(),
              } as QuizAttempt);
            });
            setQuizHistory(history);
          },
          (err) => {
            console.error("Error fetching quiz history:", err);
          }
        );

        return () => {
          unsubscribeDoc(); // Cleanup document listener
          unsubscribeQuizHistory(); // Cleanup quiz history listener
        };
      } else {
        router.push("/");
      }
    });

    return () => unsubscribeAuth();
  }, [documentId, router]);

  // Common check for API key
  const checkApiKey = useCallback(() => {
    if (!firestoreUser?.geminiApiKey) {
      alert(
        "Please set your Gemini API Key in the settings before using AI features."
      );
      router.push("/settings");
      return false;
    }
    return true;
  }, [firestoreUser, router]);

  // Function to handle regeneration with confirmation
  const handleRegenerate = useCallback(
    (action: () => Promise<void>, message: string) => {
      setIsConfirmationModalOpen(true);
      setConfirmationMessage(message);
      setOnConfirmAction(() => action); // Wrap in a function to delay execution
    },
    []
  );

  const confirmAction = useCallback(async () => {
    setIsConfirmationModalOpen(false);
    if (onConfirmAction) {
      await onConfirmAction();
    }
  }, [onConfirmAction]);

  const cancelConfirmation = useCallback(() => {
    setIsConfirmationModalOpen(false);
    setOnConfirmAction(null);
  }, []);

  // --- API Fetch Functions (memoized with useCallback) ---

  const fetchDocumentAnalysis = useCallback(async () => {
    if (!currentUser || !libraryDocument || !checkApiKey()) return; // Use libraryDocument

    setIsDocumentAnalysisLoading(true);
    setDocumentAnalysisError(null);
    setDocumentSummary(null); // Clear previous summary

    try {
      const response = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: libraryDocument.id, // Use libraryDocument
          userId: currentUser.uid,
          fileName: libraryDocument.fileName, // Use libraryDocument
          fileType: libraryDocument.fileType, // Use libraryDocument
          documentUrl: libraryDocument.downloadURL, // Use libraryDocument
          studentLevel: firestoreUser?.role || "student",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setDocumentAnalysisError(result.error || "Failed to analyze document.");
        console.error("Document analysis API Error:", result.error);
        await updateDoc(
          doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
          {
            // Use libraryDocument
            analysisResult: null,
            analysisError: result.error || "Failed to analyze document.",
            status: "failed",
          }
        );
        return;
      }
      setDocumentSummary(result.analysis);
      await updateDoc(
        doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
        {
          // Use libraryDocument
          analysisResult: result.analysis,
          analysisError: null,
          status: "analyzed",
        }
      );
    } catch (apiError: any) {
      console.error("Network or unexpected document analysis error:", apiError);
      setDocumentAnalysisError(
        apiError.message ||
          "An unexpected error occurred during document analysis."
      );
      await updateDoc(
        doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
        {
          // Use libraryDocument
          analysisResult: null,
          analysisError:
            apiError.message ||
            "An unexpected error occurred during document analysis.",
          status: "failed",
        }
      );
    } finally {
      setIsDocumentAnalysisLoading(false);
    }
  }, [currentUser, libraryDocument, firestoreUser, checkApiKey]); // Depend on libraryDocument

  const fetchExtractedSubtopics = useCallback(async () => {
    if (!currentUser || !libraryDocument || !checkApiKey()) return; // Use libraryDocument

    setIsSubtopicsLoading(true);
    setSubtopicsError(null);
    setExtractedSubtopicsContent(null); // Clear previous subtopics

    try {
      const response = await fetch("/api/extract-subtopics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: libraryDocument.id, // Use libraryDocument
          userId: currentUser.uid,
          fileName: libraryDocument.fileName, // Use libraryDocument
          fileType: libraryDocument.fileType, // Use libraryDocument
          documentUrl: libraryDocument.downloadURL, // Use libraryDocument
          studentLevel: firestoreUser?.role || "student",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubtopicsError(result.error || "Failed to extract subtopics.");
        console.error("Subtopic extraction API Error:", result.error);
        await updateDoc(
          doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
          {
            // Use libraryDocument
            extractedSubtopics: null,
          }
        );
        return;
      }
      setExtractedSubtopicsContent(result.subtopics);
      await updateDoc(
        doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
        {
          // Use libraryDocument
          extractedSubtopics: result.subtopics,
        }
      );
    } catch (apiError: any) {
      console.error(
        "Network or unexpected subtopic extraction error:",
        apiError
      );
      setSubtopicsError(
        apiError.message ||
          "An unexpected error occurred during subtopic extraction."
      );
      await updateDoc(
        doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
        {
          // Use libraryDocument
          extractedSubtopics: null,
        }
      );
    } finally {
      setIsSubtopicsLoading(false);
    }
  }, [currentUser, libraryDocument, firestoreUser, checkApiKey]); // Depend on libraryDocument

  const fetchQuizQuestions = useCallback(async () => {
    if (!currentUser || !libraryDocument || !checkApiKey()) return; // Use libraryDocument

    setIsQuizLoading(true);
    setQuizError(null);
    setQuizQuestions([]); // Clear previous quiz
    setSelectedAnswers({}); // Clear selected answers for new quiz
    setQuizSubmitted(false); // Reset quiz submission status
    setCurrentQuizScore(null); // Reset current score

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: libraryDocument.id, // Use libraryDocument
          userId: currentUser.uid,
          fileName: libraryDocument.fileName, // Use libraryDocument
          fileType: libraryDocument.fileType, // Use libraryDocument
          documentUrl: libraryDocument.downloadURL, // Use libraryDocument
          studentLevel: firestoreUser?.role || "student",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setQuizError(result.error || "Failed to generate quiz.");
        console.error("Quiz generation API Error:", result.error);
        await updateDoc(
          doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
          {
            // Use libraryDocument
            quizQuestions: null,
          }
        );
        return;
      }
      // Parse quizQuestions and add the 'id' field
      const rawQuizQuestions = result.quizQuestions;
      const parsedQuiz: QuizQuestion[] = Object.entries(rawQuizQuestions).map(
        ([key, value]: [string, any]) => ({
          id: key, // Use the original key as the id (e.g., "question_1")
          question: value.question,
          options: value.options,
          correct_answer: value.correct_answer,
          explanations: value.explanations,
          difficulty: value.difficulty,
          concept_tested: value.concept_tested,
        })
      );
      setQuizQuestions(parsedQuiz);
      await updateDoc(
        doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
        {
          // Use libraryDocument
          quizQuestions: JSON.stringify(result.quizQuestions), // Store as JSON string
        }
      );
    } catch (apiError: any) {
      console.error("Network or unexpected quiz generation error:", apiError);
      setQuizError(
        apiError.message ||
          "An unexpected error occurred during quiz generation."
      );
      await updateDoc(
        doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
        {
          // Use libraryDocument
          quizQuestions: null,
        }
      );
    } finally {
      setIsQuizLoading(false);
    }
  }, [currentUser, libraryDocument, firestoreUser, checkApiKey]); // Depend on libraryDocument

  const fetchSubjectiveQuestions = useCallback(async () => {
    if (!currentUser || !libraryDocument || !checkApiKey()) return; // Use libraryDocument

    setIsQnALoading(true);
    setQnaError(null);
    setSubjectiveQuestions([]); // Clear previous Q&A

    try {
      const response = await fetch("/api/generate-subjective-qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: libraryDocument.id, // Use libraryDocument
          userId: currentUser.uid,
          fileName: libraryDocument.fileName, // Use libraryDocument
          fileType: libraryDocument.fileType, // Use libraryDocument
          documentUrl: libraryDocument.downloadURL, // Use libraryDocument
          studentLevel: firestoreUser?.role || "student",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setQnaError(result.error || "Failed to generate subjective questions.");
        console.error("Subjective Q&A generation API Error:", result.error);
        await updateDoc(
          doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
          {
            // Use libraryDocument
            subjectiveQuestions: null,
          }
        );
        return;
      }
      const parsedQnA = result.subjectiveQuestions.questions || [];
      setSubjectiveQuestions(parsedQnA);
      await updateDoc(
        doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
        {
          // Use libraryDocument
          subjectiveQuestions: JSON.stringify(result.subjectiveQuestions), // Store as JSON string
        }
      );
    } catch (apiError: any) {
      console.error(
        "Network or unexpected subjective Q&A generation error:",
        apiError
      );
      setQnaError(
        apiError.message ||
          "An unexpected error occurred during subjective Q&A generation."
      );
      await updateDoc(
        doc(db, `users/${currentUser.uid}/documents`, libraryDocument.id),
        {
          // Use libraryDocument
          subjectiveQuestions: null,
        }
      );
    } finally {
      setIsQnALoading(false);
    }
  }, [currentUser, libraryDocument, firestoreUser, checkApiKey]); // Depend on libraryDocument

  // Effect to trigger content fetch on tab change if content is empty
  useEffect(() => {
    if (!libraryDocument || !currentUser) return; // Use libraryDocument

    // Function to get fresh content if not already loaded or if a specific feature button is clicked
    const loadContent = async () => {
      // For Document Analysis (Summary)
      if (
        activeTab === "documentAnalysis" &&
        !documentSummary &&
        !isDocumentAnalysisLoading &&
        !documentAnalysisError
      ) {
        // Fetch if not already analyzed/loaded in snapshot
        if (
          !libraryDocument?.analysisResult &&
          libraryDocument.status === "analyzed"
        ) {
          // Use libraryDocument
          await fetchDocumentAnalysis(); // Only call API if no result AND document was previously analyzed
        } else if (libraryDocument?.analysisResult) {
          // Use libraryDocument
          setDocumentSummary(libraryDocument.analysisResult); // Use libraryDocument
        }
      }
      // For Extracted Subtopics
      else if (
        activeTab === "extractedSubtopics" &&
        !extractedSubtopicsContent &&
        !isSubtopicsLoading &&
        !subtopicsError
      ) {
        if (
          !libraryDocument?.extractedSubtopics &&
          libraryDocument.status === "analyzed"
        ) {
          // Use libraryDocument
          await fetchExtractedSubtopics();
        } else if (libraryDocument?.extractedSubtopics) {
          // Use libraryDocument
          setExtractedSubtopicsContent(libraryDocument.extractedSubtopics); // Use libraryDocument
        }
      }
      // For Quiz
      else if (
        activeTab === "generateQuiz" &&
        quizQuestions.length === 0 &&
        !isQuizLoading &&
        !quizError
      ) {
        if (
          !libraryDocument?.quizQuestions &&
          libraryDocument.status === "analyzed"
        ) {
          // Use libraryDocument
          await fetchQuizQuestions();
        } else if (libraryDocument?.quizQuestions) {
          // Use libraryDocument
          try {
            // Same parsing logic as in initial useEffect to ensure 'id' is present
            const rawQuizQuestions = JSON.parse(libraryDocument.quizQuestions); // Use libraryDocument
            const parsedQuiz: QuizQuestion[] = Object.entries(
              rawQuizQuestions
            ).map(([key, value]: [string, any]) => ({
              id: key,
              question: value.question,
              options: value.options,
              correct_answer: value.correct_answer,
              explanations: value.explanations,
              difficulty: value.difficulty,
              concept_tested: value.concept_tested,
            }));
            setQuizQuestions(parsedQuiz);
          } catch (e) {
            console.error(
              "Error parsing stored quiz questions on tab switch:",
              e
            );
            setQuizQuestions([]);
          }
        }
      }
      // For Subjective Q&A
      else if (
        activeTab === "subjectiveQnA" &&
        subjectiveQuestions.length === 0 &&
        !isQnALoading &&
        !qnaError
      ) {
        if (
          !libraryDocument?.subjectiveQuestions &&
          libraryDocument.status === "analyzed"
        ) {
          // Use libraryDocument
          await fetchSubjectiveQuestions();
        } else if (libraryDocument?.subjectiveQuestions) {
          // Use libraryDocument
          try {
            setSubjectiveQuestions(
              JSON.parse(libraryDocument.subjectiveQuestions).questions || []
            ); // Use libraryDocument
          } catch (e) {
            console.error(
              "Error parsing stored subjective questions on tab switch:",
              e
            );
            setSubjectiveQuestions([]);
          }
        }
      }
    };

    loadContent();
  }, [
    activeTab,
    libraryDocument,
    currentUser,
    documentSummary,
    extractedSubtopicsContent,
    quizQuestions.length,
    subjectiveQuestions.length,
    isDocumentAnalysisLoading,
    isSubtopicsLoading,
    isQuizLoading,
    isQnALoading,
    documentAnalysisError,
    subtopicsError,
    quizError,
    qnaError,
    fetchDocumentAnalysis,
    fetchExtractedSubtopics,
    fetchQuizQuestions,
    fetchSubjectiveQuestions,
  ]);

  // Handle click on a subtopic to open the detail modal
  const handleSubtopicClick = async (subtopicText: string) => {
    if (
      !currentUser ||
      !libraryDocument ||
      !firestoreUser ||
      isSubtopicDetailLoading
    )
      return; // Use libraryDocument

    setSelectedSubtopicTitle(subtopicText);
    setDetailedDocumentContent("");
    setDetailedResearchedContent("");
    setSubtopicDetailError(null);
    setIsSubtopicDetailLoading(true);
    setIsSubtopicDetailModalOpen(true); // Open modal immediately with loading state

    try {
      const response = await fetch("/api/get-subtopic-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: libraryDocument.id, // Use libraryDocument
          userId: currentUser.uid,
          subtopicQuery: subtopicText,
          // userRole: firestoreUser.role, // Pass user role if needed for tailoring details
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubtopicDetailError(
          result.error || "Failed to fetch subtopic details."
        );
        console.error("Subtopic detail API Error:", result.error);
        setDetailedDocumentContent("Could not load content from document.");
        setDetailedResearchedContent("Could not load researched content.");
        return;
      }
      setDetailedDocumentContent(result.documentContent);
      setDetailedResearchedContent(result.researchedContent);
    } catch (apiError: any) {
      console.error("Network or unexpected subtopic detail error:", apiError);
      setSubtopicDetailError(
        apiError.message ||
          "An unexpected error occurred while fetching subtopic details."
      );
      setDetailedDocumentContent("Error loading content.");
    } finally {
      setIsSubtopicDetailLoading(false);
    }
  };

  // --- Pagination Logic for Extracted Subtopics ---
  // Moved declarations to be before usage in render and callbacks
  const allSubtopicLines = extractedSubtopicsContent
    ? extractedSubtopicsContent.split("\n").filter((line) => line.trim() !== "")
    : [];
  const totalSubtopicPages = Math.ceil(
    allSubtopicLines.length / itemsPerPageSubtopics
  );
  const indexOfLastSubtopic = currentPageSubtopics * itemsPerPageSubtopics;
  const indexOfFirstSubtopic = indexOfLastSubtopic - itemsPerPageSubtopics;
  const currentSubtopicItems = allSubtopicLines.slice(
    indexOfFirstSubtopic,
    indexOfLastSubtopic
  );

  const paginateSubtopics = (pageNumber: number) =>
    setCurrentPageSubtopics(pageNumber);

  // --- Pagination Logic for Quiz Questions ---
  // Moved declarations to be before usage in render and callbacks
  const totalQuizPages = Math.ceil(quizQuestions.length / itemsPerPageQuiz);
  const indexOfLastQuiz = currentPageQuiz * itemsPerPageQuiz;
  const indexOfFirstQuiz = indexOfLastQuiz - itemsPerPageQuiz;
  const currentQuizQuestions = quizQuestions.slice(
    indexOfFirstQuiz,
    indexOfLastQuiz
  );

  const paginateQuiz = (pageNumber: number) => setCurrentPageQuiz(pageNumber);

  const isQuizReadyToSubmit =
    quizQuestions.length > 0 &&
    Object.keys(selectedAnswers).length === currentQuizQuestions.length;

  // --- Pagination Logic for Subjective Q&A ---
  // Moved declarations to be before usage in render and callbacks
  const totalQnAPages = Math.ceil(subjectiveQuestions.length / itemsPerPageQnA);
  const indexOfLastQnA = currentPageQnA * itemsPerPageQnA;
  const indexOfFirstQnA = indexOfLastQnA - itemsPerPageQnA;
  const currentSubjectiveQuestions = subjectiveQuestions.slice(
    indexOfFirstQnA,
    indexOfLastQnA
  );

  const paginateQnA = (pageNumber: number) => setCurrentPageQnA(pageNumber);

  // --- Quiz Logic ---
  const handleAnswerChange = useCallback(
    (questionId: string, optionKey: string) => {
      if (!quizSubmitted) {
        // Only allow changing answers if quiz is not submitted
        setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
      }
    },
    [quizSubmitted]
  );

  const handleSubmitQuiz = useCallback(async () => {
    if (!currentUser || !libraryDocument || quizQuestions.length === 0) return; // Use libraryDocument

    let score = 0;
    const correctAnswersMap: { [key: string]: string } = {};
    const attemptedQuestionsMap: { [key: string]: string } = {};

    currentQuizQuestions.forEach((q) => {
      // Iterate through currentQuizQuestions which are actual QuizQuestion objects with 'id'
      const questionId = q.id; // Use the actual ID from the QuizQuestion object

      attemptedQuestionsMap[questionId] = selectedAnswers[questionId] || "";
      correctAnswersMap[questionId] = q.correct_answer;

      if (selectedAnswers[questionId] === q.correct_answer) {
        score++;
      }
    });

    setCurrentQuizScore(score);
    setQuizSubmitted(true);

    // Save quiz attempt to Firestore
    try {
      await addDoc(
        collection(
          db,
          `users/${currentUser.uid}/documents/${libraryDocument.id}/quizAttempts`
        ),
        {
          // Use libraryDocument
          score: score,
          totalQuestions: currentQuizQuestions.length, // Total questions attempted in this batch (current page)
          timestamp: serverTimestamp(),
          attemptedQuestions: attemptedQuestionsMap, // Save the user's answers mapped by questionId
          correctAnswers: correctAnswersMap, // Save correct answers for review if needed
        }
      );
      console.log("Quiz attempt saved to Firestore!");
    } catch (e) {
      console.error("Failed to save quiz attempt:", e);
      alert("Failed to save quiz attempt history.");
    }
  }, [
    currentUser,
    libraryDocument,
    quizQuestions,
    selectedAnswers,
    currentQuizQuestions,
  ]); // Depend on libraryDocument and currentQuizQuestions

  const handleRetakeQuiz = useCallback(() => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setCurrentQuizScore(null);
  }, []);
  // --- End Quiz Logic ---

  // Handle keyboard events for the quiz section
  const handleQuizSectionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Check if the key pressed is an arrow key
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        const activeElement = document.activeElement; // Correctly refers to the global document.activeElement
        // Check if activeElement is not null before accessing its properties
        if (activeElement) {
          // Check if the currently focused element is a radio input within THIS quiz section
          const isRadioInputFocusedWithinQuiz =
            activeElement instanceof HTMLInputElement &&
            activeElement.type === "radio" &&
            quizSectionRef.current?.contains(activeElement);

          // If an arrow key is pressed AND the focus is NOT on a radio input within this quiz section,
          // then prevent the default behavior of the arrow key (which might be quiz navigation if focus is 'stolen').
          // This allows the browser's default page scrolling behavior to take effect.
          if (!isRadioInputFocusedWithinQuiz) {
            event.preventDefault(); // Prevent default action on the current element
            // Manually trigger scrolling if preventDefault stops default browser scrolling
            // Note: For document-level scrolling, simply preventing default on a child element
            // might not stop the overall page scroll. This primarily prevents specific element behaviors.
            if (event.key === "ArrowUp") {
              window.scrollBy({ top: -50, behavior: "smooth" });
            } else if (event.key === "ArrowDown") {
              window.scrollBy({ top: 50, behavior: "smooth" });
            }
            // ArrowLeft/ArrowRight typically don't cause page scroll, so no manual scroll needed for them
          }
          // If it IS a radio input focused within the quiz, let its default arrow key behavior happen (navigate options).
        }
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-800 p-8">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="mb-4">{error}</p>
        <Link
          href="/library"
          className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors"
        >
          Go to Library
        </Link>
      </div>
    );
  }

  if (!libraryDocument) {
    // Use libraryDocument
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Document data is missing.</p>
      </div>
    );
  }

  const pageTitle = libraryDocument.documentName || libraryDocument.fileName; // Use libraryDocument

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col">
      {/* Header/Navigation */}
      <header className="w-full bg-white shadow-sm py-4 px-6 flex justify-between items-center rounded-b-xl">
        <div className="flex items-center space-x-2">
          {/* Vidya AI Logo and header redirect to homepage */}
          <Link href="/" className="flex items-center space-x-2">
            <img
              src="https://placehold.co/32x32/667EEA/ffffff?text=V" // Placeholder for Vidya AI Logo
              alt="Vidya AI Logo"
              className="rounded-full"
            />
            <span className="text-xl font-bold text-gray-800">Vidya AI</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {currentUser && (
            <span className="text-gray-700 font-medium hidden sm:inline">
              {currentUser.email}
            </span>
          )}
          <Link
            href="/library"
            className="px-4 py-2 bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-600 transition-colors"
          >
            Back to Library
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-10">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col md:flex-row gap-8">
          {/* Left Sidebar - Learning Features */}
          <aside className="w-full md:w-64 bg-gray-50 rounded-lg p-6 shadow-inner flex flex-col space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Learning Features
            </h3>

            {/* Feature Buttons - Reordered */}
            <button
              onClick={() => {
                handleRegenerate(
                  fetchDocumentAnalysis,
                  "Regenerating the Document Analysis will clear any existing summary for this document. Continue?"
                );
                setActiveTab("documentAnalysis");
              }}
              className={`w-full py-3 px-4 rounded-lg text-lg font-medium text-left transition-colors duration-200 ${
                activeTab === "documentAnalysis"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50"
              }`}
            >
              Document Analysis 🧠
            </button>
            <button
              onClick={() => {
                handleRegenerate(
                  fetchExtractedSubtopics,
                  "Regenerating Extracted Subtopics will clear the current subtopic list for this document. Continue?"
                );
                setActiveTab("extractedSubtopics");
              }}
              className={`w-full py-3 px-4 rounded-lg text-lg font-medium text-left transition-colors duration-200 ${
                activeTab === "extractedSubtopics"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50"
              }`}
            >
              Extract Subtopics 📝
            </button>
            <button
              onClick={() => setActiveTab("aiTutor")} // No regeneration needed yet for AI Tutor
              className={`w-full py-3 px-4 rounded-lg text-lg font-medium text-left transition-colors duration-200 ${
                activeTab === "aiTutor"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50"
              }`}
            >
              Teach me this (AI Tutor) 🧑‍🏫
            </button>
            <button
              onClick={() => {
                handleRegenerate(
                  fetchQuizQuestions,
                  "Regenerating the Quiz will clear all current quiz questions for this document. Continue?"
                );
                setActiveTab("generateQuiz");
              }}
              className={`w-full py-3 px-4 rounded-lg text-lg font-medium text-left transition-colors duration-200 ${
                activeTab === "generateQuiz"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50"
              }`}
            >
              Generate Quiz 📚
            </button>
            <button
              onClick={() => {
                handleRegenerate(
                  fetchSubjectiveQuestions,
                  "Regenerating Subjective Q&A will clear all current questions for this document. Continue?"
                );
                setActiveTab("subjectiveQnA");
              }}
              className={`w-full py-3 px-4 rounded-lg text-lg font-medium text-left transition-colors duration-200 ${
                activeTab === "subjectiveQnA"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50"
              }`}
            >
              Subjective Q&A ✍️
            </button>
          </aside>

          {/* Right Content Area */}
          <section className="flex-grow">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Learning: {pageTitle}
            </h1>
            <p className="text-md text-gray-600 mb-6">
              Subject: {libraryDocument.subject || "N/A"} | Topic:{" "}
              {libraryDocument.topic || "N/A"} | Chapter:{" "}
              {libraryDocument.chapter || "N/A"}
            </p>

            {/* Content Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("documentAnalysis")}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === "documentAnalysis"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Document Analysis
                </button>
                <button
                  onClick={() => setActiveTab("extractedSubtopics")}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === "extractedSubtopics"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Extracted Subtopics
                </button>
                <button
                  onClick={() => setActiveTab("aiTutor")}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === "aiTutor"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Teach me this (AI Tutor)
                </button>
                <button
                  onClick={() => setActiveTab("generateQuiz")}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === "generateQuiz"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Generate Quiz
                </button>
                <button
                  onClick={() => setActiveTab("subjectiveQnA")}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === "subjectiveQnA"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Subjective Q&A
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === "documentAnalysis" && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Document Analysis (Summary)
                  </h2>
                  {isDocumentAnalysisLoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>Generating document summary... Please wait.</p>
                      <svg
                        className="animate-spin h-8 w-8 text-indigo-500 mx-auto mt-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  ) : documentAnalysisError ? (
                    <p className="text-red-600">
                      Error generating summary: {documentAnalysisError}
                    </p>
                  ) : documentSummary ? (
                    <div className="prose prose-indigo max-w-none text-gray-700">
                      {/* Render Markdown content */}
                      {documentSummary.split("\n").map((line, index) => {
                        const headingMatch = line.match(/^(#+)\s*(.*)/); // Match Markdown headings
                        if (headingMatch) {
                          const level = headingMatch[1].length;
                          const text = headingMatch[2];
                          // Render H2 for ### (level 3 Markdown heading becomes H2 HTML), H3 for #### (level 4 Markdown becomes H3 HTML), etc.
                          // Ensuring minimum H2 HTML tag for the summary sections
                          const HeadingTag = `h${Math.min(
                            level - 1 || 1,
                            6
                          )}` as keyof JSX.IntrinsicElements; // Convert to h2, h3 etc. (min h2)
                          return (
                            <HeadingTag
                              key={index}
                              className="mt-4 mb-2 font-semibold text-gray-800"
                            >
                              {text}
                            </HeadingTag>
                          );
                        }
                        return (
                          <p key={index} className="mb-2">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      Click "Document Analysis" on the left to generate a
                      summary.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "extractedSubtopics" && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Extracted Subtopics
                  </h2>
                  {isSubtopicsLoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>Extracting subtopics... This might take a moment.</p>
                      <svg
                        className="animate-spin h-8 w-8 text-green-500 mx-auto mt-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  ) : subtopicsError ? (
                    <p className="text-red-600">
                      Error extracting subtopics: {subtopicsError}
                    </p>
                  ) : allSubtopicLines.length > 0 ? (
                    <>
                      <div className="prose prose-green max-w-none text-gray-700">
                        {/* Render current page's subtopics */}
                        {currentSubtopicItems.map((line, index) => {
                          // Regex to identify headings like "## I. [Primary Subtopic]" or "A. [Key Concept]" or "1. [Specific Detail]"
                          const isHeading = line.match(
                            /^(#+)\s*([IVX]+\.\s)?(.+)$/i
                          ); // Matches ## I. ... or # MAIN TOPIC:
                          const isBulletOrNumbered = line.match(
                            /^(\s*[-*]|\s*\d+\.)\s*(.+)$/
                          ); // Matches bullets or numbered lists

                          if (isHeading) {
                            const level = isHeading[1].length; // # is 1, ## is 2, etc.
                            const headingText = isHeading[3].trim();
                            const HeadingTag = `h${Math.min(
                              level + 1,
                              6
                            )}` as keyof JSX.IntrinsicElements; // Convert to h2, h3 etc. (min h2)

                            return (
                              <HeadingTag
                                key={index}
                                className="text-indigo-700 hover:text-indigo-900 cursor-pointer transition-colors duration-150 py-1"
                                onClick={() => handleSubtopicClick(headingText)} // Make heading clickable
                              >
                                {headingText}
                              </HeadingTag>
                            );
                          } else if (isBulletOrNumbered) {
                            const listItemText = isBulletOrNumbered[2].trim();
                            return (
                              <li
                                key={index}
                                className="py-0.5 text-gray-700 hover:text-indigo-700 cursor-pointer"
                                onClick={() =>
                                  handleSubtopicClick(listItemText)
                                }
                              >
                                {isBulletOrNumbered[1]}
                                {listItemText}
                              </li>
                            );
                          }
                          // For any other text, also make it clickable for subtopic detail (can be refined based on structure)
                          return (
                            <p
                              key={index}
                              className="mb-2 py-0.5 text-gray-700 hover:text-indigo-700 cursor-pointer"
                              onClick={() => handleSubtopicClick(line.trim())}
                            >
                              {line}
                            </p>
                          );
                        })}
                      </div>
                      {/* Subtopic Pagination Controls */}
                      {totalSubtopicPages > 1 && (
                        <div className="flex justify-center mt-8 space-x-2">
                          {[...Array(totalSubtopicPages)].map((_, index) => (
                            <button
                              key={`subtopic-page-${index}`}
                              onClick={() => paginateSubtopics(index + 1)}
                              className={`px-4 py-2 rounded-lg font-semibold ${
                                currentPageSubtopics === index + 1
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">
                      Click "Extract Subtopics" on the left to generate
                      subtopics.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "aiTutor" && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Teach me this (AI Tutor)
                  </h2>
                  <p className="text-gray-700">
                    AI Tutor functionality coming soon!
                  </p>
                </div>
              )}
              {activeTab === "generateQuiz" && (
                <div
                  ref={quizSectionRef} // Attach ref to the quiz container
                  onKeyDown={handleQuizSectionKeyDown} // Add keydown listener
                  className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
                >
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Generate Quiz
                  </h2>
                  {isQuizLoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>
                        Generating quiz questions... This might take a moment.
                      </p>
                      <svg
                        className="animate-spin h-8 w-8 text-orange-500 mx-auto mt-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  ) : quizError ? (
                    <p className="text-red-600">
                      Error generating quiz: {quizError}
                    </p>
                  ) : quizQuestions.length > 0 ? (
                    <>
                      <div className="space-y-6">
                        {currentQuizQuestions.map((q, index) => {
                          const questionId = q.id; // Use the actual ID from the QuizQuestion object
                          const isCorrect =
                            quizSubmitted &&
                            selectedAnswers[questionId] === q.correct_answer;
                          const isIncorrect =
                            quizSubmitted &&
                            selectedAnswers[questionId] !== q.correct_answer &&
                            selectedAnswers[questionId] !== undefined;

                          return (
                            <div
                              key={questionId}
                              className={`bg-gray-50 p-4 rounded-lg border ${
                                quizSubmitted
                                  ? isCorrect
                                    ? "border-green-400"
                                    : isIncorrect
                                    ? "border-red-400"
                                    : "border-gray-200"
                                  : "border-gray-200"
                              } shadow-sm`}
                            >
                              <p className="font-semibold text-gray-800 mb-3">
                                Q{indexOfFirstQuiz + index + 1}: {q.question}
                              </p>
                              <div className="space-y-2">
                                {Object.entries(q.options).map(
                                  ([key, value]) => {
                                    const optionId = `${questionId}-${key}`;
                                    const isSelected =
                                      selectedAnswers[questionId] === key;
                                    const showCorrect =
                                      quizSubmitted && q.correct_answer === key;

                                    return (
                                      <label
                                        key={optionId}
                                        htmlFor={optionId}
                                        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors duration-200 ${
                                          quizSubmitted
                                            ? showCorrect
                                              ? "bg-green-100 text-green-800 font-bold"
                                              : isSelected
                                              ? "bg-red-100 text-red-800"
                                              : "hover:bg-gray-100 text-gray-700"
                                            : isSelected
                                            ? "bg-indigo-50 text-indigo-800"
                                            : "hover:bg-gray-100 text-gray-700"
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          id={optionId}
                                          name={questionId} // Group radio buttons by question
                                          value={key}
                                          checked={isSelected}
                                          onChange={() =>
                                            handleAnswerChange(questionId, key)
                                          }
                                          disabled={quizSubmitted}
                                          className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                          tabIndex={0} // Ensure radio buttons are explicitly tabbable
                                        />
                                        <span>
                                          <strong>{key}:</strong> {value}
                                        </span>
                                        {quizSubmitted && showCorrect && (
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-green-600 ml-auto"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        )}
                                        {quizSubmitted &&
                                          isSelected &&
                                          !showCorrect && (
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              className="h-5 w-5 text-red-600 ml-auto"
                                              viewBox="0 0 20 20"
                                              fill="currentColor"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                          )}
                                      </label>
                                    );
                                  }
                                )}
                              </div>
                              {quizSubmitted && (
                                <div className="mt-4 text-sm bg-gray-100 p-3 rounded-md border border-gray-200">
                                  <p className="font-medium text-gray-800 mb-1">
                                    Explanation:
                                  </p>
                                  <p className="text-gray-700">
                                    {q.explanations[q.correct_answer]}
                                  </p>{" "}
                                  {/* Show explanation for correct answer */}
                                  <p className="text-gray-500 mt-2">
                                    Difficulty: {q.difficulty} | Concept:{" "}
                                    {q.concept_tested}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Quiz Actions */}
                      <div className="mt-8 flex justify-center space-x-4">
                        {!quizSubmitted && (
                          <button
                            onClick={handleSubmitQuiz}
                            disabled={!isQuizReadyToSubmit} // Disable if not all questions answered
                            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Submit Quiz
                          </button>
                        )}
                        {quizSubmitted && (
                          <>
                            <p className="text-lg font-bold text-gray-800 self-center">
                              Your Score: {currentQuizScore}/
                              {currentQuizQuestions.length}
                            </p>
                            <button
                              onClick={handleRetakeQuiz}
                              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                            >
                              Retake Quiz
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setIsQuizHistoryModalOpen(true)}
                          className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors"
                        >
                          View History
                        </button>
                      </div>

                      {/* Quiz Pagination Controls */}
                      {totalQuizPages > 1 && (
                        <div className="flex justify-center mt-8 space-x-2">
                          {[...Array(totalQuizPages)].map((_, index) => (
                            <button
                              key={`quiz-page-${index}`}
                              onClick={() => paginateQuiz(index + 1)}
                              className={`px-4 py-2 rounded-lg font-semibold ${
                                currentPageQuiz === index + 1
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">
                      Click "Generate Quiz" on the left to generate quiz
                      questions.
                    </p>
                  )}
                </div>
              )}
              {activeTab === "subjectiveQnA" && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Subjective Q&A
                  </h2>
                  {isQnALoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>
                        Generating subjective questions... This might take a
                        moment.
                      </p>
                      <svg
                        className="animate-spin h-8 w-8 text-rose-500 mx-auto mt-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  ) : qnaError ? (
                    <p className="text-red-600">
                      Error generating subjective questions: {qnaError}
                    </p>
                  ) : subjectiveQuestions.length > 0 ? (
                    <>
                      <div className="space-y-6">
                        {currentSubjectiveQuestions.map((q, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                          >
                            <p className="font-semibold text-gray-800 mb-2">
                              Q{indexOfFirstQnA + index + 1}: {q.question}
                            </p>
                            <div className="mt-2 text-sm text-gray-600">
                              <p>
                                <strong>Type:</strong> {q.type}
                              </p>
                              <p>
                                <strong>Complexity:</strong>{" "}
                                {q.complexity_level}
                              </p>
                              <p>
                                <strong>Suggested Length:</strong>{" "}
                                {q.suggested_response_length}
                              </p>
                              <p>
                                <strong>Key Concepts:</strong>{" "}
                                {q.key_concepts.join(", ")}
                              </p>
                              <p>
                                <strong>Evaluation Criteria:</strong>{" "}
                                {(q.evaluation_criteria || []).join("; ")}
                              </p>{" "}
                              {/* FIX applied here */}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Subjective Q&A Pagination Controls */}
                      {totalQnAPages > 1 && (
                        <div className="flex justify-center mt-8 space-x-2">
                          {[...Array(totalQnAPages)].map((_, index) => (
                            <button
                              key={`qna-page-${index}`}
                              onClick={() => paginateQnA(index + 1)}
                              className={`px-4 py-2 rounded-lg font-semibold ${
                                currentPageQnA === index + 1
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">
                      Click "Subjective Q&A" on the left to generate questions.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Subtopic Detail Modal */}
      <SubtopicDetailModal
        isOpen={isSubtopicDetailModalOpen}
        onClose={() => {
          setIsSubtopicDetailModalOpen(false);
          setSelectedSubtopicTitle("");
          setDetailedDocumentContent("");
          setDetailedResearchedContent("");
          setSubtopicDetailError(null);
        }}
        subtopicTitle={selectedSubtopicTitle}
        documentContent={detailedDocumentContent}
        researchedContent={detailedResearchedContent}
        isLoading={isSubtopicDetailLoading}
        error={subtopicDetailError}
      />

      {/* Quiz History Modal */}
      {isQuizHistoryModalOpen && (
        <QuizHistoryModal
          isOpen={isQuizHistoryModalOpen}
          onClose={() => setIsQuizHistoryModalOpen(false)}
          quizHistory={quizHistory}
          modalTitle={
            libraryDocument.chapter ||
            libraryDocument.topic ||
            libraryDocument.documentName ||
            libraryDocument.fileName
          }
        />
      )}

      {/* Confirmation Modal */}
      {isConfirmationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center relative transform transition-all duration-300 scale-100 opacity-100 animate-slide-up">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Confirm Action
            </h3>
            <p className="text-gray-600 mb-6">{confirmationMessage}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={cancelConfirmation}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPage;
