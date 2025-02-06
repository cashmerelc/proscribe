import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { MongoClient } from "mongodb";

// ✅ Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ✅ MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db("meeting-notes-ai");
const summariesCollection = db.collection("summaries");

export async function POST(req: Request) {
  try {
    const nextRequest = new NextRequest(req);
    const token = await getToken({ req: nextRequest });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transcription } = await nextRequest.json();
    if (!transcription) {
      return NextResponse.json({ error: "No transcription provided" }, { status: 400 });
    }

    console.log("🔹 Sending transcription to GPT-4 for summarization...");

    // ✅ GPT-4 Summarization Prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that extracts key information from meeting transcripts.",
        },
        {
          role: "user",
          content: `Summarize this meeting transcript into:
          
          1. Key decisions made
          2. Action items
          3. Next steps
          
          Transcription: """${transcription}"""`,
        },
      ],
      temperature: 0.3,
    });

    const summaryText = response.choices[0]?.message?.content ?? "";

    if (!summaryText) {
      console.error("❌ Error: GPT-4 returned an empty summary.");
      return NextResponse.json({ error: "No summary generated." }, { status: 500 });
    }

    console.log("✅ Summary successfully generated!");

    // ✅ Save summary to MongoDB
    const summaryData = {
      userId: token.sub,
      summary: summaryText,
      createdAt: new Date(),
    };

    await summariesCollection.insertOne(summaryData);

    return NextResponse.json({ message: "Summarization complete", summary: summaryText });
  } catch (error: any) {
    console.error("❌ Summarization error:", error.message || error);
    return NextResponse.json({ error: "Failed to summarize", details: error.message }, { status: 500 });
  }
}
