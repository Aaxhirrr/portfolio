import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Item = { id: string; title: string; subtitle?: string; repo?: string; ts?: string };

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

  const gh = await fetch(
    `https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=${Math.max(
      10,
      limit * 3
    )}`,
    {
      cache: "no-store",
      // @ts-ignore
      next: { revalidate: 0 },
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "portfolio-activity-feed",
      },
    }
  );

  let events: any[] = [];
  try {
    events = await gh.json();
  } catch {
    events = [];
  }

  const items: Item[] = [];
  for (const e of events) {
    const repo = e.repo?.name;
    const ts = e.created_at;
    if (!repo) continue;

    if (e.type === "PushEvent") {
      const msg = e.payload?.commits?.[e.payload.commits.length - 1]?.message ?? "push";
      items.push({
        id: e.id,
        repo,
        title: "pushed commits",
        subtitle: msg,
        ts,
      });
    } else if (e.type === "CreateEvent") {
      items.push({
        id: e.id,
        repo,
        title: `created ${e.payload?.ref_type}`,
        subtitle: e.payload?.ref ?? "",
        ts,
      });
    } else if (e.type === "PullRequestEvent") {
      items.push({
        id: e.id,
        repo,
        title: `${e.payload?.action} pull request #${e.payload?.number}`,
        subtitle: e.payload?.pull_request?.title ?? "",
        ts,
      });
    } else if (e.type === "IssuesEvent") {
      items.push({
        id: e.id,
        repo,
        title: `${e.payload?.action} issue #${e.payload?.issue?.number}`,
        subtitle: e.payload?.issue?.title ?? "",
        ts,
      });
    } else if (e.type === "ForkEvent") {
      items.push({ id: e.id, repo, title: "forked the repo", ts });
    }
    if (items.length >= limit) break;
  }

  return new NextResponse(JSON.stringify({ items }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      pragma: "no-cache",
      expires: "0",
    },
  });
}
