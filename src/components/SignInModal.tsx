// src/components/SignInModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { auth } from "../lib/firebase/firebase"; // Import Firebase Auth instance
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"; // Import GoogleAuthProvider and signInWithPopup

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SignInModal component displays a welcome message and prompts the user to sign in with Google.
 * It uses Firebase Authentication's signInWithPopup for Google login.
 */
const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter(); // Initialize router

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Optionally, force account selection (good for testing different accounts)
      // provider.setCustomParameters({ prompt: 'select_account' });

      await signInWithPopup(auth, provider);
      console.log("Firebase Google Sign-in successful!");
      // Redirect to /library after successful login
      router.push("/library");
      onClose(); // Close the modal on successful sign-in
    } catch (error: any) {
      console.error("Firebase Google Sign-in error:", error);
      // Handle specific Firebase auth errors if needed
      let errorMessage = "An unknown error occurred during sign-in.";
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup closed. Please try again.";
      } else if (error.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in already in progress or popup blocked.";
      } else if (
        error.code === "auth/account-exists-with-different-credential"
      ) {
        errorMessage =
          "An account with this email already exists with different credentials. Please sign in with your original method or link accounts.";
      }
      // Show a user-friendly message, potentially in a temporary message box
      // For now, an alert (to be replaced with a proper UI modal later)
      alert(`Sign-in failed: ${errorMessage}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full relative transform transition-all duration-300 scale-100 opacity-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
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

        {/* Vidya AI Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="https://placehold.co/48x48/667EEA/ffffff?text=V" // Placeholder for Vidya AI logo
            alt="Vidya AI Logo"
            width={48}
            height={48}
            className="rounded-full"
          />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Welcome to Vidya AI
        </h2>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Sign in to start your learning journey with AI-powered educational
          content analysis
        </p>

        {/* Continue with Google Button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
        >
          <img
            src="https://www.svgrepo.com/show/353521/google-icon.svg" // Google icon SVG
            alt="Google icon"
            width={20}
            height={20}
            className="mr-3"
          />
          Continue with Google
        </button>

        {/* Terms and Privacy Policy */}
        <p className="mt-6 text-xs text-center text-gray-500">
          By signing in, you agree to our{" "}
          <a href="#" className="text-indigo-600 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-indigo-600 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignInModal;
