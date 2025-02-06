import { NextResponse } from "next/server";
import { bucket } from "@/lib/firebase";
import multer from "multer";
import { Readable } from "stream";

// Configure Multer Storage (Stores file in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Function to extract filename from formData (since Blob does not have a `.name` property)
function generateFileName(fileType: string) {
  const extension = fileType.split("/")[1] || "bin"; // Default to "bin" if no extension found
  return `uploaded-file-${Date.now()}.${extension}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Generate a filename manually (since Blob does not have a `.name`)
    const fileType = file.type || "application/octet-stream";
    const fileName = generateFileName(fileType);

    // Convert Blob to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Firebase Storage
    const firebaseFile = bucket.file(`uploads/${fileName}`);

    await firebaseFile.save(buffer, {
      metadata: { contentType: fileType },
    });

    // Generate a public URL
    const [publicUrl] = await firebaseFile.getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    return NextResponse.json({ message: "File uploaded", url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
