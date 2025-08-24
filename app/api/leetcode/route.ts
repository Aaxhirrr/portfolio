import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUERY = `
query userRecentSubmissions($username: String!) {
  recentSubmissionList(username: $username) {
    id
    title
    titleSlug
    lang
    timestamp
    statusDisplay
  }
}
`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user") || "";
  const limit = Number(searchParams.get("limit") || 4);

  if (!user) {
    return new NextResponse(JSON.stringify({ items: [] }), {
      status: 400,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  const resp = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    cache: "no-store",
    // @ts-ignore next: is fine in Next fetch
    next: { revalidate: 0 },
    headers: {
      "content-type": "application/json",
      // these two help LC avoid some CDN weirdness
      referer: "https://leetcode.com/",
      origin: "https://leetcode.com",
    },
    body: JSON.stringify({ query: QUERY, variables: { username: user } }),
  });

  // LeetCode can sometimes return HTML on rate limits – guard it
  let data: any = null;
  try {
    data = await resp.json();
  } catch {
    data = { data: { recentSubmissionList: [] } };
  }

  const rows = Array.isArray(data?.data?.recentSubmissionList)
    ? data.data.recentSubmissionList
    : [];

  const items = rows.slice(0, limit).map((r: any) => ({
    id: String(r.id ?? `${r.titleSlug}-${r.timestamp}`),
    title: r.title,
    slug: r.titleSlug,
    status: r.statusDisplay ?? "—",
    lang: r.lang ?? "—",
    ts: Number(r.timestamp ?? 0), // seconds
  }));

  return new NextResponse(JSON.stringify({ items }), {
    headers: {
      "content-type": "application/json",
      // absolutely no caching
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      pragma: "no-cache",
      expires: "0",
    },
  });
}
