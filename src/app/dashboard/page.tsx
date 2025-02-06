"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") return <p>Loading...</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Welcome, {session?.user?.name}!</h1>
      <button
        onClick={() => signOut()}
        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg"
      >
        Sign Out
      </button>
    </div>
  );
}
