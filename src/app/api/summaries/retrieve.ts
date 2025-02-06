import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { MongoClient } from "mongodb";

// ✅ MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db("meeting-notes-ai");
const summariesCollection = db.collection("summaries");

export async function GET(req: Request) {
  try {
    const nextRequest = new NextRequest(req);
    const token = await getToken({ req: nextRequest });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSummaries = await summariesCollection
      .find({ userId: token.sub })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ summaries: userSummaries });
  } catch (error) {
    console.error("❌ Error retrieving summaries:", error);
    return NextResponse.json({ error: "Failed to retrieve summaries" }, { status: 500 });
  }
}
