// src/components/SubtopicDetailModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";

interface SubtopicDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtopicTitle: string;
  documentContent: string; // Content directly from the uploaded document
  researchedContent: string; // Enriched content from external research (to be paginated)
  isLoading: boolean;
  error: string | null;
}

/**
 * SubtopicDetailModal component displays detailed content for a selected subtopic.
 * It now features pagination for the 'researchedContent' to show content in chunks
 * and provides navigation buttons.
 */
const SubtopicDetailModal: React.FC<SubtopicDetailModalProps> = ({
  isOpen,
  onClose,
  subtopicTitle,
  documentContent,
  researchedContent,
  isLoading,
  error,
}) => {
  // State for pagination within the modal
  const [currentPageInModal, setCurrentPageInModal] = useState(1);
  const [contentPages, setContentPages] = useState<string[]>([]); // Array of content strings, each representing a page
  const LINES_PER_PAGE = 15; // Max lines per page
  const MIN_LINES_PER_PAGE = 10; // Minimum lines per page, flexible around this

  // Function to parse researchedContent into paginated chunks
  const paginateContent = useCallback((content: string): string[] => {
    const lines = content.split("\n").filter((line) => line.trim() !== "");
    const pages: string[] = [];
    let currentPageLines: string[] = [];

    lines.forEach((line, index) => {
      // Check for markdown headings (e.g., ##, ###, ****) or numbered/bulleted lists
      const isHeading =
        line.match(/^(#+)\s*(.+)$/) ||
        line.match(/^(\s*[-*]|\s*\d+\.)\s*(.+)$/) ||
        line.match(/^\*\*([^*]+)\*\*:/);

      // If it's a heading or we've reached a sufficient number of lines, start a new page
      if (
        isHeading &&
        currentPageLines.length >= MIN_LINES_PER_PAGE &&
        currentPageLines.length <= LINES_PER_PAGE
      ) {
        pages.push(currentPageLines.join("\n"));
        currentPageLines = []; // Start a new page
      }

      currentPageLines.push(line);

      // If the current page is full or it's the last line, add it as a page
      if (
        currentPageLines.length >= LINES_PER_PAGE ||
        index === lines.length - 1
      ) {
        pages.push(currentPageLines.join("\n"));
        currentPageLines = [];
      }
    });

    // Ensure no empty pages if a page was started but never filled
    if (currentPageLines.length > 0) {
      pages.push(currentPageLines.join("\n"));
    }

    return pages;
  }, []);

  // Effect to re-paginate content whenever researchedContent changes
  useEffect(() => {
    if (researchedContent) {
      const pages = paginateContent(researchedContent);
      setContentPages(pages);
      setCurrentPageInModal(1); // Reset to first page when content changes
    } else {
      setContentPages([]);
      setCurrentPageInModal(1);
    }
  }, [researchedContent, paginateContent]);

  if (!isOpen) return null;

  const totalPages = contentPages.length;

  const handleNextPage = () => {
    setCurrentPageInModal((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePreviousPage = () => {
    setCurrentPageInModal((prev) => Math.max(prev - 1, 1));
  };

  const currentContent = contentPages[currentPageInModal - 1] || "";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col relative transform transition-all duration-300 scale-100 opacity-100 animate-slide-up">
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
          {subtopicTitle}
        </h2>

        {isLoading ? (
          <div className="flex-grow flex flex-col items-center justify-center text-gray-600 py-8">
            <svg
              className="animate-spin h-10 w-10 text-indigo-500 mb-4"
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
            <p>Loading subtopic details...</p>
          </div>
        ) : error ? (
          <div className="flex-grow flex flex-col items-center justify-center text-red-600 py-8">
            <p className="font-semibold text-lg mb-2">Error Loading Content</p>
            <p className="text-sm text-center">{error}</p>
          </div>
        ) : (
          <>
            <div className="flex-grow overflow-y-auto mb-4 p-2 custom-scrollbar">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm mb-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">
                  From the Document:
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {documentContent ? (
                    documentContent.split("\n").map((line, idx) => (
                      <p key={`doc-line-${idx}`} className="mb-1">
                        {line}
                      </p>
                    ))
                  ) : (
                    <p className="italic text-gray-500">
                      No specific content for this subtopic found in the
                      original document.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border border-indigo-100 shadow-md">
                <h3 className="text-md font-semibold text-indigo-700 mb-2">
                  Researched Content:
                </h3>
                <div className="prose prose-sm max-w-none text-gray-800">
                  {currentContent ? (
                    // Render content from the current page, preserving line breaks
                    currentContent.split("\n").map((line, idx) => {
                      const isBold = line.match(/^\*\*([^*]+)\*\*$/); // Simple check for **bold** (no colon)
                      const isBullet = line.match(
                        /^(\s*[-*]|\s*\d+\.)\s*(.+)$/
                      ); // Matches bullets or numbered lists

                      if (isBold) {
                        return (
                          <p key={idx} className="font-bold my-1">
                            {isBold[1]}
                          </p>
                        );
                      } else if (isBullet) {
                        return (
                          <li key={idx} className="ml-4 my-0.5">
                            {isBullet[0].trim()}
                          </li>
                        ); // Render as list item
                      }
                      return (
                        <p key={idx} className="mb-1">
                          {line}
                        </p>
                      );
                    })
                  ) : (
                    <p className="italic text-gray-500">
                      No detailed researched content available for this
                      subtopic.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPageInModal === 1}
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                    />
                  </svg>
                  Previous
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentPageInModal} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPageInModal === totalPages}
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  Next
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 ml-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubtopicDetailModal;
