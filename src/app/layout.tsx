// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
// NextAuth related imports are removed:
// import SessionProvider from '../components/SessionProvider';
// import { getServerSession } from 'next-auth';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vidya AI",
  description: "AI-Powered Educational Content Analysis",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No getServerSession needed with Firebase Auth direct integration
  // const session = await getServerSession();

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* SessionProvider is removed. Firebase Auth handles session internally. */}
        {/* <SessionProvider session={session}> */}
        {children}
        {/* </SessionProvider> */}
      </body>
    </html>
  );
}
