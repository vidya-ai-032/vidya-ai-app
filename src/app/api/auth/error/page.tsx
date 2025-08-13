// src/app/auth/error/page.tsx
"use client"; // This is a client component

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signOut, signIn } from "next-auth/react";

/**
 * This page handles various authentication-related errors,
 * such as OAuthAccountNotLinked.
 */
export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const email = searchParams.get("email");

  const [errorMessage, setErrorMessage] = useState(
    "An unexpected error occurred."
  );

  useEffect(() => {
    if (error === "OAuthAccountNotLinked") {
      setErrorMessage(
        `An account with the email address "${
          email || "your email"
        }" already exists but is not linked to your Google account. Please sign in with your existing account first, or try signing in with a different email.`
      );
    } else if (error) {
      // Basic sanitization for displaying the error name
      setErrorMessage(
        `Authentication error: ${error.replace(/([A-Z])/g, " $1").trim()}.`
      );
    }
  }, [error, email]);

  const handleSignOut = async () => {
    // This performs a clean logout from NextAuth session.
    // Setting callbackUrl to '/' ensures redirection to your homepage after logout.
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const handleTryAgain = async () => {
    // 1. Force a sign out from the current NextAuth session first.
    // We set redirect: false because we want to manually control the next step (Google sign-in).
    await signOut({ redirect: false });

    // 2. Introduce a small delay to ensure the signOut process is initiated.
    // This is a common workaround for race conditions in client-side auth flows.
    await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

    // 3. Redirect directly to Google's OAuth endpoint with 'prompt=select_account'.
    // This method is the most reliable for prompting Google's account chooser.
    // We construct the URL manually to ensure 'prompt' parameter is included.
    const googleSignInUrl = `/api/auth/signin/google?prompt=select_account&callbackUrl=${encodeURIComponent(
      window.location.origin + "/library"
    )}`;
    window.location.href = googleSignInUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-8">{errorMessage}</p>
        <div className="space-y-4">
          <button
            onClick={handleTryAgain}
            className="inline-block w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
          >
            Try Signing In with a Different Account
          </button>
          <p className="text-sm text-gray-500 mt-2">
            (This will ask Google to show account selection if you have multiple
            accounts logged in.)
          </p>
          <button
            onClick={handleSignOut}
            className="inline-block w-full px-6 py-3 border border-red-500 text-red-500 font-medium rounded-lg shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
          >
            Sign Out
          </button>
          <p className="text-sm text-gray-500 mt-2">
            (This will clear your Vidya AI session and redirect to the
            homepage.)
          </p>
          <Link
            href="/"
            className="inline-block w-full px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          >
            Go to Home Page
          </Link>
        </div>
      </div>
    </div>
  );
}
