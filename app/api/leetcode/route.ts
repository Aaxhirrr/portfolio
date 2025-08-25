// app/api/activity/leetcode/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = (url.searchParams.get("user") || "").trim();
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") || "4")));

  if (!user) {
    return NextResponse.json({ items: [], error: "Missing user parameter" });
  }

  // Use the reliable alfa-leetcode-api endpoint
  const apiUrl = `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(user)}/submission?limit=${limit}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "PortfolioBot/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}`);
    }

    const data = await res.json();

    // The API returns an object with a 'submission' array
    const submissions = data.submission || [];

    if (!Array.isArray(submissions)) {
        throw new Error("Invalid data structure from LeetCode API");
    }

    // Map the response to the format your frontend expects
    const items = submissions.map((s: any) => ({
      id: `${s.titleSlug}-${s.timestamp}`, // Create a unique ID
      title: s.title ?? "Unknown Problem",
      slug: s.titleSlug ?? "",
      status: s.status ?? "Unknown",
      lang: s.lang ?? "N/A",
      ts: s.timestamp,
    }));

    return NextResponse.json({ items });

  } catch (e: any) {
    console.error("Failed to fetch LeetCode submissions:", e.message);
    return NextResponse.json({
      items: [],
      error: "Unable to fetch LeetCode submissions from the API.",
      debug: e.message,
    });
  }
}