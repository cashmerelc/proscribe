import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { MongoClient } from "mongodb";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db("proscribe");
const transcriptsCollection = db.collection("transcripts");

// ✅ Authenticate Google Drive API using Service Account
const auth = new google.auth.GoogleAuth({
  keyFile: "./service-account.json", // Replace with actual key path
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

// ✅ Function to extract Google Drive file ID
function getGoogleDriveFileId(url: string) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return match ? match[1] : null;
}

// ✅ Function to fetch file metadata & download URL using OAuth
async function getGoogleDriveFile(fileId: string) {
  const metadataResponse = await drive.files.get({
    fileId,
    fields: "name,mimeType,size",
  });

  if (!metadataResponse.data) throw new Error("Failed to fetch file metadata");
  console.log("🔹 Google Drive File Metadata:", metadataResponse.data);

  // Ensure it's an audio or video file
  const mimeType = metadataResponse.data.mimeType || ""; // ✅ Ensure it's never null

if (!mimeType.startsWith("audio/") && !mimeType.startsWith("video/")) {
    throw new Error(`Invalid file type: ${mimeType}. Whisper only accepts audio/video files.`);
}

  // Download the file
  const fileResponse = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return { fileResponse, metadata: metadataResponse.data };
}

export async function POST(req: Request) {
  try {
    const nextRequest = new NextRequest(req);
    const token = await getToken({ req: nextRequest });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileUrl } = await nextRequest.json();
    if (!fileUrl) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    console.log("🔹 Checking Whisper API before downloading file...");

    // ✅ Ensure OpenAI Whisper API is reachable
    try {
      const testResponse = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });

      if (!testResponse.ok) {
        throw new Error("Failed to connect to OpenAI API");
      }

      console.log("✅ Whisper API is reachable.");
    } catch (err) {
      console.error("❌ Whisper API is not reachable:", err);
      return NextResponse.json({ error: "Cannot reach OpenAI API" }, { status: 500 });
    }

    console.log("🔹 Original file URL:", fileUrl);

    // ✅ Extract Google Drive File ID
    const fileId = getGoogleDriveFileId(fileUrl);
    if (!fileId) throw new Error("Invalid Google Drive file URL");

    // ✅ Fetch file from Google Drive using OAuth
    const { fileResponse, metadata } = await getGoogleDriveFile(fileId);

    const fileSize = metadata.size ? Number(metadata.size) : 0;

console.log("🔹 File size (MB):", (fileSize / (1024 * 1024)).toFixed(2));

if (fileSize === 0) {
    console.error("❌ Error: File size is missing or invalid.");
    return NextResponse.json({ error: "Invalid file size from Google Drive." }, { status: 400 });
}

    console.log("🔹 File MIME type:", metadata.mimeType);

    // ✅ Save MOV File Temporarily
    // ✅ Ensure name is always a valid string
const fileName = metadata.name ?? "unknown_file";

const tempMovPath = path.join("/tmp", fileName);
console.log(`🔹 MOV file saved as: ${tempMovPath}`);

    const fileStream = fs.createWriteStream(tempMovPath);

    await new Promise((resolve, reject) => {
      fileResponse.data.pipe(fileStream);
      fileStream.on("finish", () => resolve);
      fileStream.on("error", reject);
    });

    console.log(`🔹 MOV file saved: ${tempMovPath}`);

    // ✅ Convert MOV to MP3
    const tempMp3Path = tempMovPath.replace(".mov", ".mp3");

    await new Promise((resolve, reject) => {
      ffmpeg(tempMovPath)
        .output(tempMp3Path)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    console.log(`🔹 MOV converted to MP3: ${tempMp3Path}`);

    // ✅ Get the MP3 file size after conversion
const mp3Stats = fs.statSync(tempMp3Path);
console.log("🔹 MP3 File Size (MB):", (mp3Stats.size / (1024 * 1024)).toFixed(2));

// ✅ Check if file is too large before sending
if (mp3Stats.size > 25 * 1024 * 1024) {
  console.error("❌ MP3 file is too large for Whisper API (max 25MB).");
  return NextResponse.json({ error: "File too large for Whisper API (max 25MB)" }, { status: 400 });
}

ffmpeg.ffprobe(tempMp3Path, (err, metadata) => {
    if (err) {
      console.error("❌ FFmpeg Error Checking MP3 File:", err);
    } else {
      console.log("🔹 MP3 File Metadata:", metadata.format);
    }
  });

  let transcriptText = "";

    try {
        console.log("🔹 Sending MP3 file to Whisper API...");
        
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempMp3Path),
          model: "whisper-1",
          response_format: "json",
        });
      
        console.log("✅ Transcription successful!");

        transcriptText = transcription.text ?? "";

        if (!transcriptText) {
        console.error("❌ Error: Whisper API returned no transcript.");
        return NextResponse.json({ error: "No transcript generated." }, { status: 500 });
        }
      } catch (error: any) {
        console.error("❌ Whisper API Error:", error);
        return NextResponse.json({ error: "Whisper API Failed", details: error.message }, { status: 500 });
      }
      

    // ✅ Save transcript to MongoDB
    await transcriptsCollection.insertOne({
      userId: token.sub,
      fileUrl,
      transcript: transcriptText,
      createdAt: new Date(),
    });

    // ✅ Delete Temp Files
    fs.unlinkSync(tempMovPath);
    fs.unlinkSync(tempMp3Path);

    return NextResponse.json({ message: "Transcription complete", transcript: transcriptText });
  } catch (error: any) {
    console.error("❌ Transcription error:", error.message || error);
    return NextResponse.json({ error: "Failed to transcribe", details: error.message }, { status: 500 });
  }
}
