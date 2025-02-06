"use client";

import { useState, useEffect } from "react";

export default function TranscriptionPage() {
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [selectedTranscription, setSelectedTranscription] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Fetch transcriptions on page load
  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        const response = await fetch("/api/transcriptions");
        const data = await response.json();
        setTranscriptions(data.transcriptions);
      } catch (error) {
        console.error("Failed to fetch transcriptions:", error);
      }
    };
    fetchTranscriptions();
  }, []);

  // ✅ Summarize the selected transcription
  const handleSummarize = async () => {
    if (!selectedTranscription) return;

    setLoading(true);
    setSummary(""); // Clear previous summary

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: selectedTranscription }),
      });

      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
      } else {
        setSummary(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Summarization failed:", error);
      setSummary("❌ Failed to generate summary. Please try again.");
    }

    setLoading(false);
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Available Transcriptions</h1>

      {transcriptions.length === 0 ? (
        <p>No transcriptions available.</p>
      ) : (
        <ul className="border rounded-md p-4 mb-4">
          {transcriptions.map((t, index) => (
            <li
              key={index}
              className={`p-2 cursor-pointer ${
                selectedTranscription === t.transcript ? "bg-blue-200" : "hover:bg-gray-100"
              }`}
              onClick={() => setSelectedTranscription(t.transcript)}
            >
              📝 {t.fileUrl.split("/").pop()} - {new Date(t.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleSummarize}
        disabled={loading || !selectedTranscription}
        className="mt-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? "Summarizing..." : "Generate Summary"}
      </button>

      {summary && (
        <div className="mt-6 p-4 border rounded-md bg-gray-100">
          <h2 className="text-lg font-semibold mb-2">AI Summary</h2>
          <pre className="whitespace-pre-wrap">{summary}</pre>
        </div>
      )}
    </main>
  );
}
