// app/api/activity/leetcode/route.ts
import { NextResponse } from "next/server";

/**
 * Defensive LeetCode "recent submissions" route.
 * - Query params: ?user=<username>&limit=<n>
 * - Always returns JSON: { items: [...], error?: string, debug?: string }
 *
 * NOTE: LeetCode may block scraping or change their endpoints. This route
 * attempts two strategies then returns an empty list + error message if both fail.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = (url.searchParams.get("user") || "").trim();
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || "4")));

  if (!user) {
    return NextResponse.json({ items: [], error: "missing user param" });
  }

  // helper to produce a consistent JSON response
  const ok = (items: any[], opts?: { error?: string; debug?: string }) =>
    NextResponse.json({ items: items.slice(0, limit), ...opts });

  // small helper to create a user-agent header (some sites reject empty UA)
  const DEFAULT_HEADERS: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (compatible; PortfolioBot/1.0; +https://example.com)",
    Referer: "https://leetcode.com/",
  };

  // 1) Try LeetCode GraphQL recent submissions (public; may be rate-limited or change)
  try {
    // GraphQL query used by many scrapers — if it changes this may stop working.
    const gqlQuery = {
      query:
        `query recentSubmissions($username: String!) {
           recentSubmissionList(username: $username) {
             id
             title
             titleSlug
             lang
             statusDisplay
             timestamp
           }
         }`,
      variables: { username: user },
    };

    const res = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...DEFAULT_HEADERS,
      },
      body: JSON.stringify(gqlQuery),
      // server-side fetch; no CORS issues
    });

    const text = await res.text();

    // if we got back HTML, bail early so we can try fallback
    if (!text.trim().startsWith("{")) {
      // debugging: preserve snippet so front-end can show it if needed
      // (but do not include huge HTML dumps in production)
      const snippet = text.slice(0, 800);
      // try fallback below
      console.warn("LeetCode GraphQL returned non-JSON (snippet):", snippet);
      // continue to fallback attempt
    } else {
      const parsed = JSON.parse(text);
      const list = parsed?.data?.recentSubmissionList;
      if (Array.isArray(list) && list.length) {
        const items = list.map((s: any) => ({
          id: s.id ?? `${s.titleSlug}-${s.timestamp ?? Math.random()}`,
          title: s.title ?? s.titleSlug,
          slug: s.titleSlug,
          status: s.statusDisplay ?? s.status,
          lang: s.lang ?? s.language,
          ts: s.timestamp ?? s.create_time,
        }));
        return ok(items, { debug: "graphql" });
      }
      // if empty array, fallthrough to fallback attempt
    }
  } catch (e: any) {
    console.error("LeetCode GraphQL fetch error:", e?.message || e);
    // continue to fallback
  }

  // 2) Fallback: try the (older / unofficial) submissions API endpoint
  // Example: https://leetcode.com/api/submissions/<username>/?offset=0&limit=20
  try {
    const apiUrl = `https://leetcode.com/api/submissions/${encodeURIComponent(user)}/?offset=0&limit=${limit}`;
    const res = await fetch(apiUrl, {
      headers: { ...DEFAULT_HEADERS },
    });

    const contentType = res.headers.get("content-type") || "";

    // If the route returned HTML (login/Cloudflare/Next page), capture snippet
    const raw = await res.text();
    if (!contentType.includes("application/json")) {
      console.warn("LeetCode submissions API returned non-JSON. snippet:", raw.slice(0, 800));
      // Return an informative JSON instead of HTML so front-end doesn't explode
      return ok([], {
        error:
          "LeetCode returned a non-JSON response (likely blocked or changed). Open the API for raw output in the UI.",
        debug: raw.slice(0, 1200),
      });
    }

    const j = JSON.parse(raw);
    // different shapes have been used historically; try common keys
    const submissions =
      j.submissions ||
      j.subs ||
      j.recent_submissions ||
      j.submission_list ||
      j?.data?.submissions ||
      [];

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return ok([], {
        error: "No submissions found (LeetCode API shape changed or user has no recent submissions)",
      });
    }

    const items = submissions.slice(0, limit).map((s: any) => ({
      id:
        s.id ??
        s.submission_id ??
        `${s.titleSlug ?? s.title}_${s.timestamp ?? Math.random()}`,
      title: s.title ?? s.titleSlug ?? s.translated_title ?? "unknown",
      slug: s.titleSlug ?? s.question__title_slug ?? s.translated_title_slug,
      status:
        s.status_display ??
        s.status ??
        s.result ??
        (s.accepted ? "Accepted" : s.runtime ? "Runtime" : "Unknown"),
      lang: s.lang ?? s.language ?? s.language_display ?? "—",
      ts: s.timestamp ?? s.time ?? s.create_time,
    }));

    return ok(items, { debug: "submissions_api" });
  } catch (e: any) {
    console.error("LeetCode submissions API fetch error:", e?.message || e);
  }

  // If we couldn't fetch anything useful, return an empty list + explanation (still JSON)
  return ok([], {
    error:
      "Unable to fetch LeetCode submissions. The site may be blocking scraping or the API changed. Check server logs for details.",
  });
}
