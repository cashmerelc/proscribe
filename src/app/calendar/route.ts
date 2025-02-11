import { google } from "googleapis";
import { NextResponse } from "next/server";

const auth = new google.auth.GoogleAuth({
  keyFile: "./service-account.json",
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

export async function GET(req: Request) {
  try {
    const calendar = google.calendar({ version: "v3", auth });
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // 🔹 Fetch upcoming Google Meet events
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: oneHourLater.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items || [];

    // 🔹 Ensure bot automatically accepts meetings
    for (let event of events) {
      if (event.attendees) {
        for (let attendee of event.attendees) {
          if (attendee.email === process.env.BOT_EMAIL && attendee.responseStatus !== "accepted") {
            await calendar.events.patch({
              calendarId: "primary",
              eventId: event.id,
              requestBody: {
                attendees: [{ email: process.env.BOT_EMAIL, responseStatus: "accepted" }],
              },
            });
            console.log(`✅ Bot accepted invite for: ${event.summary}`);
          }
        }
      }
    }

    const meetLinks = events.map((event) => ({
      id: event.id,
      summary: event.summary,
      startTime: event.start?.dateTime,
      meetLink: event.conferenceData?.entryPoints?.[0]?.uri || null,
    }));

    return NextResponse.json({ meetings: meetLinks });
  } catch (error) {
    console.error("❌ Error fetching calendar events:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}
