// src/app/page.tsx
"use client"; // This directive marks it as a client component

// ... existing code ...
import { useState, useEffect } from "react";
// ... existing code ...
import SignInModal from "../components/SignInModal";
import Link from "next/link";
import Image from "next/image"; // Import Image component
import { auth } from "../lib/firebase/firebase"; // Import Firebase Auth instance
import { onAuthStateChanged, User } from "firebase/auth"; // Import onAuthStateChanged and User type
import { useRouter } from "next/navigation"; // Import useRouter

/**
 * HomePage component serves as the main landing page for Vidya AI.
 * It displays introductory content and conditionally renders the SignInModal.
 * It's a client component to handle modal state and Firebase Auth state.
 */
export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // State to hold Firebase user
  const router = useRouter(); // Initialize useRouter

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Function to open the sign-in modal
  const handleGetStartedClick = () => {
    setIsModalOpen(true);
  };

  // Function to close the sign-in modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

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
        <nav className="hidden md:flex space-x-6">
          <a
            href="#"
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            Home
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            Features
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            Pricing
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            Support
          </a>
        </nav>
        {currentUser ? ( // Check if a user is logged in via Firebase Auth
          // If authenticated, show a link to the library/dashboard
          <Link
            href="/library"
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
          >
            Go to Library
          </Link>
        ) : (
          // If not authenticated, show the Get Started button
          <button
            onClick={handleGetStartedClick}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          {/* Left Section: Text Content */}
          <div className="text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Unlock the Power of AI for <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Educational Content Analysis
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-xl mx-auto md:mx-0">
              Effortlessly analyze and extract insights from educational
              documents with our AI-powered workflow and enhance learning
              outcomes.
            </p>
            <div className="flex flex-col sm:flex-row justify-center md:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => alert("Upload Document feature coming soon!")} // Placeholder for functionality
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transform hover:-translate-y-1 transition-all duration-300"
              >
                Upload Document
              </button>
              <button
                onClick={() => alert("Learn More feature coming soon!")} // Placeholder for functionality
                className="px-8 py-3 bg-white text-indigo-600 border border-indigo-600 font-bold rounded-lg shadow-lg hover:bg-indigo-50 transform hover:-translate-y-1 transition-all duration-300"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Right Section: Illustrations */}
          <div className="hidden md:flex justify-center items-center">
            {/* Using hero.png from the public folder */}
            <div className="relative w-full max-w-md">
              {" "}
              {/* Removed aspect-video to allow Image to control dimensions */}
              <Image
                src="/hero.png" // Path to hero.png in the public folder
                alt="AI Powered Learning illustration"
                width={500} // Explicit width
                height={300} // Explicit height
                className="rounded-xl shadow-lg"
                // Removed layout="fill" and objectFit="contain" as explicit width/height are used
              />
            </div>
          </div>
        </div>
      </main>

      {/* Environment Status (as seen in UI) */}
      <div className="fixed bottom-4 left-4 bg-white p-4 rounded-xl shadow-lg border border-gray-200 text-sm">
        <h4 className="font-semibold text-gray-800 mb-2">Environment Status</h4>
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
          <li className="flex items-center text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Gemini API Key
          </li>
        </ul>
      </div>

      {/* Sign-in Modal */}
      <SignInModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
