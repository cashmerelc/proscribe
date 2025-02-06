import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function GET(req: Request) {
  const nextRequest = new NextRequest(req); // Convert Web API Request to NextRequest

  const token = await getToken({ req: nextRequest });

  if (!token || typeof token.accessToken !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!
  );

  const refreshToken =
    typeof token.refreshToken === "string" ? token.refreshToken : undefined;

  auth.setCredentials({
    access_token: token.accessToken,
    refresh_token: refreshToken,
  });

  const drive = google.drive({ version: "v3", auth });

  try {
    const res = await drive.files.list({
        q: "(mimeType='video/mp4' or mimeType='video/quicktime') and 'me' in owners",
        fields: "files(id, name, mimeType, webViewLink, createdTime)",
    });

    return NextResponse.json(res.data.files);
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}
