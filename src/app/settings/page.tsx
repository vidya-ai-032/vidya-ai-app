// src/app/settings/page.tsx
"use client"; // This directive marks it as a client component

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image"; // For user avatar
import { auth, db } from "../../lib/firebase/firebase"; // Import Firebase Auth and Firestore instances
import {
  onAuthStateChanged,
  User as FirebaseAuthUser,
  signOut as firebaseSignOut,
} from "firebase/auth"; // Import Firebase Auth methods and User type
import { doc, getDoc, setDoc } from "firebase/firestore"; // Import Firestore functions
import Link from "next/link"; // Import Link for navigation

// Define the interface for a User document in Firestore
interface FirestoreUser {
  uid: string; // Firebase Auth UID
  email: string;
  name?: string;
  image?: string;
  role: "student" | "parent" | "tutor"; // Default role
  schoolBoard?: string;
  grade?: string;
  language?: string;
  geminiApiKey?: string; // For BYOK (Bring Your Own Key) feature
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

/**
 * SettingsPage component allows authenticated users to manage their profile details.
 * It fetches the user's custom profile from Firestore, allows updates,
 * and includes validation for mandatory fields like the Gemini API Key.
 */
export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null); // State to hold Firebase Auth user
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(
    null
  ); // State to hold Firestore user profile
  const [loading, setLoading] = useState(true); // Loading state for authentication and data fetch
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false); // State for API key notification

  // State for user profile form fields
  const [userRole, setUserRole] = useState<string>("student");
  const [schoolBoard, setSchoolBoard] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");

  // Listen for Firebase Auth state changes and fetch/create Firestore user profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // User is logged in via Firebase Auth
        const userRef = doc(db, "users", user.uid); // Reference to the user's document in Firestore
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // User profile exists in Firestore, set it to state
          const data = userSnap.data() as FirestoreUser;
          setFirestoreUser(data);

          // Populate form fields with existing data
          setUserRole(data.role || "student");
          setSchoolBoard(data.schoolBoard || "");
          setGrade(data.grade || "");
          setLanguage(data.language || "");
          setGeminiApiKey(data.geminiApiKey || "");

          console.log("User profile fetched from Firestore:", data);

          // Only show notification if API key is missing AFTER initial fetch
          if (!data.geminiApiKey) {
            setShowApiKeyPrompt(true);
          }
        } else {
          // User profile does NOT exist in Firestore, create a new one
          const newUserProfile: FirestoreUser = {
            uid: user.uid,
            email: user.email || "",
            name: user.displayName || undefined,
            image: user.photoURL || undefined,
            role: "student", // Default role for new users
            createdAt: new Date(), // Firestore Timestamp
            updatedAt: new Date(), // Firestore Timestamp
          };
          await setDoc(userRef, newUserProfile);
          setFirestoreUser(newUserProfile);
          // Populate form fields with new default data
          setUserRole(newUserProfile.role);
          setSchoolBoard(newUserProfile.schoolBoard || "");
          setGrade(newUserProfile.grade || "");
          setLanguage(newUserProfile.language || "");
          setGeminiApiKey(newUserProfile.geminiApiKey || ""); // This will be empty for new users
          console.log("New user profile created in Firestore:", newUserProfile);

          // --- Notification: User logs in for the 1st time AND API key is missing ---
          // This will be shown on the settings page if they navigate there directly after first login
          setShowApiKeyPrompt(true);
          // --- End Notification ---
        }
      } else {
        // No user logged in, clear states and redirect
        setFirestoreUser(null);
        router.push("/");
      }
      setLoading(false); // Authentication and initial data fetch complete
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  // Handle Firebase Sign Out
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      console.log("Firebase Sign Out successful!");
      router.push("/"); // Redirect to homepage after sign out
    } catch (error) {
      console.error("Firebase Sign Out error:", error);
      alert("Failed to sign out. Please try again."); // Replace with a better UI later
    }
  };

  // Handle updating user profile in Firestore
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // --- Validation Check for Gemini API Key (Mandatory) ---
    if (!geminiApiKey.trim()) {
      // Use .trim() to catch empty spaces
      alert(
        "Gemini API Key is mandatory to use app features. Please provide your key."
      );
      return; // Stop the profile update if key is missing
    }
    // --- End Validation Check ---

    try {
      const userRef = doc(db, "users", currentUser.uid);
      const updatedProfile: Partial<FirestoreUser> = {
        role: userRole as "student" | "parent" | "tutor", // Ensure type is correct
        schoolBoard: schoolBoard,
        grade: grade,
        language: language,
        geminiApiKey: geminiApiKey, // Still save it if provided
        updatedAt: new Date(),
      };
      await setDoc(userRef, updatedProfile, { merge: true }); // Use merge: true to update specific fields
      setFirestoreUser((prev) => ({ ...prev!, ...updatedProfile })); // Update local state
      setShowApiKeyPrompt(false); // Hide prompt if key is now saved
      alert("Profile updated successfully!"); // Replace with a better UI
      console.log("User profile updated in Firestore:", updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  // Show a loading state while authentication or initial data fetch is in progress
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading user session and profile...</p>
      </div>
    );
  }

  // If not authenticated after loading, this return prevents rendering content
  if (!currentUser) {
    return null; // Or a more explicit unauthorized message if needed
  }

  // If authenticated, display the settings page content
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col">
      {/* Header/Navigation */}
      <header className="w-full bg-white shadow-sm py-4 px-6 flex justify-between items-center rounded-b-xl">
        <div className="flex items-center space-x-2">
          <img
            src="https://placehold.co/32x32/667EEA/ffffff?text=V" // Placeholder for Vidya AI Logo
            alt="Vidya AI Logo"
            className="rounded-full"
          />
          <span className="text-xl font-bold text-gray-800">Vidya AI</span>
        </div>
        <div className="flex items-center space-x-4">
          {currentUser && (
            <div className="flex items-center space-x-2">
              {currentUser.photoURL && (
                <Image
                  src={currentUser.photoURL}
                  alt="User Avatar"
                  width={32}
                  height={32}
                  className="rounded-full border border-gray-300"
                />
              )}
              <span className="text-gray-700 font-medium hidden sm:inline">
                {currentUser.email}
              </span>
            </div>
          )}
          {/* Link to Library Page */}
          <Link
            href="/library"
            className="px-4 py-2 bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-600 transition-colors"
          >
            Library
          </Link>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-10">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
          {/* Settings Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Settings
          </h1>

          {/* API Key Mandatory Notification */}
          {showApiKeyPrompt && (
            <div
              className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded"
              role="alert"
            >
              <p className="font-bold">Gemini API Key Required!</p>
              <p>
                Please provide your Gemini API Key in the "Your Profile" section
                below to enable all app features.
              </p>
            </div>
          )}

          {/* User Profile Section (moved here) */}
          <div className="mb-8 p-6 border border-gray-200 rounded-xl bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Your Profile
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label
                  htmlFor="userRole"
                  className="block text-sm font-medium text-gray-700"
                >
                  Role
                </label>
                <select
                  id="userRole"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                >
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="tutor">Tutor</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="schoolBoard"
                  className="block text-sm font-medium text-gray-700"
                >
                  School Board
                </label>
                <input
                  type="text"
                  id="schoolBoard"
                  value={schoolBoard}
                  onChange={(e) => setSchoolBoard(e.target.value)}
                  placeholder="e.g., CBSE, ICSE, State Board"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="grade"
                  className="block text-sm font-medium text-gray-700"
                >
                  Grade/Class
                </label>
                <input
                  type="text"
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., 10th, Standard V"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="language"
                  className="block text-sm font-medium text-gray-700"
                >
                  Preferred Language
                </label>
                <input
                  type="text"
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g., English, Hindi"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="geminiApiKey"
                  className="block text-sm font-medium text-gray-700"
                >
                  Gemini API Key
                </label>
                <input
                  type="password" // Use type="password" for sensitive info
                  id="geminiApiKey"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Gemini API Key for BYOK"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
              >
                Update Profile
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Environment Status (as seen in UI) */}
      <div className="fixed bottom-4 left-4 bg-white p-4 rounded-xl shadow-lg border border-gray-200 text-sm z-40">
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
          {/* Indicator for Gemini API Key - now based on presence in firestoreUser */}
          <li
            className={`flex items-center ${
              firestoreUser?.geminiApiKey ? "text-green-600" : "text-red-500"
            }`}
          >
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
            Gemini API Key
          </li>
        </ul>
      </div>
    </div>
  );
}
