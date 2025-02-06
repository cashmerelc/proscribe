"use client";

import { useEffect, useState } from "react";

export default function TranscribePage() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedFileUrl, setSelectedFileUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const res = await fetch("/api/meetings/recordings");
        if (!res.ok) throw new Error("Failed to fetch recordings");
        const data = await res.json();
        setRecordings(data);
      } catch (err: any) {
        console.error("Error fetching recordings:", err);
      }
    };

    fetchRecordings();
  }, []);

  const handleTranscribe = async () => {
    if (!selectedFileUrl) {
      setError("Please select a recording.");
      return;
    }

    setLoading(true);
    setError("");
    setTranscript("");

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // ✅ Send JSON instead of FormData
        },
        body: JSON.stringify({ fileUrl: selectedFileUrl }), // ✅ Send file URL as JSON
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to transcribe");
      }

      setTranscript(data.transcript);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Transcribe Meeting Recordings</h1>

      {recordings.length === 0 ? (
        <p>No recordings found.</p>
      ) : (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Select a Recording:</h2>
          <select
            className="w-full p-2 border rounded"
            onChange={(e) => setSelectedFileUrl(e.target.value)}
          >
            <option value="">-- Choose a recording --</option>
            {recordings.map((rec) => (
              <option key={rec.id} value={rec.webViewLink}>
                {rec.name} ({new Date(rec.createdTime).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={handleTranscribe}
        disabled={loading || !selectedFileUrl}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg"
      >
        {loading ? "Transcribing..." : "Start Transcription"}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
      {transcript && (
        <div className="mt-6 p-4 border rounded bg-gray-100">
          <h2 className="text-xl font-bold">Transcript:</h2>
          <p className="mt-2">{transcript}</p>
        </div>
      )}
    </div>
  );
}
