"use client";

import { useState } from "react";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadMessage(`✅ File uploaded: ${data.fileUrl}`);
      } else {
        setUploadMessage(`❌ Upload failed: ${data.error}`);
      }
    } catch (error) {
      setUploadMessage(`❌ Error: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Upload Google Meet Recording</h1>
      <input type="file" onChange={handleFileChange} />
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {uploadMessage && <p className="mt-4">{uploadMessage}</p>}
    </div>
  );
}
