// src/components/FeatureCarousel.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image"; // Still needed for hero.png placeholder if any

interface Feature {
  id: number;
  title: string;
  description: string; // Short description (1-2 lines)
  iconEmoji: string; // Emoji for visual icon
  instruction?: string; // Optional: Dummy animated instruction text for hover detail
}

const features: Feature[] = [
  {
    id: 1,
    title: "Upload Documents & Analyze",
    description: "Instantly upload files and get actionable insights.",
    iconEmoji: "📄", // Document icon
    instruction: "Select, Upload, and AI will do the rest!",
  },
  {
    id: 2,
    title: "Generate Smart Summaries",
    description: "Turn complex information into clear, concise summaries.",
    iconEmoji: "💡", // Lightbulb/Summary icon
    instruction: "Get concise overviews of lengthy documents instantly.",
  },
  {
    id: 3,
    title: "Subtopics Extraction",
    description: "Break down topics into easy-to-understand parts.",
    iconEmoji: "📊", // Breakdown/Chart icon
    instruction: "Automatically pinpoint key subjects and themes.",
  },
  {
    id: 4,
    title: "Teach Me This",
    description: "Get step-by-step explanations tailored for you.",
    iconEmoji: "👨‍🏫", // Teacher/Info icon
    instruction: "Receive personalized explanations on demand!",
  },
  {
    id: 5,
    title: "Generate Quiz",
    description: "Create quizzes for quick, effective learning.",
    iconEmoji: "❓", // Quiz/Checklist icon
    instruction: "Generate multiple-choice questions automatically.",
  },
  {
    id: 6,
    title: "Subjective Q&A",
    description: "Practice with detailed, open-ended questions.",
    iconEmoji: "✍️", // Q&A/Essay icon
    instruction: "Engage with thought-provoking questions.",
  },
  {
    id: 7,
    title: "Interactive Dashboard",
    description: "Visualize and track progress in real-time.",
    iconEmoji: "📈", // Dashboard/Chart icon
    instruction: "Monitor your learning journey visually.",
  },
];

const FeaturesCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardsPerPage = 3; // Number of feature cards to display at a time

  const totalFeatures = features.length;

  // Adjusted navigation to move one card at a time, with wrapping
  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? totalFeatures - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === totalFeatures - 1 ? 0 : prevIndex + 1
    );
  };

  // Helper function to jump to a specific feature (for pagination dots)
  const goToFeature = (featureIndex: number) => {
    setCurrentIndex(featureIndex);
  };

  // This logic ensures smooth looping and correct display of cards
  const getDisplayedFeatures = () => {
    const displayed = [];
    for (let i = 0; i < cardsPerPage; i++) {
      displayed.push(features[(currentIndex + i) % totalFeatures]);
    }
    return displayed;
  };

  const displayedFeatures = getDisplayedFeatures();

  return (
    <div className="relative w-full overflow-hidden px-4 py-4 md:px-8">
      <div className="flex items-center justify-center">
        {/* Left Navigation Button */}
        <button
          onClick={handlePrev}
          className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 md:p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-20"
          aria-label="Previous feature"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        {/* Carousel Content */}
        <div className="flex justify-center items-stretch space-x-4 md:space-x-6 w-full">
          {displayedFeatures.map((feature, index) => (
            <div
              key={feature.id}
              // Apply conditional styling for the middle card (index 1 when cardsPerPage is 3)
              // Increased duration to duration-700 for a smoother transition on scale/shadow changes
              className={`relative group overflow-hidden rounded-xl flex-1 min-w-[280px] max-w-[350px] bg-white transition-all duration-700 ease-in-out border border-gray-200
                ${index === 1 ? "scale-110 shadow-2xl" : "scale-100 shadow-xl"}
                ${index === 1 ? "hover:scale-112" : "hover:scale-105"}
              `}
            >
              <div className="relative w-full h-48 sm:h-56 flex flex-col items-center justify-center p-4 rounded-t-xl bg-gradient-to-br from-purple-100 to-indigo-50">
                {/* Always visible content */}
                <span className="text-6xl text-indigo-700 mb-2">
                  {feature.iconEmoji}
                </span>
                <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
                  {feature.title}
                </h3>
                <p className="text-center text-sm text-gray-700 px-2">
                  {feature.description}
                </p>

                {/* Overlay for hover effect (if instruction exists) */}
                {feature.instruction && (
                  <div className="absolute inset-0 bg-indigo-950 bg-opacity-90 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl text-white">
                    <p className="text-lg font-semibold mb-3 text-center">
                      How it Works:
                    </p>
                    <p className="text-sm italic text-center text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out delay-200">
                      {feature.instruction}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right Navigation Button */}
        <button
          onClick={handleNext}
          className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 md:p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-20"
          aria-label="Next feature"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center mt-8 space-x-2">
        {Array.from({ length: totalFeatures }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToFeature(idx)}
            className={`w-3 h-3 rounded-full transition-colors duration-300
              ${
                currentIndex === idx
                  ? "bg-indigo-600"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            aria-label={`Go to feature ${idx + 1}`}
          />
        ))}
      </div>

      {/* Explore All / Upgrade Now Button */}
      <div className="mt-12 text-center">
        <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 transform hover:-translate-y-1 transition-all duration-300">
          Explore All Features & Upgrade Now!
        </button>
      </div>
    </div>
  );
};

export default FeaturesCarousel;
