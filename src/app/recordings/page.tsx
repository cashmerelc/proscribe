"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function RecordingsPage() {
  const { data: session, status } = useSession();
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchRecordings();
    }
  }, [session]);

  const fetchRecordings = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/meetings/recordings");
      if (!res.ok) throw new Error("Failed to fetch recordings");

      const data = await res.json();
      setRecordings(data);
    } catch (err: any) {
      console.error("Error fetching recordings:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">Sign in to view your recordings</h1>
        <button
          onClick={() => signIn("google")}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Google Meet Recordings</h1>

      {loading && <p>Loading recordings...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {recordings.length === 0 && !loading && !error ? (
        <p>No recordings found</p>
      ) : (
        <ul className="space-y-4">
          {recordings.map((rec) => (
            <li key={rec.id} className="p-4 bg-gray-100 rounded-lg">
              <a
                href={rec.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {rec.name} ({new Date(rec.createdTime).toLocaleString()})
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
