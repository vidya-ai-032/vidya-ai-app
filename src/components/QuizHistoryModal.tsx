// src/components/QuizHistoryModal.tsx
"use client";

import React, { useState, useEffect } from "react";

// Interface for Quiz Attempt History (should match the one in page.tsx)
interface QuizAttempt {
  id: string; // Firestore document ID
  score: number;
  totalQuestions: number;
  timestamp: any; // Firestore Timestamp
  attemptedQuestions: { [key: string]: string }; // Store question_id: selected_answer
  correctAnswers: { [key: string]: string }; // Store question_id: correct_answer
}

interface QuizHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizHistory: QuizAttempt[]; // Array of quiz attempt history
  modalTitle: string; // Chapter/Topic name for the modal heading
}

/**
 * QuizHistoryModal component displays a user's past quiz attempts
 * for a specific document, including score, timestamp, and pagination.
 */
const QuizHistoryModal: React.FC<QuizHistoryModalProps> = ({
  isOpen,
  onClose,
  quizHistory,
  modalTitle,
}) => {
  // State for pagination within the modal
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Number of quiz attempts per page

  useEffect(() => {
    // Reset to first page when modal opens or history changes
    setCurrentPage(1);
  }, [isOpen, quizHistory]);

  if (!isOpen) return null;

  // Calculate pagination values
  const totalPages = Math.ceil(quizHistory.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAttempts = quizHistory.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Helper to format Firestore Timestamp
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    // Check if it's a Firestore Timestamp object or a Date object
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString(); // Format as local date and time string
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col relative transform transition-all duration-300 scale-100 opacity-100 animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors z-10 p-2 rounded-full hover:bg-gray-100"
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

        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center border-b pb-3">
          Quiz History: {modalTitle} 📚
        </h2>

        {quizHistory.length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-gray-600 italic py-8">
            <p>No quiz attempts recorded yet.</p>
          </div>
        ) : (
          <>
            <div className="flex-grow overflow-y-auto mb-4 p-2 custom-scrollbar space-y-4">
              {currentAttempts.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
                >
                  <p className="text-lg font-semibold text-gray-800">
                    Attempt {indexOfFirstItem + index + 1}:
                  </p>
                  <p className="text-md text-gray-700 mt-1">
                    Score:{" "}
                    <span className="font-bold text-indigo-600">
                      {attempt.score}
                    </span>{" "}
                    / {attempt.totalQuestions}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Date: {formatTimestamp(attempt.timestamp)}
                  </p>
                  {/* You can add more details like specific answers if needed for review */}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4 space-x-2">
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={`history-page-${index}`}
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
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizHistoryModal;
