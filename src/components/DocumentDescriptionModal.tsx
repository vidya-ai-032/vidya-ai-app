// src/components/DocumentDescriptionModal.tsx
"use client"; // This directive marks it as a client component

import React, { useState, useEffect } from "react";

// Interface for the structured metadata
interface StructuredDocumentMetadata {
  documentName: string;
  class: string;
  subject: string;
  topic: string;
  chapter: string;
  dateCreated: string; // YYYY-MM-DD format
}

interface DocumentDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMetadata: StructuredDocumentMetadata; // AI pre-populated or existing metadata
  onSave: (metadata: StructuredDocumentMetadata) => Promise<void>; // Function to save data to Firestore
  fileName: string; // Original filename as fallback
  isNewAnalysis: boolean; // Flag to indicate if modal is opened immediately after new analysis
}

/**
 * DocumentDescriptionModal component allows users to view and edit
 * AI-suggested or existing metadata for an uploaded document.
 */
const DocumentDescriptionModal: React.FC<DocumentDescriptionModalProps> = ({
  isOpen,
  onClose,
  initialMetadata,
  onSave,
  fileName,
  isNewAnalysis,
}) => {
  // Local state for form fields
  const [documentName, setDocumentName] = useState(
    initialMetadata.documentName || fileName
  );
  const [docClass, setDocClass] = useState(initialMetadata.class || ""); // Renamed to docClass to avoid conflict with JS Class keyword
  const [subject, setSubject] = useState(initialMetadata.subject || "");
  const [topic, setTopic] = useState(initialMetadata.topic || "");
  const [chapter, setChapter] = useState(initialMetadata.chapter || "");
  const [dateCreated, setDateCreated] = useState(
    initialMetadata.dateCreated || new Date().toISOString().split("T")[0]
  ); // Default to today if not provided

  // State to manage editing mode
  // If it's a new analysis, start in editing mode
  const [isEditing, setIsEditing] = useState(isNewAnalysis);
  const [isSaving, setIsSaving] = useState(false); // State for save button loading

  // Update local state when initialMetadata prop changes (e.g., when a new document is selected or analyzed)
  useEffect(() => {
    setDocumentName(initialMetadata.documentName || fileName);
    setDocClass(initialMetadata.class || "");
    setSubject(initialMetadata.subject || "");
    setTopic(initialMetadata.topic || "");
    setChapter(initialMetadata.chapter || "");
    setDateCreated(
      initialMetadata.dateCreated || new Date().toISOString().split("T")[0]
    );
    setIsEditing(isNewAnalysis); // Re-evaluate editing mode based on new analysis flag
  }, [initialMetadata, fileName, isNewAnalysis]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Basic validation
    if (
      !documentName.trim() ||
      !docClass.trim() ||
      !subject.trim() ||
      !topic.trim() ||
      !chapter.trim() ||
      !dateCreated.trim()
    ) {
      alert("Please fill in all document details before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        documentName,
        class: docClass,
        subject,
        topic,
        chapter,
        dateCreated,
      });
      alert("Document details saved successfully!");
      onClose(); // Close modal after successful save
    } catch (error: any) {
      console.error("Error saving document description:", error);
      alert(
        `Failed to save document details: ${
          error.message || "An unknown error occurred."
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Revert to initial state if cancelled while editing
    setDocumentName(initialMetadata.documentName || fileName);
    setDocClass(initialMetadata.class || "");
    setSubject(initialMetadata.subject || "");
    setTopic(initialMetadata.topic || "");
    setChapter(initialMetadata.chapter || "");
    setDateCreated(
      initialMetadata.dateCreated || new Date().toISOString().split("T")[0]
    );
    setIsEditing(isNewAnalysis); // Revert editing mode
    onClose(); // Close the modal
  };

  // Common input classes for consistency
  const inputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const disabledInputClass =
    "mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md shadow-sm text-gray-700 cursor-not-allowed sm:text-sm";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 scale-100 opacity-100">
        {/* Close Button */}
        <button
          onClick={handleCancel} // Use handleCancel for close button too
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          {isNewAnalysis
            ? "AI Suggested Document Details"
            : "Edit Document Details"}
        </h2>

        <form className="space-y-4">
          {isNewAnalysis && (
            <div
              className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-3 rounded-md mb-4"
              role="alert"
            >
              <p className="text-sm">
                These details were suggested by AI. Please review and edit as
                needed.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="documentName"
              className="block text-sm font-medium text-gray-700"
            >
              Document Name
            </label>
            <input
              type="text"
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className={isEditing ? inputClass : disabledInputClass}
              readOnly={!isEditing}
              placeholder="e.g., Grade 10 Math Textbook"
            />
          </div>

          <div>
            <label
              htmlFor="docClass"
              className="block text-sm font-medium text-gray-700"
            >
              Class/Grade Level
            </label>
            <input
              type="text"
              id="docClass"
              value={docClass}
              onChange={(e) => setDocClass(e.target.value)}
              className={isEditing ? inputClass : disabledInputClass}
              readOnly={!isEditing}
              placeholder="e.g., 10th Grade, Primary School"
            />
          </div>

          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700"
            >
              Subject
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={isEditing ? inputClass : disabledInputClass}
              readOnly={!isEditing}
              placeholder="e.g., Physics, History, Algebra"
            />
          </div>

          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700"
            >
              Topic
            </label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={isEditing ? inputClass : disabledInputClass}
              readOnly={!isEditing}
              placeholder="e.g., Newtonian Mechanics, World War II"
            />
          </div>

          <div>
            <label
              htmlFor="chapter"
              className="block text-sm font-medium text-gray-700"
            >
              Chapter/Section
            </label>
            <input
              type="text"
              id="chapter"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className={isEditing ? inputClass : disabledInputClass}
              readOnly={!isEditing}
              placeholder="e.g., Chapter 3, Section 1.2"
            />
          </div>

          <div>
            <label
              htmlFor="dateCreated"
              className="block text-sm font-medium text-gray-700"
            >
              Date Created
            </label>
            <input
              type="date" // HTML5 date input
              id="dateCreated"
              value={dateCreated}
              onChange={(e) => setDateCreated(e.target.value)}
              className={isEditing ? inputClass : disabledInputClass}
              readOnly={!isEditing}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors"
              >
                Edit
              </button>
            )}
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentDescriptionModal;
