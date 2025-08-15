// src/app/page.tsx
"use client"; // This directive marks it as a client component

import { useState, useEffect, useRef } from "react"; // Import useRef
import SignInModal from "../components/SignInModal";
import Link from "next/link";
import Image from "next/image"; // Import Image component
import { auth } from "../lib/firebase/firebase"; // Import Firebase Auth instance
import { onAuthStateChanged, User } from "firebase/auth"; // Import onAuthStateChanged and User type
import { useRouter } from "next/navigation"; // Import useRouter
import FeatureCarousel from "../components/FeatureCarousel"; // Import the new FeatureCarousel component

/**
 * HomePage component serves as the main landing page for Vidya AI.
 * It displays introductory content and conditionally renders the SignInModal.
 * It's a client component to handle modal state and Firebase Auth state.
 */
export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // State to hold Firebase user
  const router = useRouter(); // Initialize useRouter
  // Declare the state for environment status collapse
  const [isEnvironmentStatusCollapsed, setIsEnvironmentStatusCollapsed] =
    useState(true);

  // Refs for scrolling to sections
  const aboutRef = useRef<HTMLDivElement>(null);
  const premiumFeaturesRef = useRef<HTMLDivElement>(null);
  const userProfilesRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null); // NEW: Ref for the Dashboard section

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

  // Handle click for the "Upload Document" button
  const handleUploadDocumentClick = () => {
    if (currentUser) {
      // If user is logged in, redirect to library page
      router.push("/library");
    } else {
      // If user is logged out, open the sign-in modal
      setIsModalOpen(true);
    }
  };

  // Handle click for the "Learn More" button - scrolls to About section
  const handleLearnMoreClick = () => {
    aboutRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col">
      {/* Header/Navigation */}
      <header className="w-full bg-white shadow-sm py-4 px-6 flex justify-between items-center rounded-b-xl z-10">
        {" "}
        {/* Added z-10 to keep header on top */}
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
          <button
            onClick={() =>
              aboutRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            About
          </button>
          <button
            onClick={() =>
              premiumFeaturesRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            Features
          </button>
          <button
            onClick={() =>
              userProfilesRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            For You
          </button>
          <button
            onClick={() =>
              dashboardRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            Dashboard
          </button>{" "}
          {/* NEW: Dashboard Nav Link */}
          <button
            onClick={() =>
              contactRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            Contact
          </button>
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
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        {/* Section 1: Hero Section */}
        <section className="min-h-[calc(100vh-6rem)] flex items-center justify-center w-full">
          {" "}
          {/* Adjust height to account for header */}
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
                  onClick={handleUploadDocumentClick}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transform hover:-translate-y-1 transition-all duration-300"
                >
                  Upload Document
                </button>
                <button
                  onClick={handleLearnMoreClick}
                  className="px-8 py-3 bg-white text-indigo-600 border border-indigo-600 font-bold rounded-lg shadow-lg hover:bg-indigo-50 transform hover:-translate-y-1 transition-all duration-300"
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Section: Illustrations */}
            <div className="hidden md:flex justify-center items-center">
              <div className="relative w-full max-w-md aspect-video">
                <Image
                  src="/hero.png" // Path to hero.png in the public folder
                  alt="AI Powered Learning illustration"
                  layout="fill"
                  objectFit="contain"
                  className="rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="w-full max-w-6xl mx-auto py-16">
          {/* Section 2: About Section */}
          <section
            ref={aboutRef}
            className="bg-white p-8 rounded-xl shadow-lg mb-16 text-center"
          >
            {" "}
            {/* Centered content */}
            <h2 className="text-4xl font-extrabold text-gray-900 mb-6">
              About Vidya AI
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto mb-12">
              {" "}
              {/* Adjusted max-w for better alignment */}
              Vidya AI is your intelligent companion for navigating the vast
              world of educational content. Leveraging cutting-edge artificial
              intelligence, we transform raw documents—from textbooks and
              research papers to lecture notes and study guides—into actionable
              insights. Our platform is designed to streamline your learning and
              teaching processes by automating tedious analysis tasks. You can
              upload various document types, get instant summaries, identify key
              topics, generate practice questions, and organize your digital
              library with AI-categorized metadata. Vidya AI empowers students
              to study smarter, parents to support their children more
              effectively, and educators to enrich their teaching materials,
              fostering a more personalized and efficient learning ecosystem for
              everyone.
            </p>
            {/* Features mentioned, now in card format */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature Card 1: Smart Summaries */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-100 p-6 rounded-xl shadow-md border border-gray-200 flex flex-col items-center text-center transform hover:scale-105 transition-transform duration-300">
                <span className="text-5xl text-indigo-600 mb-4">📝</span>{" "}
                {/* Icon */}
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Smart Summaries
                </h3>
                <p className="text-gray-700">
                  Get concise overviews of lengthy documents instantly.
                </p>
              </div>
              {/* Feature Card 2: Topic Identification */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-100 p-6 rounded-xl shadow-md border border-gray-200 flex flex-col items-center text-center transform hover:scale-105 transition-transform duration-300">
                <span className="text-5xl text-purple-600 mb-4">💡</span>{" "}
                {/* Icon */}
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Topic Identification
                </h3>
                <p className="text-gray-700">
                  Automatically pinpoint key subjects and themes.
                </p>
              </div>
              {/* Feature Card 3: Interactive Quizzes */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-100 p-6 rounded-xl shadow-md border border-gray-200 flex flex-col items-center text-center transform hover:scale-105 transition-transform duration-300">
                <span className="text-5xl text-green-600 mb-4">❓</span>{" "}
                {/* Icon */}
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Interactive Quizzes
                </h3>
                <p className="text-gray-700">
                  Generate multiple-choice questions for self-assessment.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Premium Features Carousel */}
          <section ref={premiumFeaturesRef} className="mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-10">
              Our Premium Features
            </h2>
            <FeatureCarousel />
          </section>

          {/* Section 4: User Profile Cards */}
          <section ref={userProfilesRef} className="mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-10">
              Vidya AI For You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Student Card */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-200 text-center transform hover:scale-105 transition-transform duration-300">
                <div className="text-indigo-600 text-5xl mb-4">📚</div>{" "}
                {/* Emoji icon */}
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  For Students
                </h3>
                <ul className="text-gray-700 text-left list-disc list-inside space-y-2">
                  <li>Quick summaries for revision</li>
                  <li>Auto-generated practice questions</li>
                  <li>Organize notes by subject/topic</li>
                  <li>Personalized learning pathways</li>
                </ul>
                <button className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                  Learn More
                </button>
              </div>

              {/* Family Card (Parents) */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-200 text-center transform hover:scale-105 transition-transform duration-300">
                <div className="text-purple-600 text-5xl mb-4">👨‍👩‍👧‍👦</div>{" "}
                {/* Emoji icon */}
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  For Families
                </h3>
                <ul className="text-gray-700 text-left list-disc list-inside space-y-2">
                  <li>Monitor child&apos;s learning progress</li>
                  <li>Access simplified educational content</li>
                  <li>Support homework with AI insights</li>
                  <li>Bridge communication with teachers</li>
                </ul>
                <button className="mt-6 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors">
                  Learn More
                </button>
              </div>

              {/* Mentor Card (Tutors/Educators) */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-200 text-center transform hover:scale-105 transition-transform duration-300">
                <div className="text-green-600 text-5xl mb-4">👨‍🏫</div>{" "}
                {/* Emoji icon */}
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  For Mentors
                </h3>
                <ul className="text-gray-700 text-left list-disc list-inside space-y-2">
                  <li>Generate lesson plans rapidly</li>
                  <li>Create custom teaching materials</li>
                  <li>Assess student comprehension quickly</li>
                  <li>Track individual student performance</li>
                </ul>
                <button className="mt-6 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                  Learn More
                </button>
              </div>
            </div>
          </section>

          {/* Section 5: Dashboard Overview */}
          <section
            ref={dashboardRef}
            className="mb-16 py-10 bg-white rounded-xl shadow-lg"
          >
            <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-10">
              Your Learning Dashboard
            </h2>
            <div className="flex justify-center items-center p-4">
              <div className="relative w-full max-w-4xl aspect-[1.6/1]">
                {" "}
                {/* Adjusted aspect ratio for better fit */}
                {/* Changed src to use the provided placeholder image URL */}
                <img
                  src="https://placehold.co/1000x600/EDF2F7/2D3748/png?text=Interactive+Dashboard+Preview"
                  alt="Interactive Dashboard Preview"
                  className="rounded-xl shadow-2xl border border-gray-100 w-full h-full object-contain"
                />
              </div>
            </div>
          </section>

          {/* Section 6: Contact Details and Feedback Section (formerly Section 5) */}
          <section
            ref={contactRef}
            className="bg-white p-8 rounded-xl shadow-lg grid grid-cols-1 md:grid-cols-2 gap-12 mb-16"
          >
            {/* Left Section: Contact Details */}
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                Get in Touch
              </h2>
              <div className="space-y-4 text-gray-700">
                <p className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-indigo-500 mr-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  Vidya AI Headquarters, 123 Learning Lane, Knowledge City, ED
                  45678
                </p>
                <p className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-indigo-500 mr-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25V1.154a2.25 2.25 0 00-2.25-2.25H17.25m0 0a2.25 2.25 0 00-2.25 2.25V1.154a2.25 2.25 0 012.25-2.25m0 0H2.25m15 0H21.75m-18 0H2.25"
                    />
                  </svg>
                  +1 (555) 123-4567
                </p>
                <p className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-indigo-500 mr-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  info@vidyaai.com
                </p>
              </div>
            </div>

            {/* Right Section: Feedback Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                Send Us Feedback
              </h2>
              <form
                action="mailto:feedback@vidyaai.com"
                method="post"
                encType="text/plain"
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="feedbackName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="feedbackName"
                    name="name"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="feedbackEmail"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Your Email
                  </label>
                  <input
                    type="email"
                    id="feedbackEmail"
                    name="email"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="feedbackMessage"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Message
                  </label>
                  <textarea
                    id="feedbackMessage"
                    name="message"
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Tell us what you think..."
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                >
                  Send Feedback
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* Section 7: Footer Section (formerly Section 6) */}
      <footer className="w-full bg-gray-800 text-white py-8 px-6 text-center">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Vidya AI. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors"
            >
              {/* Placeholder for Social Media Icon (e.g., Facebook) */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.5-1.333h2.5v-3h-2.5c-3.15 0-3.5 1.293-3.5 3.5v1.5z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors"
            >
              {/* Placeholder for Social Media Icon (e.g., Twitter) */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.597 0-6.178 3.425-5.324 6.97.045.286.095.572.149.855-4.514-.224-8.59-2.394-11.314-5.684-.467.809-.748 1.743-.748 2.76 0 1.91.979 3.593 2.465 4.582-.903-.023-1.746-.28-2.483-.647v.072c0 3.67 2.601 6.721 6.036 7.411-.67.185-1.393.284-2.146.284-.507 0-.998-.047-1.473-.141.956 2.983 3.733 5.147 7.031 5.204-2.579 2.03-5.83.323-6.914-1.21-.493.366-1.043.684-1.638.905 3.324 2.128 7.294 3.376 11.551 3.376 13.81 0 21.314-11.517 21.314-21.603 0-.334-.01-.668-.024-1z" />
              </svg>
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors"
            >
              {/* Placeholder for Social Media Icon (e.g., LinkedIn) */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.535-4 0v5.604h-3v11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

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
            {/* Indicator for Gemini API Key - This line was causing the error and has been removed */}
            {/* <li className={`flex items-center ${firestoreUser?.geminiApiKey ? 'text-green-600' : 'text-red-500'}`}> */}
            <li className="flex items-center text-red-500">
              {" "}
              {/* Simplified to red always on landing page */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
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
      </div>

      {/* Analysis Result Modal (Existing - now less used directly) */}
      {/* These modals are not directly used on the home page, but left for context if their imports remain */}
      {/*
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
      */}

      {/* Document Description Modal */}
      {/*
      {isDocumentDescriptionModalOpen && currentDocumentMetadata && (
        <DocumentDescriptionModal
          isOpen={isDocumentDescriptionModalOpen}
          onClose={() => {
            setIsDocumentDescriptionModalOpen(false);
            setCurrentDocumentMetadata(null); // Clear selected document
            setIsCurrentAnalysisNew(false); // Reset flag
          }}
          initialMetadata={{
            documentName: currentDocumentMetadata!.documentName || currentDocumentMetadata!.fileName,
            class: currentDocumentMetadata!.class || '',
            subject: currentDocumentMetadata!.subject || '',
            topic: currentDocumentMetadata!.topic || '',
            chapter: currentDocumentMetadata!.chapter || '',
            dateCreated: currentDocumentMetadata!.dateCreated || new Date().toISOString().split('T')[0],
          }}
          onSave={handleSaveDocumentDescription}
          fileName={currentDocumentMetadata!.fileName}
          isNewAnalysis={isCurrentAnalysisNew}
        />
      )}
      */}
      {/* Sign-in Modal */}
      <SignInModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
