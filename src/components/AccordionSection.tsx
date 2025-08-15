// src/components/AccordionSection.tsx
import React from "react";

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  level: "subject" | "topic" | "chapter";
  sectionId: string; // Unique ID for this section, e.g., 'subject-Mathematics'
  expanded: boolean; // Controlled by parent
  onToggle: (id: string) => void; // Callback to toggle expansion in parent
}

/**
 * AccordionSection component provides a collapsible section for organizing content
 * within the library, used for Subjects, Topics, and Chapters.
 * Its expanded state is controlled by the parent component.
 */
const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  children,
  level,
  sectionId,
  expanded,
  onToggle,
}) => {
  // Define CSS classes based on the level of the accordion (Subject, Topic, Chapter)
  const headingClass =
    level === "subject"
      ? "text-xl font-bold text-gray-800"
      : level === "topic"
      ? "text-lg font-semibold text-gray-700"
      : "text-md font-medium text-gray-600";

  // Add a bottom border only for the main subject sections
  const borderClass =
    level === "subject" ? "border-b border-gray-200 pb-2 mb-3" : "";

  // Add left padding to indent nested sections
  const paddingClass =
    level === "topic" ? "pl-4" : level === "chapter" ? "pl-8" : "";

  return (
    <div className={`mt-4 ${paddingClass}`}>
      <button
        className={`flex justify-between items-center w-full text-left focus:outline-none ${headingClass} ${borderClass}`}
        onClick={() => onToggle(sectionId)} // Call parent's toggle function with this section's ID
        aria-expanded={expanded} // ARIA attribute for accessibility
        aria-controls={`accordion-content-${sectionId}`} // Link to the collapsible content
      >
        {title}
        {/* Chevron icon to indicate expansion state */}
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${
            expanded ? "rotate-180" : "rotate-0"
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
      {/* Conditionally render children based on expanded state */}
      {expanded && (
        <div id={`accordion-content-${sectionId}`} className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
};

export default AccordionSection;
