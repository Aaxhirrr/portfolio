"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Github, GitCommit, Code2, RefreshCw } from "lucide-react";

const GITHUB_USER = "Aaxhirrr";
const LEETCODE_USER = "Aaxhirrr";

// limits
const GH_LIMIT = 4;
const LC_LIMIT = 4;

type GhItem = { id: string; title: string; subtitle?: string; repo?: string; ts?: string };
type LcItem = { id: string; title: string; slug: string; status: string; lang: string; ts: number };

function timeAgo(ts?: string | number) {
  if (!ts) return "";
  const t = typeof ts === "string" ? new Date(ts).getTime() : Number(ts) * 1000;
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function GlowTitle({ children }: { children: React.ReactNode }) {
  // same visual recipe as SectionTitle but inlined here
  return (
    <h2 className="relative inline-block text-2xl font-semibold tracking-tight">
      <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 blur-lg opacity-30 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"
      />
    </h2>
  );
}

export default function ActivityFeed() {
  const [gh, setGh] = useState<GhItem[]>([]);
  const [lc, setLc] = useState<LcItem[]>([]);
  const [loading, setLoading] = useState({ gh: true, lc: true });

  const fetchGh = useCallback(async () => {
    try {
      setLoading((s) => ({ ...s, gh: true }));
      const r = await fetch(
        `/api/activity/github?user=${encodeURIComponent(GITHUB_USER)}&limit=${GH_LIMIT}`,
        { cache: "no-store" }
      );
      const ct = r.headers.get("content-type") || "";
      const j = ct.includes("application/json") ? await r.json() : { items: [] };
      setGh((Array.isArray(j.items) ? j.items : []).slice(0, GH_LIMIT));
    } catch {
      setGh([]);
    } finally {
      setLoading((s) => ({ ...s, gh: false }));
    }
  }, []);

  const fetchLc = useCallback(async () => {
    try {
      setLoading((s) => ({ ...s, lc: true }));
      const r = await fetch(
        `/api/activity/leetcode?user=${encodeURIComponent(LEETCODE_USER)}&limit=${LC_LIMIT}`,
        { cache: "no-store" }
      );
      const ct = r.headers.get("content-type") || "";
      const j = ct.includes("application/json") ? await r.json() : { items: [] };
      setLc((Array.isArray(j.items) ? j.items : []).slice(0, LC_LIMIT));
    } catch {
      setLc([]);
    } finally {
      setLoading((s) => ({ ...s, lc: false }));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      await Promise.all([fetchGh(), fetchLc()]);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [fetchGh, fetchLc]);

  // shared subtle bob for BOTH panels → keeps them aligned
  const { scrollY } = useScroll();
  const yPanels = useTransform(scrollY, (v) => Math.sin(v / 800) * 10);

  return (
    <section id="activity" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mb-4 flex items-center gap-3">
        <GlowTitle>Activity Feed</GlowTitle>
        <button
          onClick={() => {
            fetchGh();
            fetchLc();
          }}
          className="rounded-full border px-2.5 py-1 text-xs inline-flex items-center gap-1"
        >
          <RefreshCw size={14} /> refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GitHub */}
        <motion.div
          style={{ y: yPanels }}
          className="relative rounded-3xl border border-neutral-800 bg-neutral-950/70 p-5 pt-6 shadow-inner"
        >
          <div className="flex items-center gap-2 mb-3">
            <Github className="text-sky-400" size={18} />
            <div className="text-sky-400/90 font-semibold tracking-wide">Latest GitHub Activity</div>
          </div>

          <span className="absolute top-4 right-5 text-[11px] text-neutral-500">{GH_LIMIT} latest</span>

          <ul className="space-y-3">
            <AnimatePresence mode="popLayout">
              {(loading.gh
                ? Array.from({ length: GH_LIMIT }).map((_, i) => ({ id: `gh-skel-${i}` }))
                : gh
              ).map((e: any) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "tween", duration: 0.25 }}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3"
                >
                  {loading.gh ? (
                    <div className="h-10 animate-pulse rounded bg-neutral-800" />
                  ) : (
                    <div className="flex items-start gap-3">
                      <GitCommit size={16} className="mt-0.5 text-sky-300" />
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-semibold">{e.repo}</span> — {e.title}
                        </div>
                        {e.subtitle ? (
                          <div className="text-xs text-neutral-400 break-words">{e.subtitle}</div>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-neutral-500 whitespace-nowrap">{timeAgo(e.ts)}</div>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <svg className="pointer-events-none absolute inset-0 -z-10" width="100%" height="100%">
            <defs>
              <filter id="gh-squig">
                <feTurbulence baseFrequency="0.015" numOctaves="1" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="2" />
              </filter>
            </defs>
            <rect
              x="0" y="0" width="100%" height="100%" rx="24" ry="24"
              fill="transparent" stroke="rgba(14,165,233,0.25)" strokeWidth="2" style={{ filter: "url(#gh-squig)" }}
            />
          </svg>
        </motion.div>

        {/* LeetCode */}
        <motion.div
          style={{ y: yPanels }}
          className="relative rounded-3xl border border-neutral-800 bg-neutral-950/70 p-5 pt-6 shadow-inner"
        >
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="text-fuchsia-300" size={18} />
            <div className="text-fuchsia-300/90 font-semibold tracking-wide">LeetCode Challenges</div>
          </div>

          <ul className="space-y-3">
            <AnimatePresence mode="popLayout">
              {(loading.lc
                ? Array.from({ length: LC_LIMIT }).map((_, i) => ({ id: `lc-skel-${i}` }))
                : lc
              ).map((e: any) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "tween", duration: 0.25 }}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3"
                >
                  {loading.lc ? (
                    <div className="h-10 animate-pulse rounded bg-neutral-800" />
                  ) : (
                    <div className="flex items-start gap-3">
                      <Code2
                        size={16}
                        className={`mt-0.5 ${
                          /Accepted/i.test(e.status)
                            ? "text-emerald-300"
                            : /Runtime|Wrong/i.test(e.status)
                            ? "text-rose-300"
                            : "text-amber-300"
                        }`}
                      />
                      <div className="flex-1">
                        <a
                          href={`https://leetcode.com/problems/${e.slug}/`}
                          className="text-sm font-semibold hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {e.title}
                        </a>
                        <div className="text-xs text-neutral-400">
                          {e.status}
                          {e.lang && e.lang !== "—" ? ` · ${e.lang}` : ""}
                        </div>
                      </div>
                      <div className="text-[10px] text-neutral-500 whitespace-nowrap">{timeAgo(e.ts)}</div>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <svg className="pointer-events-none absolute inset-0 -z-10" width="100%" height="100%">
            <defs>
              <filter id="lc-squig">
                <feTurbulence baseFrequency="0.015" numOctaves="1" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="2" />
              </filter>
            </defs>
            <rect
              x="0" y="0" width="100%" height="100%" rx="24" ry="24"
              fill="transparent" stroke="rgba(217,70,239,0.25)" strokeWidth="2" style={{ filter: "url(#lc-squig)" }}
            />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
