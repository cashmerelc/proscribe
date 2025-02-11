import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { MongoClient } from "mongodb";

// ✅ MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db("proscribe");
const transcriptionsCollection = db.collection("transcripts");

export async function GET(req: Request) {
  try {
    const nextRequest = new NextRequest(req); // ✅ Wrap Request into NextRequest
    const token = await getToken({ req: nextRequest });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transcriptions = await transcriptionsCollection
      .find({ userId: token.sub })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ transcriptions });
  } catch (error) {
    console.error("❌ Error retrieving transcriptions:", error);
    return NextResponse.json({ error: "Failed to retrieve transcriptions" }, { status: 500 });
  }
}
