"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Sign in to Meeting Notes AI</h1>
      <button
        onClick={() => signIn("google")}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
      >
        Sign in with Google
      </button>
    </div>
  );
}
