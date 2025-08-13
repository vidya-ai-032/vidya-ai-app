// src/components/AnalysisModal.tsx
"use client"; // This directive marks it as a client component

import React from "react";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: string; // The AI analysis text to display
}

/**
 * AnalysisModal component displays AI analysis results in a structured modal dialog.
 * It's designed to be reusable and controlled by parent components for visibility.
 */
const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  analysisResult,
}) => {
  if (!isOpen) return null; // Don't render if not open

  // Basic parsing for display: try to separate summary, topics, questions
  // This is a simple heuristic; a more robust solution might involve structured JSON output from Gemini
  const parseAnalysis = (text: string) => {
    const sections: { title: string; content: string[] }[] = [];
    const lines = text.split("\n").filter((line) => line.trim() !== "");

    let currentSectionTitle: string | null = null;
    let currentSectionContent: string[] = [];

    lines.forEach((line) => {
      // Check for common headings or numbered/bulleted lists
      if (
        line.match(/^(summary|key topics|questions|overview):?\s*$/i) ||
        line.match(/^\d+\.\s/i) || // Numbered list start
        line.match(/^- \s/i) // Bullet point start
      ) {
        if (currentSectionTitle !== null) {
          sections.push({
            title: currentSectionTitle,
            content: currentSectionContent,
          });
        }
        currentSectionTitle = line.replace(":", "").trim();
        currentSectionContent = [];
      } else {
        currentSectionContent.push(line);
      }
    });

    if (currentSectionTitle !== null) {
      sections.push({
        title: currentSectionTitle,
        content: currentSectionContent,
      });
    } else if (lines.length > 0) {
      // If no clear sections, treat the whole thing as one main analysis block
      sections.push({ title: "Analysis", content: lines });
    }

    return sections;
  };

  const structuredAnalysis = parseAnalysis(analysisResult);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 scale-100 opacity-100">
        {/* Close Button */}
        <button
          onClick={onClose}
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
          Document Analysis Results
        </h2>

        {structuredAnalysis.length > 0 ? (
          <div className="space-y-6">
            {structuredAnalysis.map((section, index) => (
              <div
                key={index}
                className="bg-gray-50 p-4 rounded-lg border border-gray-100"
              >
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {section.title}
                </h3>
                <div className="prose prose-indigo max-w-none text-gray-700">
                  {/* Render content, attempting to preserve line breaks and list formatting */}
                  {section.content.map((line, lineIndex) => (
                    <p key={lineIndex} className="mb-1">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center">
            No structured analysis available. Raw result below:
          </p>
        )}

        {/* Fallback/Raw Analysis Display */}
        {structuredAnalysis.length === 0 && (
          <div className="bg-gray-100 p-4 rounded-lg mt-4 text-sm text-gray-800 overflow-auto max-h-40">
            <pre className="whitespace-pre-wrap font-sans">
              {analysisResult}
            </pre>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
