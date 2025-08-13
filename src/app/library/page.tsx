// src/app/library/page.tsx
"use client"; // This directive marks it as a client component

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image"; // For user avatar
import React from "react"; // Import React for React.FC typing
// Import Firebase Auth, Firestore, and Storage instances
import { auth, db, storage } from "../../lib/firebase/firebase";
import {
  onAuthStateChanged,
  User as FirebaseAuthUser,
  signOut as firebaseSignOut,
} from "firebase/auth"; // Import Firebase Auth methods and User type
// Import Firestore functions for adding/getting documents and real-time updates, and deleting
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
// Import Firebase Storage functions for upload and deleting
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import Link from "next/link"; // Import Link for navigation
import AnalysisModal from "../../components/AnalysisModal"; // Import the AnalysisModal component (will be removed from immediate display logic)
import DocumentDescriptionModal from "../../components/DocumentDescriptionModal"; // Import DocumentDescriptionModal

// Define the interface for a User document in Firestore (still needed for type safety in session handling)
interface FirestoreUser {
  uid: string; // Firebase Auth UID
  email: string;
  name?: string;
  image?: string;
  role: "student" | "parent" | "tutor"; // Default role
  schoolBoard?: string;
  grade?: string;
  language?: string;
  geminiApiKey?: string; // For BYOK (Bring Your Own Key) feature
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

// Define the interface for a Document stored in Firestore
interface LibraryDocument {
  id: string; // Firestore document ID (REQUIRED after retrieval)
  uid: string; // User ID who uploaded the document
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadURL: string;
  uploadedAt: any; // Firestore Timestamp (can be Date or Timestamp type)
  status: "uploaded" | "processing" | "analyzed" | "failed"; // Document status
  analysisResult?: string; // New field for storing analysis results (full text)
  analysisError?: string; // New field for storing analysis errors
  // NEW: Fields for structured metadata
  documentName?: string;
  class?: string;
  subject?: string;
  topic?: string;
  chapter?: string;
  dateCreated?: string;
}

// Interface for the structured metadata expected from Gemini (and in modal)
interface StructuredDocumentMetadata {
  documentName: string;
  class: string;
  subject: string;
  topic: string;
  chapter: string;
  dateCreated: string;
}

/**
 * LibraryPage component serves as the main dashboard for authenticated users.
 * It displays document upload functionality, reading progress, and a placeholder for the user's library.
 * It also handles Firebase Auth session management, redirection, and provides navigation to settings.
 */
const LibraryPage: React.FC = () => {
  // Explicitly define as React.FC
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null); // State to hold Firebase Auth user
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(
    null
  ); // State to hold Firestore user profile
  const [loading, setLoading] = useState(true); // Loading state for authentication
  const [isUploadDragging, setIsUploadDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(
    null
  ); // To show which file is uploading
  const [userDocuments, setUserDocuments] = useState<LibraryDocument[]>([]); // State to store user's documents
  const [isEnvironmentStatusCollapsed, setIsEnvironmentStatusCollapsed] =
    useState(true); // State for collapse
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false); // State for analysis modal visibility
  const [selectedAnalysisResult, setSelectedAnalysisResult] = useState<
    string | null
  >(null); // State to hold analysis result for modal

  // NEW: State for Document Description Modal
  const [isDocumentDescriptionModalOpen, setIsDocumentDescriptionModalOpen] =
    useState(false);
  const [currentDocumentMetadata, setCurrentDocumentMetadata] =
    useState<LibraryDocument | null>(null); // Holds document being edited
  const [isCurrentAnalysisNew, setIsCurrentAnalysisNew] = useState(false); // True if modal opened immediately after new analysis

  // NEW: State to hold the file selected for upload, before "Upload & Analyze" is clicked
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // NEW: Refined upload/analysis state to manage UI feedback more precisely
  const [processState, setProcessState] = useState<
    "idle" | "fileSelected" | "uploading" | "analyzing" | "complete" | "failed"
  >("idle");

  // NEW: State to manage which dropdown is open (null or the document ID)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Listen for Firebase Auth state changes and fetch/create Firestore user profile
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch or create firestoreUser profile
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setFirestoreUser(userSnap.data() as FirestoreUser);
        } else {
          // Create new user profile if it doesn't exist in Firestore
          const newUserProfile: FirestoreUser = {
            uid: user.uid,
            email: user.email || "",
            name: user.displayName || undefined,
            image: user.photoURL || undefined,
            role: "student", // Default role for new users
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await setDoc(userRef, newUserProfile);
          setFirestoreUser(newUserProfile);
        }

        setLoading(false); // Auth is loaded
        // Setup real-time listener for user's documents
        const docsCollectionRef = collection(db, `users/${user.uid}/documents`);
        // Order by uploadedAt in descending order to show newest first
        const q = query(docsCollectionRef, orderBy("uploadedAt", "desc"));

        const unsubscribeFirestore = onSnapshot(
          q,
          (snapshot) => {
            const documents: LibraryDocument[] = [];
            snapshot.forEach((docSnap) => {
              documents.push({
                id: docSnap.id,
                ...docSnap.data(),
              } as LibraryDocument);
            });
            setUserDocuments(documents);
            console.log("Documents fetched from Firestore:", documents);
          },
          (error) => {
            console.error("Error fetching documents from Firestore:", error);
            alert("Failed to load your library documents.");
          }
        );

        // Return unsubscribe function for Firestore listener
        return () => unsubscribeFirestore();
      } else {
        // No user logged in, clear states and redirect
        setFirestoreUser(null); // Clear firestoreUser on sign out
        router.push("/");
        setLoading(false); // Auth is loaded, no user
      }
    });

    // Cleanup subscription for Auth listener
    return () => unsubscribeAuth();
  }, [router]);

  // Show a loading state while authentication is in progress
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading user session...</p>
      </div>
    );
  }

  // If not authenticated after loading, this return prevents rendering content
  if (!currentUser) {
    return null; // Or a more explicit unauthorized message if needed
  }

  // Handle Firebase Sign Out
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      console.log("Firebase Sign Out successful!");
      router.push("/"); // Redirect to homepage after sign out
    } catch (error) {
      console.error("Firebase Sign Out error:", error);
      alert("Failed to sign out. Please try again."); // Replace with a better UI later
    }
  };

  /**
   * Saves metadata of the uploaded document to Firestore.
   * @param docData The data for the document to save.
   */
  const saveDocumentMetadata = async (docData: Omit<LibraryDocument, "id">) => {
    if (!currentUser) {
      console.error("No user logged in to save document metadata.");
      return;
    }
    try {
      // Add a new document to the 'documents' subcollection of the user
      const docRef = await addDoc(
        collection(db, `users/${currentUser.uid}/documents`),
        docData
      );
      console.log("Document metadata saved to Firestore with ID:", docRef.id);
      // alert(`Document "${docData.fileName}" uploaded and metadata saved!`); // Removed alert here, modal will handle feedback
      // The onSnapshot listener will automatically update userDocuments state
    } catch (error) {
      console.error("Error saving document metadata:", error);
      alert(`Failed to save document metadata for "${docData.fileName}".`);
    }
  };

  /**
   * Handles the file upload process to Firebase Storage.
   * Updates upload progress in real-time.
   * @param file The file to upload.
   */
  const handleFileUpload = (fileToUpload: File) => {
    // Renamed parameter to avoid conflict with state
    if (!currentUser) {
      alert("Please sign in to upload documents.");
      return;
    }

    // Reset progress and set file name for display
    // These are now handled by handleUploadAndAnalyzeClick
    // setUploadProgress(0);
    // setUploadingFileName(fileToUpload.name);

    // Create a storage reference
    const storageRef = ref(
      storage,
      `user_uploads/${currentUser.uid}/${fileToUpload.name}`
    );
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    // Listen for state changes, errors, and completion of the upload.
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress)); // Update state for progress bar
        console.log("Upload is " + progress + "% done");
        switch (snapshot.state) {
          case "paused":
            console.log("Upload is paused");
            break;
          case "running":
            console.log("Upload is running");
            break;
        }
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Upload failed:", error);
        alert(`Failed to upload "${fileToUpload.name}": ${error.message}`);
        setProcessState("failed"); // Set process state to failed
        setUploadProgress(0); // Reset progress on error
        setUploadingFileName(null);
      },
      () => {
        // Handle successful uploads on complete
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log("File available at", downloadURL);
          // Save document metadata to Firestore
          const docMetadata: Omit<LibraryDocument, "id"> = {
            uid: currentUser.uid,
            fileName: fileToUpload.name,
            fileType: fileToUpload.type,
            fileSize: fileToUpload.size,
            downloadURL: downloadURL,
            uploadedAt: new Date(),
            status: "uploaded", // Initial status
          };
          saveDocumentMetadata(docMetadata);
          setUploadingFileName(null); // Clear uploading file name
          // After successful upload and metadata save, immediately trigger analysis
          // Note: `handleAnalyzeDocument` will update document status to 'processing'
          // and then 'analyzed' after AI call.
          // This call needs the document ID, which we don't have until saveDocumentMetadata
          // completes and firestore's onSnapshot updates.
          // A more robust solution might involve:
          // 1. Getting the docId from addDoc and passing it directly.
          // 2. Or, having a separate "upload and then analyze" button flow that handles the sequence.
          // For now, let's assume the onSnapshot will eventually catch up and trigger analyze.
          // Or, alternatively, the "Upload & Analyze" button below will take over this logic.
          // For now, removing immediate analyze call here.
          // The "Upload & Analyze" button will handle the complete sequence.

          // Trigger analyze directly if it's part of the 'Upload & Analyze' button flow
          // This logic will be moved to the button's onClick.
        });
      }
    );
  };

  /**
   * Handles files dropped onto the drag-and-drop area.
   * @param e DragEvent
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsUploadDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]); // Store the selected file
      setProcessState("fileSelected"); // Update process state
    } else {
      alert("No files dropped or file type not supported.");
    }
  };

  /**
   * Handles files selected via the file input.
   * @param e ChangeEvent<HTMLInputElement>
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]); // Store the selected file
      setProcessState("fileSelected"); // Update process state
    } else {
      alert("No file selected.");
    }
  };

  /**
   * Handles the "Upload & Analyze" button click.
   * Triggers file upload and then analysis upon successful upload.
   */
  const handleUploadAndAnalyzeClick = async () => {
    if (!selectedFile) {
      alert("Please select a file to upload first.");
      return;
    }

    if (!currentUser) {
      alert("Please sign in to upload documents.");
      return;
    }

    // Set process state to uploading
    setProcessState("uploading");
    setUploadProgress(0);
    setUploadingFileName(selectedFile.name);

    // Create a storage reference
    const storageRef = ref(
      storage,
      `user_uploads/${currentUser.uid}/${selectedFile.name}`
    );
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    try {
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => {
            console.error("Upload failed:", error);
            alert(`Failed to upload "${selectedFile.name}": ${error.message}`);
            setProcessState("failed"); // Set process state to failed
            setUploadProgress(0);
            setUploadingFileName(null);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("File available at", downloadURL);

            const docMetadata: Omit<LibraryDocument, "id"> = {
              uid: currentUser.uid,
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: selectedFile.size,
              downloadURL: downloadURL,
              uploadedAt: new Date(),
              status: "uploaded", // Initial status
            };

            try {
              const docRef = await addDoc(
                collection(db, `users/${currentUser.uid}/documents`),
                docMetadata
              );
              console.log(
                "Document metadata saved to Firestore with ID:",
                docRef.id
              );
              // Instead of alert, update state for a message or just proceed

              setProcessState("analyzing"); // Set process state to analyzing

              // Now call handleAnalyzeDocument with the newly uploaded document's data
              await handleAnalyzeDocument({ id: docRef.id, ...docMetadata });
              setProcessState("complete"); // Set process state to complete after analysis
              resolve();
            } catch (error) {
              console.error(
                "Error saving metadata or initiating analysis:",
                error
              );
              alert(`Failed to process "${selectedFile.name}" after upload.`);
              setProcessState("failed"); // Set process state to failed
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error("Overall upload and analyze flow failed:", error);
      setProcessState("failed"); // Ensure state is failed on overall catch
    } finally {
      setSelectedFile(null); // Clear selected file after attempt
      setUploadingFileName(null); // Clear uploading file name
      setUploadProgress(0); // Reset progress
    }
  };

  /**
   * Handles the click on the "Analyze" button for a document.
   * Sends the document for AI analysis via a Next.js API route.
   * @param document The document to analyze.
   */
  const handleAnalyzeDocument = async (document: LibraryDocument) => {
    if (!currentUser) {
      alert("Please sign in to analyze documents.");
      return;
    }
    // Prevent multiple analysis requests for a document
    if (document.status === "processing") {
      alert("Document is already being analyzed.");
      return;
    }

    // Optimistically update status to 'processing' in UI
    setUserDocuments(
      (prevDocs) =>
        prevDocs.map((d) =>
          d.id === document.id
            ? { ...d, status: "processing", analysisError: undefined }
            : d
        ) // Clear previous error if retrying
    );

    try {
      console.log(`Sending analysis request for document ID: ${document.id}`);
      const response = await fetch("/api/analyze-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: document.id,
          userId: currentUser.uid, // Pass userId for server-side lookup of API key
          documentUrl: document.downloadURL,
          fileName: document.fileName,
          fileType: document.fileType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Analysis API Error:", result.error);
        alert(`Analysis failed for "${document.fileName}": ${result.error}`);
        // Revert status or set to failed with error
        setUserDocuments((prevDocs) =>
          prevDocs.map((d) =>
            d.id === document.id
              ? { ...d, status: "failed", analysisError: result.error }
              : d
          )
        );
        return;
      }

      console.log("Analysis successful:", result.analysis);

      // Extract structured metadata and open the Document Description Modal
      const { analysis, structuredMetadata } = result;
      // Removed direct opening of AnalysisModal here.

      // After AI analysis, open the Document Description Modal
      // Use original file name as fallback for documentName, and current doc ID
      const initialDocDataForModal: LibraryDocument = {
        ...document, // Carry over existing document properties
        documentName: structuredMetadata?.documentName || document.fileName,
        class: structuredMetadata?.class || "",
        subject: structuredMetadata?.subject || "",
        topic: structuredMetadata?.topic || "",
        chapter: structuredMetadata?.chapter || "",
        dateCreated:
          structuredMetadata?.dateCreated ||
          new Date().toISOString().split("T")[0],
      };

      setCurrentDocumentMetadata(initialDocDataForModal);
      setIsCurrentAnalysisNew(true); // Indicate it's a new analysis triggering the modal
      setIsDocumentDescriptionModalOpen(true); // Open the Document Description Modal

      // onSnapshot will handle updating the state with the new analysisResult and status.
      // Removed manual setUserDocuments update here as onSnapshot handles it, preventing potential race conditions
    } catch (error: any) {
      console.error("Network or unexpected analysis error:", error);
      alert(
        `An unexpected error occurred during analysis for "${document.fileName}".`
      );
      setUserDocuments((prevDocs) =>
        prevDocs.map((d) =>
          d.id === document.id
            ? {
                ...d,
                status: "failed",
                analysisError: error.message || "Network error",
              }
            : d
        )
      );
    }
  };

  /**
   * Handles saving the updated document metadata from the DocumentDescriptionModal to Firestore.
   * @param updatedMetadata The metadata object from the modal.
   */
  const handleSaveDocumentDescription = async (
    updatedMetadata: StructuredDocumentMetadata
  ) => {
    if (!currentUser || !currentDocumentMetadata?.id) {
      console.error(
        "No user logged in or no document selected for metadata update."
      );
      throw new Error("Authentication or document missing.");
    }

    try {
      const docRef = doc(
        db,
        `users/${currentUser.uid}/documents`,
        currentDocumentMetadata.id
      );
      // Update only the metadata fields, merging with existing document data
      await setDoc(
        docRef,
        {
          documentName: updatedMetadata.documentName,
          class: updatedMetadata.class,
          subject: updatedMetadata.subject,
          topic: updatedMetadata.topic,
          chapter: updatedMetadata.chapter,
          dateCreated: updatedMetadata.dateCreated,
          updatedAt: new Date(), // Update the timestamp
        },
        { merge: true }
      ); // Use merge: true to avoid overwriting other fields

      console.log(
        "Document metadata updated in Firestore for ID:",
        currentDocumentMetadata.id
      );
      // The onSnapshot listener will update userDocuments state automatically
    } catch (error: any) {
      console.error("Error saving document description to Firestore:", error);
      throw new Error(`Failed to save document description: ${error.message}`);
    }
  };

  /**
   * Handles the deletion of a document from Firebase Storage and Firestore.
   * @param document The document to delete.
   */
  const handleDeleteDocument = async (document: LibraryDocument) => {
    if (!currentUser || !document.id) {
      alert(
        "Cannot delete document: User not logged in or document ID missing."
      );
      return;
    }

    // Confirmation dialog (to be replaced with a proper modal later)
    // IMPORTANT: Replacing window.confirm with a custom modal is recommended for better UI/UX.
    if (
      !window.confirm(
        `Are you sure you want to delete "${document.fileName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // 1. Delete from Firebase Storage
      const storagePath = `user_uploads/${currentUser.uid}/${document.fileName}`;
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
      console.log(`File "${document.fileName}" deleted from Firebase Storage.`);

      // 2. Delete from Firestore Database
      const docRef = doc(db, `users/${currentUser.uid}/documents`, document.id);
      await deleteDoc(docRef);
      console.log(
        `Document metadata for "${document.fileName}" deleted from Firestore.`
      );

      alert(`Document "${document.fileName}" successfully deleted.`);
      // The onSnapshot listener will automatically update userDocuments state,
      // so no manual state update is needed here for removal.
    } catch (error: any) {
      console.error("Error deleting document:", error);
      // Specific error for file not found in storage (already deleted, or never existed)
      if (error.code === "storage/object-not-found") {
        alert(
          `File "${document.fileName}" was not found in storage but its metadata will be removed from your library.`
        );
        // Proceed to delete from Firestore even if storage file was missing
        try {
          const docRef = doc(
            db,
            `users/${currentUser.uid}/documents`,
            document.id
          );
          await deleteDoc(docRef);
          console.log(
            `Document metadata for "${document.fileName}" deleted from Firestore after storage object not found.`
          );
        } catch (firestoreDeleteError: any) {
          console.error(
            "Error deleting Firestore doc after storage object not found:",
            firestoreDeleteError
          );
          alert(
            `Failed to delete document metadata for "${document.fileName}": ${firestoreDeleteError.message}`
          );
        }
      } else {
        alert(`Failed to delete "${document.fileName}": ${error.message}`);
      }
    }
  };

  // Helper function to format date for display
  const formatDate = (dateInput: any, docDateCreated?: string): string => {
    if (docDateCreated) {
      const parsedDate = new Date(docDateCreated);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }

    // Fallback to uploadedAt if docDateCreated is not available or invalid
    if (!dateInput) return "N/A";
    const date = dateInput instanceof Date ? dateInput : dateInput.toDate();

    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const oneMinute = 1000 * 60;
    const oneHour = oneMinute * 60;
    const oneDay = oneHour * 24;

    if (diffTime < oneMinute) {
      return "just now";
    } else if (diffTime < oneHour) {
      const minutes = Math.floor(diffTime / oneMinute);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffTime < oneDay && now.getDate() === date.getDate()) {
      return `Today, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffTime < 2 * oneDay && now.getDate() - date.getDate() === 1) {
      return `Yesterday, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // All documents, sorted by uploadedAt (descending)
  const allSortedDocuments = [...userDocuments].sort((a, b) => {
    const dateA =
      a.uploadedAt instanceof Date
        ? a.uploadedAt.getTime()
        : a.uploadedAt?.toDate().getTime();
    const dateB =
      b.uploadedAt instanceof Date
        ? b.uploadedAt.getTime()
        : b.uploadedAt?.toDate().getTime();
    return (dateB || 0) - (dateA || 0);
  });

  // Calculate total pages for pagination
  const totalPages = Math.ceil(allSortedDocuments.length / itemsPerPage);

  // Get current documents for the list based on pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = allSortedDocuments.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Group documents by Subject -> Topic -> Chapter/Section
  const groupedDocuments = currentItems.reduce((acc, doc) => {
    const subject = doc.subject || "Uncategorized Subject";
    const topic = doc.topic || "Uncategorized Topic";
    const chapter = doc.chapter || "Uncategorized Chapter";

    if (!acc[subject]) {
      acc[subject] = {};
    }
    if (!acc[subject][topic]) {
      acc[subject][topic] = {};
    }
    if (!acc[subject][topic][chapter]) {
      acc[subject][topic][chapter] = [];
    }
    acc[subject][topic][chapter].push(doc);
    return acc;
  }, {} as Record<string, Record<string, Record<string, LibraryDocument[]>>>);

  // Component for rendering a single document item in the list
  const DocumentItem: React.FC<{
    doc: LibraryDocument;
    onEdit: (doc: LibraryDocument) => void;
    onDelete: (doc: LibraryDocument) => void;
    onAnalyze: (doc: LibraryDocument) => void;
    onDropdownToggle: (id: string | null) => void;
    isOpen: boolean;
  }> = ({ doc, onEdit, onDelete, onAnalyze, onDropdownToggle, isOpen }) => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex-grow mb-2 sm:mb-0">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {doc.documentName || doc.fileName}
          </h3>
          {doc.chapter && ( // Only display chapter if it exists
            <p className="text-sm text-gray-600 mt-1">
              {doc.chapter && `Chapter: ${doc.chapter}`}
            </p>
          )}
          {/* Display date from document description first, then uploadedAt fallback */}
          <p className="text-sm text-gray-600">
            {doc.dateCreated
              ? `Date Created: ${formatDate(doc.uploadedAt, doc.dateCreated)}`
              : `Uploaded: ${formatDate(doc.uploadedAt)}`}
          </p>
          <p className="text-sm">
            Status:{" "}
            <span
              className={`font-semibold ${
                doc.status === "uploaded"
                  ? "text-gray-500"
                  : doc.status === "processing"
                  ? "text-blue-500"
                  : doc.status === "analyzed"
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              {doc.status === "processing" && "..."}
            </span>
          </p>
          {doc.status === "failed" && doc.analysisError && (
            <p className="text-xs text-red-500 mt-1">
              Error: {doc.analysisError}
            </p>
          )}
        </div>
        <div className="relative inline-block text-left ml-0 sm:ml-auto">
          <div>
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              id={`list-options-menu-${doc.id}`}
              aria-haspopup="true"
              aria-expanded={isOpen ? "true" : "false"}
              onClick={() => onDropdownToggle(doc.id)}
            >
              Actions
              <svg
                className="-mr-1 ml-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {isOpen && (
            <div
              className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby={`list-options-menu-${doc.id}`}
            >
              <div className="py-1" role="none">
                <button
                  onClick={() => {
                    router.push(`/learn/${doc.id}`);
                    onDropdownToggle(null);
                  }}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-600 hover:text-white cursor-pointer w-full text-left"
                  role="menuitem"
                >
                  Start Learning
                </button>
                <a
                  href={doc.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-600 hover:text-white cursor-pointer w-full text-left"
                  role="menuitem"
                >
                  View Original Document
                </a>
                {/*
                  NOTE on 403 "Permission denied" errors for "View Original Document":
                  This error often occurs because the Firebase Storage downloadURL contains a token
                  that might expire or become invalid if the user's authentication session changes
                  (e.g., they log out and back in, or the session times out).
                  When a direct '<a>' tag opens this URL in a new tab, the new tab's context
                  might not automatically carry the *current* authentication needed by Firebase Storage rules,
                  even if the user is logged in the main application.
                  For a robust solution, especially for sensitive files, generating a
                  short-lived, signed URL from a secure backend (using Firebase Admin SDK)
                  is recommended. This is beyond a simple frontend fix and would require
                  modifying the API layer. For now, ensure your Firebase Storage rules
                  (e.g., in storage.rules) explicitly allow read if request.auth.uid matches userId
                  and that your user's Firebase session is active.
                */}
                {doc.status === "analyzed" &&
                  (doc.documentName ||
                    doc.class ||
                    doc.subject ||
                    doc.topic ||
                    doc.chapter ||
                    doc.dateCreated) && (
                    <button
                      onClick={() => {
                        onEdit(doc);
                        onDropdownToggle(null);
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-600 hover:text-white cursor-pointer w-full text-left"
                      role="menuitem"
                    >
                      Edit Details
                    </button>
                  )}
                {doc.status === "uploaded" && (
                  <button
                    onClick={() => {
                      onAnalyze(doc);
                      onDropdownToggle(null);
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-600 hover:text-white cursor-pointer w-full text-left"
                    role="menuitem"
                  >
                    Analyze Document
                  </button>
                )}
                {doc.status === "failed" && (
                  <button
                    onClick={() => {
                      onAnalyze(doc);
                      onDropdownToggle(null);
                    }}
                    className="block px-4 py-2 text-sm text-red-700 hover:bg-red-600 hover:text-white cursor-pointer w-full text-left"
                    role="menuitem"
                  >
                    Retry Analysis
                  </button>
                )}
              </div>
              <div className="py-1" role="none">
                <button
                  onClick={() => {
                    onDelete(doc);
                    onDropdownToggle(null);
                  }}
                  className="block px-4 py-2 text-sm text-red-700 hover:bg-red-600 hover:text-white cursor-pointer w-full text-left"
                  role="menuitem"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Accordion Component for Subject/Topic/Chapter Sections
  const AccordionSection: React.FC<{
    title: string;
    children: React.ReactNode;
    level: "subject" | "topic" | "chapter";
  }> = ({ title, children, level }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Default to expanded for initial view

    const headingClass =
      level === "subject"
        ? "text-xl font-bold text-gray-800"
        : level === "topic"
        ? "text-lg font-semibold text-gray-700"
        : "text-md font-medium text-gray-600";
    const borderClass =
      level === "subject" ? "border-b border-gray-200 pb-2 mb-3" : "";
    const paddingClass =
      level === "topic" ? "pl-4" : level === "chapter" ? "pl-8" : "";

    return (
      <div className={`mt-4 ${paddingClass}`}>
        <button
          className={`flex justify-between items-center w-full text-left focus:outline-none ${headingClass} ${borderClass}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {title}
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : "rotate-0"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {isExpanded && <div className="mt-3">{children}</div>}
      </div>
    );
  };

  // If authenticated, display the library page content
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
            <div className="flex items-center space-x-2">
              {currentUser.photoURL && (
                <Image
                  src={currentUser.photoURL}
                  alt="User Avatar"
                  width={32}
                  height={32}
                  className="rounded-full border border-gray-300"
                />
              )}
              <span className="text-gray-700 font-medium hidden sm:inline">
                {currentUser.email}
              </span>
            </div>
          )}
          {/* Always display Settings button on Library page */}
          <Link
            href="/settings"
            className="px-4 py-2 bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-600 transition-colors"
          >
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-10">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
          {/* Upload Progress Bar */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {/* Only show "Uploading: FileName" if an upload is in progress */}
              {processState === "uploading" &&
                `Uploading: ${uploadingFileName}`}
              {processState === "analyzing" &&
                `Analyzing: ${uploadingFileName}`}
              {processState !== "uploading" &&
                processState !== "analyzing" &&
                "Upload Progress"}
            </h3>
            {/* Show progress bar only when uploading or analyzing */}
            {(processState === "uploading" || processState === "analyzing") && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-indigo-500 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }} // Dynamic width based on uploadProgress state
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  role="progressbar"
                ></div>
              </div>
            )}
            {/* Only show percentage if upload is in progress or completed */}
            {(processState === "uploading" || processState === "analyzing") && (
              <p className="text-right text-sm text-gray-500 mt-1">
                {uploadProgress}%
              </p>
            )}
            {/* Show status message in place of percentage after upload/analysis is complete or failed */}
            {processState === "complete" && (
              <p className="text-right text-sm text-green-600 mt-1">
                Process Complete!
              </p>
            )}
            {processState === "failed" && (
              <p className="text-right text-sm text-red-500 mt-1">
                Process Failed.
              </p>
            )}
          </div>

          {/* Upload Document Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Upload Document
            </h2>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                isUploadDragging
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsUploadDragging(true);
              }}
              onDragLeave={() => setIsUploadDragging(false)}
              onDrop={handleDrop} // Updated to only store file
            >
              <input
                type="file"
                className="hidden"
                id="file-upload"
                multiple // Keep multiple if desired, but handleFileUpload currently processes first file
                accept=".pdf,.docx,.pptx,.txt"
                onChange={handleFileSelect} // Updated to only store file
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-gray-400 text-5xl mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-12 h-12 mx-auto"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">
                  Drag and drop or browse
                </p>
                {/* Dynamically show selected file or prompt */}
                <p className="text-sm text-gray-500 mt-1">
                  {selectedFile
                    ? `File selected: ${selectedFile.name}`
                    : "PDF, DOCX, PPTX, TXT"}
                </p>
                {/* Show status like "Analyzing..." directly in the box only if processState is analyzing */}
                {processState === "analyzing" && (
                  <p className="text-sm text-blue-500 mt-2 font-semibold">
                    Analyzing document...
                  </p>
                )}
              </label>
            </div>
            <button
              onClick={handleUploadAndAnalyzeClick} // NEW: Call the combined upload and analyze handler
              className="mt-6 w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
              disabled={
                !selectedFile ||
                processState === "uploading" ||
                processState === "analyzing"
              } // Disable if no file or processing
            >
              {processState === "uploading"
                ? "Uploading..."
                : processState === "analyzing"
                ? "Analyzing..."
                : "Upload & Analyze"}
            </button>
          </div>

          {/* My Library Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              My Library
            </h2>
            {allSortedDocuments.length > 0 ? (
              <>
                {/* All documents as a hierarchical list */}
                {/* Removed the redundant 'Library' subheading */}
                <div className="space-y-4">
                  {Object.entries(groupedDocuments).map(([subject, topics]) => (
                    <AccordionSection
                      key={subject}
                      title={subject || "Uncategorized Subject"}
                      level="subject"
                    >
                      {Object.entries(topics).map(([topic, chapters]) => (
                        <AccordionSection
                          key={topic}
                          title={topic || "Uncategorized Topic"}
                          level="topic"
                        >
                          {Object.entries(chapters).map(([chapter, docs]) => (
                            <AccordionSection
                              key={chapter}
                              title={chapter || "Uncategorized Chapter"}
                              level="chapter"
                            >
                              <div className="space-y-3">
                                {docs.map(
                                  (
                                    doc: LibraryDocument // Explicitly type 'doc'
                                  ) => (
                                    <DocumentItem
                                      key={doc.id}
                                      doc={doc}
                                      onEdit={(d) => {
                                        setCurrentDocumentMetadata(d);
                                        setIsCurrentAnalysisNew(false);
                                        setIsDocumentDescriptionModalOpen(true);
                                      }}
                                      onDelete={handleDeleteDocument}
                                      onAnalyze={handleAnalyzeDocument}
                                      onDropdownToggle={(id) =>
                                        setOpenDropdownId(id)
                                      }
                                      isOpen={openDropdownId === doc.id}
                                    />
                                  )
                                )}
                              </div>
                            </AccordionSection>
                          ))}
                        </AccordionSection>
                      ))}
                    </AccordionSection>
                  ))}
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8 space-x-2">
                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index}
                        onClick={() => paginate(index + 1)}
                        className={`px-4 py-2 rounded-lg font-semibold ${
                          currentPage === index + 1
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
              <div className="border border-gray-200 rounded-xl p-6 text-center text-gray-500 italic bg-gray-50">
                <p>
                  Your library is empty. Upload your first document to get
                  started!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Environment Status (as seen in UI) */}
      <div className="fixed bottom-4 left-4 bg-white p-4 rounded-xl shadow-lg border border-gray-200 text-sm z-40">
        <h4 className="font-semibold text-gray-800 mb-2">Environment Status</h4>
        <button
          onClick={() =>
            setIsEnvironmentStatusCollapsed(!isEnvironmentStatusCollapsed)
          }
          className="p-1 rounded-full hover:bg-gray-200 transition-colors absolute top-3 right-3"
          aria-label={
            isEnvironmentStatusCollapsed ? "Expand status" : "Collapse status"
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform duration-200 ${
              isEnvironmentStatusCollapsed ? "rotate-0" : "rotate-180"
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 15.75l7.5-7.5 7.5 7.5"
            />
          </svg>
        </button>
        <div className={`${isEnvironmentStatusCollapsed ? "hidden" : "block"}`}>
          <ul className="space-y-1">
            <li className="flex items-center text-gray-700">
              <span className="font-medium mr-2">NODE_ENV:</span>{" "}
              {process.env.NODE_ENV}
            </li>
            <li className="flex items-center text-gray-700">
              <span className="font-medium mr-2">Firebase Project ID:</span>{" "}
              {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
                ? "Configured"
                : "Missing"}
            </li>
            <li className="flex items-center text-gray-700">
              <span className="font-medium mr-2">Firebase API Key:</span>{" "}
              {process.env.NEXT_PUBLIC_FIREBASE_API_KEY
                ? "Configured"
                : "Missing"}
            </li>
            {/* Check for Google Auth configuration in Firebase (implicitly done by enabling provider) */}
            <li className="flex items-center text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Firebase Google Auth Enabled
            </li>
            {/* Indicator for Gemini API Key - now based on presence in firestoreUser */}
            <li
              className={`flex items-center ${
                firestoreUser?.geminiApiKey ? "text-green-600" : "text-red-500"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Gemini API Key
            </li>
          </ul>
        </div>
      </div>

      {/* Analysis Result Modal (Existing - now less used directly) */}
      {isAnalysisModalOpen && selectedAnalysisResult && (
        <AnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={() => {
            setIsAnalysisModalOpen(false);
            setSelectedAnalysisResult(null);
          }}
          analysisResult={selectedAnalysisResult}
        />
      )}

      {/* Document Description Modal */}
      {isDocumentDescriptionModalOpen && currentDocumentMetadata && (
        <DocumentDescriptionModal
          isOpen={isDocumentDescriptionModalOpen}
          onClose={() => {
            setIsDocumentDescriptionModalOpen(false);
            setCurrentDocumentMetadata(null); // Clear selected document
            setIsCurrentAnalysisNew(false); // Reset flag
          }}
          initialMetadata={{
            documentName:
              currentDocumentMetadata!.documentName ||
              currentDocumentMetadata!.fileName,
            class: currentDocumentMetadata!.class || "",
            subject: currentDocumentMetadata!.subject || "",
            topic: currentDocumentMetadata!.topic || "",
            chapter: currentDocumentMetadata!.chapter || "",
            dateCreated:
              currentDocumentMetadata!.dateCreated ||
              new Date().toISOString().split("T")[0],
          }}
          onSave={handleSaveDocumentDescription}
          fileName={currentDocumentMetadata!.fileName}
          isNewAnalysis={isCurrentAnalysisNew}
        />
      )}
    </div>
  );
};

export default LibraryPage; // Export the component
