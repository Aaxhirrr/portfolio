"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  Moon,
  Pause,
  Play,
  Send,
  Sun,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ActivityFeed from "@/app/ActivityFeed";
import { Analytics } from "@vercel/analytics/next"

/*************************
 * Brand / Theme Palette
 *************************/

const RESUME_VIEW = "https://drive.google.com/file/d/1raBBgLKzQM6vjXCTprNfWxW_wEdTwgyT/view?usp=sharing";
const RESUME_DL   = "https://drive.google.com/uc?export=download&id=1raBBgLKzQM6vjXCTprNfWxW_wEdTwgyT";

const GOOGLE = {
  BLUE: "#1a73e8",
  RED: "#ea4335",
  YELLOW: "#fbbc05",
  GREEN: "#34a853",
  INDIGO: "#3f51b5",
};
const THEMES = [
  {
    key: "classic",
    label: "Classic",
    accents: [
      GOOGLE.BLUE,
      GOOGLE.RED,
      GOOGLE.YELLOW,
      GOOGLE.BLUE,
      GOOGLE.GREEN,
      GOOGLE.RED,
    ],
    bg: {
      orbA: GOOGLE.BLUE,
      orbB: GOOGLE.GREEN,
      orbC: GOOGLE.YELLOW,
      orbD: GOOGLE.RED,
    },
    particles: "dots",
  },
  {
    key: "holiday",
    label: "Holiday",
    accents: ["#ef4444", "#22c55e", "#fde047", "#ef4444", "#22c55e", "#fde047"],
    bg: { orbA: "#22c55e", orbB: "#ef4444", orbC: "#eab308", orbD: "#16a34a" },
    particles: "snow",
  },
  {
    key: "ml",
    label: "ML Lab",
    accents: ["#60a5fa", "#a78bfa", "#facc15", "#60a5fa", "#34d399", "#a78bfa"],
    bg: { orbA: "#60a5fa", orbB: "#a78bfa", orbC: "#34d399", orbD: "#facc15" },
    particles: "atoms",
  },
  {
    key: "confetti",
    label: "Confetti",
    accents: [
      GOOGLE.BLUE,
      GOOGLE.RED,
      GOOGLE.YELLOW,
      GOOGLE.GREEN,
      GOOGLE.BLUE,
      GOOGLE.RED,
    ],
    bg: {
      orbA: GOOGLE.YELLOW,
      orbB: GOOGLE.BLUE,
      orbC: GOOGLE.RED,
      orbD: GOOGLE.GREEN,
    },
    particles: "confetti",
  },
] as const;
type ThemeKey = (typeof THEMES)[number]["key"];

/**************** helpers ****************/
function useIsClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
function makePRNG(seed = 1337) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/****************
 * Looping Parallax (never stops)
 ****************/
function useParallaxLoop() {
  const { scrollY } = useScroll();
  const TWO_PI = 2 * Math.PI;
  const slowAmp = 80,
    slowPeriod = 1200;
  const medAmp = 160,
    medPeriod = 900;
  const fastAmp = 260,
    fastPeriod = 700;

  const ySlow = useTransform(
    scrollY,
    (v) => -Math.sin((v / slowPeriod) * TWO_PI) * slowAmp
  );
  const yMed = useTransform(
    scrollY,
    (v) => -Math.sin((v / medPeriod) * TWO_PI) * medAmp
  );
  const yFast = useTransform(
    scrollY,
    (v) => -Math.sin((v / fastPeriod) * TWO_PI) * fastAmp
  );

  const opacity = useTransform(scrollY, (v) => {
    const base = 0.85;
    const wiggle = 0.15 * (0.5 + 0.5 * Math.cos((v / 1100) * TWO_PI));
    return base + wiggle;
  });

  return { ySlow, yMed, yFast, opacity, scrollY };
}

/*************************
 * Gentle hover letter + two-line controller
 *************************/
const GLITCH_CHARS = "A!I01<>#&+$";

function DoodleLetter({
  ch,
  color,
  idx,
  autoplay,
  sizeClass = "text-6xl sm:text-7xl md:text-8xl",
}: {
  ch: string;
  color: string;
  idx: number;
  autoplay: boolean;
  sizeClass?: string;
}) {
  const [active, setActive] = React.useState(false);
  const [glyph, setGlyph] = React.useState(ch);

  // freeze flicker when paused
  const onEnter = React.useCallback(() => {
    if (!autoplay) return;
    let n = 0;
    const id = setInterval(() => {
      setGlyph(n % 2 ? ch : GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0]);
      n += 1;
      if (n > 3) {
        clearInterval(id);
        setGlyph(ch);
      }
    }, 40);
  }, [autoplay, ch]);

  const isEmoji = glyph === "😉";

  return (
    <motion.span
      layout
      onMouseEnter={() => {
        if (!autoplay) return;
        setActive(true);
        onEnter();
      }}
      onMouseLeave={() => setActive(false)}
      animate={
        autoplay
          ? (active
              ? { y: -8, rotate: [0, -8, 8, -3, 0] }
              : { y: [0, -3, 0], transition: { repeat: Infinity, duration: 3 + (idx % 3), ease: "easeInOut" } })
          : {}
      }
      transition={{ type: "tween", duration: 0.35 }}
      className={`select-none inline-block align-baseline leading-none px-1 sm:px-1.5 font-black tracking-tight cursor-pointer ${sizeClass}`}
      style={{ color, transform: isEmoji ? "translateY(2px)" : undefined }}
    >
      {glyph}
    </motion.span>
  );
}

/**
 * Two-line controller:
 *  - Default: "Aashir" (top) / "Javed" (bottom)
 *  - Easter egg: "Plz hire" (top) / "me 😉" (bottom), smaller font
 * Triggers: click letters in order, double-click anywhere, or type 'hire'
 */
function DoodleNameEgg({
  accents,
  autoplay,
}: {
  accents: string[];
  autoplay: boolean;
}) {
  const nameLines = ["Aashir", "Javed"];
  const secretLines = ["Plz hire", "me 😉"];

  const nameFlat = nameLines.join(" ");
  const tArr = useMemo(() => Array.from(nameFlat), [nameFlat]);

  const [eggMode, setEggMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [keyProg, setKeyProg] = useState(0);

  const [dispL1, setDispL1] = useState<string[] | null>(null);
  const [dispL2, setDispL2] = useState<string[] | null>(null);

  const randArr = (len: number) =>
    Array.from({ length: len }, () => GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0]);

  const showSecret = React.useCallback(() => {
    if (eggMode) return;
    setEggMode(true);

    const i1 = setInterval(() => setDispL1(randArr(secretLines[0].length)), 50);
    const i2 = setInterval(() => setDispL2(randArr(secretLines[1].length)), 50);
    setTimeout(() => {
      clearInterval(i1);
      clearInterval(i2);
      setDispL1(Array.from(secretLines[0]));
      setDispL2(Array.from(secretLines[1]));
    }, 360);

    setTimeout(() => {
      const j1 = setInterval(() => setDispL1(randArr(nameLines[0].length)), 50);
      const j2 = setInterval(() => setDispL2(randArr(nameLines[1].length)), 50);
      setTimeout(() => {
        clearInterval(j1);
        clearInterval(j2);
        setDispL1(null);
        setDispL2(null);
        setEggMode(false);
      }, 420);
    }, 3000);
  }, [eggMode]);

  // keyboard 'hire'
  useEffect(() => {
    const seq = "hire";
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === seq[keyProg]) {
        const np = keyProg + 1;
        setKeyProg(np);
        if (np === seq.length) {
          setKeyProg(0);
          showSecret();
        }
      } else {
        setKeyProg(k === seq[0] ? 1 : 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyProg, showSecret]);

  const handleClickLetter = (globalIdx: number) => {
    if (eggMode) return;

    let p = progress;
    while (p < tArr.length && tArr[p] === " ") p++;

    if (globalIdx === p) {
      p += 1;
      while (p < tArr.length && tArr[p] === " ") p++;
      setProgress(p);
      if (p >= tArr.length) showSecret();
    } else {
      setProgress(tArr[globalIdx] === tArr[0] ? 1 : 0);
    }
  };

  const onDoubleClick = () => showSecret();

  const renderLine = (
    text: string,
    offset: number,
    sizeClass: string,
    isSecret: boolean
  ) => {
    const arr = Array.from(text);
    return (
      <div className="flex flex-wrap items-baseline gap-x-0 gap-y-0 leading-none">
        {arr.map((ch, i) => {
          const globalIdx = offset + i;
          const color = ch === " " ? "inherit" : accents[globalIdx % accents.length];
          const clickable = !eggMode && ch !== " ";
          return (
            <span
              key={`${ch}-${globalIdx}`}
              onClick={clickable ? () => handleClickLetter(globalIdx) : undefined}
            >
              <DoodleLetter
                ch={ch}
                color={color}
                idx={globalIdx}
                autoplay={autoplay}
                sizeClass={sizeClass}
              />
            </span>
          );
        })}
      </div>
    );
  };

  const nameTopOffset = 0;
  const nameBottomOffset = nameLines[0].length + 1;

  const secretTopOffset = 0;
  const secretBottomOffset = secretLines[0].length + 1;

  const topText = eggMode ? (dispL1 ? dispL1.join("") : secretLines[0]) : nameLines[0];
  const bottomText = eggMode ? (dispL2 ? dispL2.join("") : secretLines[1]) : nameLines[1];

  const sizeTop = eggMode
    ? "text-5xl sm:text-6xl md:text-7xl"
    : "text-6xl sm:text-7xl md:text-8xl";
  const sizeBottom = sizeTop;

  return (
    <div
      className="select-none inline-flex flex-col items-start leading-none"
      onDoubleClick={onDoubleClick}
      title="(Psst… double-click or type 'hire')"
    >
      {renderLine(
        topText,
        eggMode ? secretTopOffset : nameTopOffset,
        sizeTop,
        eggMode
      )}
      <div className="h-2" />
      {renderLine(
        bottomText,
        eggMode ? secretBottomOffset : nameBottomOffset,
        sizeBottom,
        eggMode
      )}
    </div>
  );
}

/******************* Particles / Squiggles *******************/
function Particles({ mode }: { mode: ThemeKey }) {
  const isClient = useIsClient();
  const [baseCount, setBaseCount] = useState(28);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => setBaseCount(window.innerWidth < 640 ? 16 : 28);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  const particles = useMemo(() => {
    const rnd = makePRNG(20250819);
    return Array.from({ length: baseCount }, (_, i) => ({
      id: i,
      size: 6 + rnd() * 8,
      left: rnd() * 100,
      delay: rnd() * 2,
      duration: 6 + rnd() * 6,
      topStart: -10 + rnd() * 110,
      x1: rnd() * 80 - 40,
      x2: rnd() * 40 - 20,
    }));
  }, [baseCount]);
  if (!isClient) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden"
    >
      {particles.map((p) => {
        const color =
          mode === "holiday"
            ? p.id % 2 === 0
              ? "#22c55e"
              : "#ef4444"
            : mode === "ml"
            ? ["#60a5fa", "#a78bfa", "#34d399"][p.id % 3]
            : mode === "confetti"
            ? [GOOGLE.BLUE, GOOGLE.RED, GOOGLE.YELLOW, GOOGLE.GREEN][p.id % 4]
            : ["#94a3b8", "#cbd5e1"][p.id % 2];
        const shape = mode === "ml" ? "rounded-full" : "rounded";
        return (
          <motion.div
            key={p.id}
            className={`absolute ${shape} transform-gpu`}
            initial={{ y: `${p.topStart}vh`, x: 0, opacity: 0 }}
            animate={{
              y: ["-10vh", "110vh"],
              x: [0, p.x1, p.x2],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: color,
              filter: "blur(0.2px)",
              willChange: "transform,opacity",
            }}
          />
        );
      })}
    </div>
  );
}

/******** Section-specific lightweight particles (confetti/binary/stars) ********/
function SectionParticles({ kind }: { kind: "confetti" | "binary" | "stars" }) {
  const isClient = useIsClient();
  const count = kind === "confetti" ? 18 : kind === "binary" ? 22 : 16;
  const chars =
    kind === "binary" ? ["0", "1"] : kind === "stars" ? ["✦", "✧", "⋆"] : ["", "", ""];
  const rnd = useMemo(() => makePRNG(42), []);
  if (!isClient) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {Array.from({ length: count }).map((_, i) => {
        const left = rnd() * 100,
          delay = rnd() * 2,
          dur = 5 + rnd() * 6,
          size = 10 + rnd() * 18;
        return (
          <motion.div
            key={i}
            className="absolute text-neutral-300/50 dark:text-neutral-600/60"
            initial={{ y: "-10%", x: `${left}%`, opacity: 0 }}
            animate={{ y: "110%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
            style={{ fontSize: kind === "confetti" ? 0 : size }}
          >
            {kind === "confetti" ? (
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: i % 3 ? "#60a5fa" : "#f59e0b" }}
              />
            ) : (
              chars[i % chars.length]
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/****************************
 * Orbs (looping parallax) + cursor repulsion (SSR-safe)
 ****************************/
function OrbsBackdrop({
  orbA,
  orbB,
  orbC,
  orbD,
}: {
  orbA: string;
  orbB: string;
  orbC: string;
  orbD: string;
}) {
  const { ySlow, yMed, yFast, opacity } = useParallaxLoop();
  const reduce = useReducedMotion();

  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  useEffect(() => {
    const update = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const repel = (cx: number, cy: number) => {
    const dx = mouse.x - cx,
      dy = mouse.y - cy;
    const d2 = dx * dx + dy * dy;
    const power = Math.min(34, 120000 / Math.max(4000, d2));
    const ang = Math.atan2(dy, dx);
    return { x: -Math.cos(ang) * power, y: -Math.sin(ang) * power };
  };

  const ready = vw > 0 && vh > 0;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full blur-3xl opacity-20 transform-gpu"
        style={{
          y: ySlow,
          opacity,
          background: `conic-gradient(from 180deg at 50% 50%, ${orbA}, ${orbB}, ${orbC}, ${orbD}, ${orbA})`,
        }}
      />

      <motion.div
        className="absolute left-[8%] top-[12%] w-64 h-64"
        animate={reduce || !ready ? {} : repel(vw * 0.08 + 128, vh * 0.12 + 128)}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      >
        <motion.div
          className="w-64 h-64 rounded-full transform-gpu"
          style={{ y: yMed, opacity: 0.12, background: orbA, filter: "blur(32px)" }}
        />
      </motion.div>

      <motion.div
        className="absolute right-[12%] top-[28%] w-80 h-80"
        animate={reduce || !ready ? {} : repel(vw * 0.88 - 160, vh * 0.28 + 160)}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      >
        <motion.div
          className="w-80 h-80 rounded-full transform-gpu"
          style={{ y: yFast, opacity: 0.1, background: orbB, filter: "blur(34px)" }}
        />
      </motion.div>

      <motion.div
        className="absolute left-[14%] bottom-[22%] w-72 h-72"
        animate={reduce || !ready ? {} : repel(vw * 0.14 + 144, vh * 0.78 - 144)}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      >
        <motion.div
          className="w-72 h-72 rounded-full transform-gpu"
          style={{ y: ySlow, opacity: 0.09, background: orbC, filter: "blur(36px)" }}
        />
      </motion.div>

      <motion.div
        className="absolute right-[14%] bottom-[6%] w-64 h-64"
        animate={reduce || !ready ? {} : repel(vw * 0.86 - 128, vh * 0.94 - 128)}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      >
        <motion.div
          className="w-64 h-64 rounded-full transform-gpu"
          style={{ y: yMed, opacity: 0.09, background: orbD, filter: "blur(30px)" }}
        />
      </motion.div>
    </div>
  );
}

/*************************************
 * Generic Parallax helpers
 *************************************/
function ParallaxItem({
  children,
  strength = 40,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const { scrollY } = useScroll();
  const TWO_PI = 2 * Math.PI;
  const y = useTransform(scrollY, (v) => Math.sin((v / 1000) * TWO_PI) * strength);
  return (
    <motion.div style={{ y, willChange: "transform" }} className={className}>
      {children}
    </motion.div>
  );
}
function ParallaxHeader({
  children,
  strength = 24,
  xStrength = 8,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  xStrength?: number;
  className?: string;
}) {
  const { scrollY } = useScroll();
  const TWO_PI = 2 * Math.PI;
  const y = useTransform(scrollY, (v) => Math.sin((v / 1100) * TWO_PI) * strength);
  const x = useTransform(scrollY, (v) => Math.cos((v / 1300) * TWO_PI) * xStrength);
  const opacity = useTransform(
    scrollY,
    (v) => 0.92 + 0.08 * (0.5 + 0.5 * Math.cos((v / 900) * TWO_PI))
  );
  return (
    <motion.div
      style={{ y, x, opacity, willChange: "transform,opacity" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/******************* Section Title *******************/
function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-2xl font-semibold tracking-tight ${className}`}>
      <span className="relative inline-block">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
          {children}
        </span>
        <span className="absolute inset-0 -z-10 blur-lg opacity-30 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500" />
      </span>
    </h2>
  );
}

/******************* Divider (removed) *******************/
function DoodleDivider() {
  return null;
}

/******************* Scroll Progress *******************/
function TopProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[70] h-0.5 origin-left"
      style={{ background: GOOGLE.BLUE, scaleX }}
    />
  );
}

/******************* Nav *******************/
/******************* Nav *******************/
function Nav({
  mode,      // unused now (kept so the call-site doesn't change)
  setMode,   // unused
  isDark,
  setDark,
}: {
  mode: ThemeKey;
  setMode: (m: ThemeKey) => void;
  isDark: boolean;
  setDark: (b: boolean) => void;
}) {
  const LINKS = [
    { id: "timeline", label: "Experience" },
    { id: "projects", label: "Projects" },
    { id: "activity", label: "Activity Feed" },
    { id: "about", label: "About" },
    { id: "contact", label: "Contact" },
  ];

  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="font-bold tracking-tight">• aashir.io (pretend this is my domain pls) </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="rounded-full border px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 hover:shadow"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => setDark(!isDark)}
            className="ml-1 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title={isDark ? "Switch to Light" : "Switch to Dark"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}


/******************* Project Card *******************/
function ProjectCard({ p, onOpen }: { p: any; onOpen: (id: string) => void }) {
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - left) / width;
    const py = (e.clientY - top) / height;
  const rx = (0.5 - py) * 8;
    const ry = (px - 0.5) * 8;
    setRot({ x: rx, y: ry });
  };
  const onLeave = () => setRot({ x: 0, y: 0 });

  return (
    <motion.button
      layoutId={`card-${p.id}`}
      onClick={() => onOpen(p.id)}
      onMouseMove={reduce ? undefined : onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        onLeave();
      }}
      whileTap={{ scale: 0.99 }}
      className="group relative w-full rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm text-left will-change-transform"
      style={{
        transform: reduce
          ? undefined
          : `perspective(900px) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
      }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="h-9 w-9 rounded-2xl shadow"
          style={{ background: p.color }}
          animate={
            hover && !reduce
              ? {
                  scale: [1, 1.06, 1],
                  boxShadow: [
                    "0 0 0 rgba(0,0,0,0)",
                    `0 0 24px ${p.color}55`,
                    "0 0 0 rgba(0,0,0,0)",
                  ],
                }
              : { scale: 1 }
          }
          transition={{
            duration: 0.9,
            repeat: hover && !reduce ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
        <div>
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
            {p.title}
          </h3>
          {p.range && (
            <div className="mt-0.5 text-xs text-neutral-500">
              {p.range}
              {p.status ? ` • ${p.status}` : ""}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
        {p.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {p.tags.map((t: string) => (
          <span
            key={t}
            className="rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-300"
          >
            {t}
          </span>
        ))}
      </div>

      {/* animated squiggle border */}
      <svg className="pointer-events-none absolute inset-0 -z-10" width="100%" height="100%">
        <defs>
          <filter id={`squiggle-${p.id}`}>
            <feTurbulence baseFrequency="0.02" numOctaves="1" result="noise">
              <animate
                attributeName="baseFrequency"
                values="0.018;0.026;0.018"
                dur="7s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
          </filter>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="24"
          ry="24"
          fill="transparent"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="2"
          style={{ filter: `url(#squiggle-${p.id})` }}
        />
      </svg>
    </motion.button>
  );
}

function ProjectSheet({ project, onClose }: { project: any; onClose: () => void }) {
  return (
    <AnimatePresence>
      {project && (
        <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            layoutId={`card-${project.id}`}
            className="w-full sm:w-[760px] max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-2xl"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: "tween", duration: 0.4 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-2xl shadow" style={{ background: project.color }} />
                <div>
                  <div className="font-semibold">{project.title}</div>
                  {project.range && <div className="mt-0.5 text-xs text-neutral-500">{project.range}{project.status ? ` • ${project.status}` : ""}</div>}
                  <div className="text-xs text-neutral-500">Project Details</div>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full px-3 py-1.5 border text-xs">Close</button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="sm:col-span-2 space-y-4">
                <div className="rounded-xl bg-neutral-100 dark:bg-neutral-900 aspect-video overflow-hidden relative">
                  {project.videoId ? (
                    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${project.videoId}`} title={project.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                  ) : project.videoUrl ? (
                    <video className="w-full h-full" controls src={project.videoUrl} />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <Play className="mx-auto mb-2 opacity-60" size={20} />
                        <div className="text-sm text-neutral-500">Video coming soon — check the repo meanwhile 👇</div>
                        {Array.isArray(project?.details?.links) && project.details.links.find((l: any) => /repo|github/i.test(l.label)) ? (
                          <a href={project.details.links.find((l: any) => /repo|github/i.test(l.label)).href} className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:shadow">
                            <Github size={14} /> View GitHub
                          </a>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{project.summary}</p>
              </div>
              <div className="space-y-3">
                <div><div className="text-xs uppercase tracking-widest text-neutral-400">Problem</div><p className="text-sm text-neutral-700 dark:text-neutral-300">{project.details.problem}</p></div>
                <div><div className="text-xs uppercase tracking-widest text-neutral-400">Solution</div><p className="text-sm text-neutral-700 dark:text-neutral-300">{project.details.solution}</p></div>
                <div><div className="text-xs uppercase tracking-widest text-neutral-400">Impact</div><p className="text-sm text-neutral-700 dark:text-neutral-300">{project.details.impact}</p></div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {project.details.links.map((l: any) => (
                    <a key={l.label} href={l.href} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:shadow">
                      <ExternalLink size={14} /> {l.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


/******************* Experience Timeline *******************/
type ExperienceLink = { label: string; href: string; kind?: "github" | "link" };
type Experience = {
  title: string;
  company: string;
  range: string;
  summary: string;
  bullets?: string[];
  color: string;
  project?: string;
  links?: ExperienceLink[];
};

const EXPERIENCES: Experience[] = [
  {
    title: "Software Engineering Intern — Generative AI Division",
    company: "Sedai",
    range: "Aug 2025 – Present · Remote",
    summary:
      "Contributing to GenAI infra & internal tools for LLM inference; collaborating with VP Eng on prod-grade ML apps.",
    bullets: ["Model inference optimization", "AI tooling for reliability/telemetry"],
    color: GOOGLE.BLUE,
  },
  {
    title: "Undergraduate ML Research",
    company: "Ira A. Fulton Schools of Engineering, ASU",
    range: "May 2025 – August 2025 · Hybrid · Tempe, AZ",
    summary:
      "Applied LLM pipelines to biomedical corpora for Alzheimer’s; knowledge-graph extraction + Neo4j on GCP.",
    project: "OntoKGen-Bio — Alzheimer’s biomedical knowledge graph",
    bullets: ["RAG over PubMed", "364+ unique relations extracted", "Neo4j x AuraDB"],
    color: GOOGLE.RED,
    links: [
      {
        label: "GitHub",
        href: "https://github.com/Aaxhirrr/APOE4-Amyloid-Knowledge-Graph",
        kind: "github",
      },
    ],
  },
  {
    title: "Beta Contributor — CreateAI Lab",
    company: "Arizona State University",
    range: "Jun 2025 – Present · Tempe, AZ",
    summary:
      "Evaluated 30+ models for ASU tooling; prompt refinement and responsible deployment studies.",
    bullets: ["Benchmarks for cost/quality/latency", "Prompt patterns & eval harness"],
    color: GOOGLE.GREEN,
  },
  {
    title: "Mathematics Assistant & Grader (Part-time)",
    company: "Arizona State University",
    range: "Fall 2024 | Spring 2025 | Fall 2025 (Present) · On-site",
    summary:
      "Assisted instruction & grading; supported students across statistics/linear algebra.",
    bullets: ["Student support and feedback", "Course ops & logistics"],
    color: GOOGLE.YELLOW,
  },
  {
    title: "Software Lead → (prev.) Research Lead",
    company: "EPICS @ ASU — Safety Escort System",
    range: "Aug 2024 – May 2025 · On-site",
    summary:
      "Led LiDAR-based SLAM safety-escort: planning, benchmarking, stakeholder reviews; ~20% mapping improvement.",
    bullets: ["A*/Dijkstra planning with real-time sensors", "Team coordination & stress testing"],
    color: GOOGLE.BLUE,
    links: [{ label: "GitHub", href: "https://github.com/Aaxhirrr/safety-escort-app", kind: "github" }],
  },
  {
    title: "Software Engineering Project (Mini OSS)",
    company: "Pyramid Computer Solutions",
    range: "Dec 2024 · Remote",
    summary:
      "Python CLI for ETL data-integrity checks (>99% validation accuracy); Py2→Py3 migration with tests.",
    bullets: ["ETL automation", "CLI & PyTest", "Legacy refactor"],
    color: GOOGLE.RED,
  },
];

function VerticalTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 20%"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const gradientVars: React.CSSProperties = {
    ["--blue" as any]: GOOGLE.BLUE,
    ["--yellow" as any]: GOOGLE.YELLOW,
    ["--green" as any]: GOOGLE.GREEN,
  };
  return (
    <section id="timeline" ref={ref} className="relative py-24">
      <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-neutral-200 dark:bg-neutral-800" />
      <motion.div
        style={{ ...gradientVars, scaleY } as any}
        className="absolute left-1/2 top-0 origin-top -translate-x-1/2 w-[3px] rounded bg-gradient-to-b from-[var(--blue)] via-[var(--yellow)] to-[var(--green)]"
      />
      <div className="relative z-10 max-w-5xl mx-auto space-y-16 px-4">
        {EXPERIENCES.map((exp, i) => {
          const isLeft = i % 2 === 0;
          return (
            <motion.div
              key={`${exp.title}-${i}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ type: "tween", duration: 0.45 }}
              className="grid grid-cols-9 gap-4 items-start"
            >
              <div className={`${isLeft ? "col-span-4 order-1 text-right" : "col-span-4 order-3"}`}>
                <ParallaxItem strength={24}>
                  <div className="inline-block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 p-5 shadow-sm">
                    <div className="text-xs text-neutral-500">{exp.range}</div>
                    <div className="font-semibold">{exp.title}</div>
                    <div className="text-sm text-neutral-500">{exp.company}</div>
                    {exp.project && (
                      <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                        <span className="font-medium">Project:</span> {exp.project}
                      </div>
                    )}
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                      {exp.summary}
                    </p>
                    {exp.bullets && (
                      <ul className="mt-2 space-y-1 text-xs text-neutral-500">
                        {exp.bullets.map((b, j) => (
                          <li key={j} className="list-disc list-inside">
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {exp.links?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {exp.links.map((l, idx) => (
                          <a
                            key={`${l.label}-${idx}`}
                            href={l.href}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:shadow"
                          >
                            {l.kind === "github" ? <Github size={14} /> : <ExternalLink size={14} />}
                            {l.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </ParallaxItem>
              </div>
              <div className="col-span-1 order-2 flex justify-center">
                <span className="relative inline-flex">
                  <span className="h-3 w-3 rounded-full" style={{ background: exp.color }} />
                  <span
                    className="absolute -inset-2 rounded-full opacity-30"
                    style={{ background: exp.color, filter: "blur(6px)" }}
                  />
                </span>
              </div>
              <div className={`${isLeft ? "col-span-4 order-3" : "col-span-4 order-1"}`} />
            </motion.div>
          );
        })}
      </div>

      <DoodleDivider />
    </section>
  );
}

/******************* Contact (typewriter audio with Mute) *******************/
/******************* Contact (typewriter audio with Mute) *******************/
function ContactCard() {
  const [sending, setSending] = useState(false);
  const [muted, setMuted] = useState(true);
  const [copied, setCopied] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const last = useRef(0);

  const click = () => {
    if (muted) return;
    const now = performance.now();
    if (now - last.current < 70) return;
    last.current = now;
    try {
      if (!audioCtx.current)
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtx.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 1150 + Math.random() * 160;
      g.gain.value = 0.00005;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.00005, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.00005, t + 0.09);
      o.start(t);
      o.stop(t + 0.1);
    } catch {}
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText("anola133@asu.edu");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 p-6 shadow-sm relative overflow-hidden">
      <SectionParticles kind="stars" />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-neutral-500">Prefer email?</div>
          <div className="font-medium">Let's talk.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="rounded-full border px-3 py-2 text-xs"
            title={muted ? "Sound off" : "Sound on"}
          >
            {muted ? "🔇 Mute" : "🔊 Sound"}
          </button>
          <button
            onClick={() => {
              setSending(true);
              setTimeout(() => setSending(false), 1400);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--blue)] px-4 py-2 text-white text-sm shadow hover:shadow-md transition"
            style={{ ["--blue" as any]: GOOGLE.BLUE }}
          >
            <Send size={16} /> {sending ? "Sending…" : "Send a hello"}
          </button>
        </div>
      </div>

      {/* Highlighted email */}
      <div className="mt-4 flex items-center gap-3">
        <a
          href="mailto:anola133@asu.edu"
          className="text-lg font-semibold bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent"
        >
          anola133@asu.edu
        </a>
        <button onClick={copyEmail} className="rounded-full border px-2.5 py-1 text-xs">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className="rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none"
          placeholder="Your email"
        />
        <input
          className="rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none"
          placeholder="Subject"
        />
        <textarea
          rows={4}
          className="sm:col-span-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none"
          placeholder="Type your message…"
          onKeyDown={click}
        />
      </div>
      <div className="mt-3 text-xs text-neutral-400">This is a demo form.</div>
    </div>
  );
}


/******************* Animated summary *******************/
function AnimatedSummary({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <p className="mt-4 max-w-xl text-neutral-600 dark:text-neutral-300 leading-relaxed">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.35, ease: "easeOut" }}
          className="inline-block mr-1"
        >
          {w}
        </motion.span>
      ))}
    </p>
  );
}

/******************* Main Component *******************/
export default function GoogleDoodleOption5Insane() {
  const [mode, setMode] = useState<ThemeKey>("classic");
  const [isDark, setDark] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const theme = useMemo(() => THEMES.find((t) => t.key === mode)!, [mode]);
  const activeProject = useMemo(
    () => PROJECTS.find((p) => p.id === openId) || null,
    [openId]
  );

  const heroSquigs = useMemo(() => {
    const rnd = makePRNG(555);
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      size: 20 + i * 10,
      x1: rnd() * 240 - 120,
      x2: rnd() * 80 - 40,
      y1: rnd() * 120 - 60,
      y2: rnd() * 40 - 20,
      rot: [0, 45, -45, 0] as number[],
      dur: 6 + i,
    }));
  }, []);

  const { scrollY } = useParallaxLoop();
  const TWO_PI = 2 * Math.PI;
  const heroTitleY = useTransform(
    scrollY,
    (v) => -Math.sin((v / 950) * TWO_PI) * 24
  );
  const heroPanelY = useTransform(
    scrollY,
    (v) => -Math.cos((v / 1100) * TWO_PI) * 18
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  const projectsY = useTransform(scrollY, (v) => Math.sin(v / 1200) * 10);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 selection:bg-[rgba(26,115,232,0.20)]">
      <TopProgressBar />
      <Nav mode={mode} setMode={setMode} isDark={isDark} setDark={setDark} />
      <OrbsBackdrop
        orbA={theme.bg.orbA}
        orbB={theme.bg.orbB}
        orbC={theme.bg.orbC}
        orbD={theme.bg.orbD}
      />
      <Particles mode={mode} />

      {/* HERO */}
      <section
        id="hero"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-20 relative"
      >
        <div className="flex flex-col-reverse lg:flex-row items-center gap-10">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "tween", duration: 0.45 }}
            className="flex-1"
            style={{ y: heroTitleY }}
          >
            <div className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: GOOGLE.BLUE }}
              />
              <span className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                My Portfolio Website xD
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-medium text-neutral-600 dark:text-neutral-300">
              A playful identity for
            </div>

            <div className="mt-1">
              <DoodleNameEgg accents={theme.accents as any} autoplay={autoplay} />
            </div>

            <AnimatedSummary text="CS junior experienced in ML research, GenAI internship and software lab environments." />
            <AnimatedSummary text="ik this is inspired by google doodle (google please dont sue me)." />
            <AnimatedSummary text="Psst... Double click my name ;)" />

            {/* Actions (3 rows) */}
            {/* Actions (2 rows: merged + socials) */}
            <div className="mt-6 flex flex-col gap-3">
              {/* merged row: Explore + Pause/Play */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--blue)] px-4 py-2 text-white text-sm shadow hover:shadow-md"
                  style={{ ["--blue" as any]: GOOGLE.BLUE }}
                >
                  <Mail size={16} /> Explore Projects
                </button>

                <button
                  onClick={() => setAutoplay((v) => !v)}
                  className="rounded-full border px-3 py-2 text-sm inline-flex items-center gap-2"
                >
                  {autoplay ? <Pause size={16} /> : <Play size={16} />}{" "}
                  {autoplay ? "Pause" : "Play"} Letters
                </button>
              </div>

              {/* socials row stays the same */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://github.com/Aaxhirrr"
                  className="rounded-full border px-3 py-2 text-sm inline-flex items-center gap-2"
                >
                  <Github size={16} /> GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/aashir-javed-aj28"
                  className="rounded-full border px-3 py-2 text-sm inline-flex items-center gap-2"
                >
                  <Linkedin size={16} /> LinkedIn
                </a>
                <button
                  onClick={() => {
                    window.open(RESUME_VIEW, "_blank");
                    setTimeout(() => window.open(RESUME_DL, "_blank"), 120);
                  }}
                  className="rounded-full border px-3 py-2 text-sm inline-flex items-center gap-2"
                  title="Open & download"
                >
                  📄 Resume
                </button>
              </div>
            </div>

          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "tween", duration: 0.45 }}
            className="flex-1 w-full"
            style={{ y: heroPanelY }}
          >
            <div className="relative rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/70 p-6 shadow-sm overflow-hidden">
              <div className="text-sm text-neutral-500">Doodle Modes</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setMode(t.key as ThemeKey)}
                    className={`rounded-full px-3 py-1.5 text-xs border ${
                      mode === t.key ? "bg-white dark:bg-neutral-900 shadow" : "bg-neutral-100 dark:bg-neutral-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="mt-6 h-48 sm:h-56 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center relative overflow-hidden">
                {heroSquigs.map((q) => (
                  <motion.div
                    key={q.id}
                    className="absolute rounded-full opacity-40 transform-gpu"
                    style={{
                      background: (theme.accents as any)[q.id % (theme.accents as any).length],
                      width: q.size,
                      height: q.size,
                    }}
                    animate={{ x: [q.x1, q.x2, q.x1], y: [q.y1, q.y2, q.y1], rotate: q.rot }}
                    transition={{ duration: q.dur, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}
                <div className="relative z-10 font-semibold text-neutral-700 dark:text-neutral-200 text-sm">
                  Hover the title letters ↑
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <DoodleDivider />
      </section>

      {/* EXPERIENCE */}
      <ParallaxHeader
        strength={12}
        xStrength={4}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <SectionTitle>Experience</SectionTitle>
      </ParallaxHeader>
      <section className="relative">
        <SectionParticles kind="binary" />
        <VerticalTimeline />
      </section>

      {/* ACTIVITY FEED */}
      <section className="relative">
        <SectionParticles kind="confetti" />
        <ActivityFeed />
      </section>

      {/* PROJECTS */}
      <section
        id="projects"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 relative"
      >
        <ParallaxHeader
          strength={12}
          xStrength={4}
          className="relative z-10"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-400">
                Doodles → Docs
              </div>
              <SectionTitle className="mt-1">Projects</SectionTitle>
            </div>
          </div>
        </ParallaxHeader>

        <LayoutGroup>
          <motion.div
            style={{ y: projectsY }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
          >
            {PROJECTS.map((p) => (
              <div key={p.id} className="h-full">
                <ProjectCard p={p} onOpen={(id) => setOpenId(id)} />
              </div>
            ))}
          </motion.div>
        </LayoutGroup>

        <DoodleDivider />
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 relative"
      >
        <ParallaxHeader strength={0} xStrength={0} className="relative z-10">
          <div className="mb-6">
            <SectionTitle>A little bit more about me</SectionTitle>
            <h2 className="mt-2 text-xl font-semibold"></h2>
          </div>
        </ParallaxHeader>
        <ParallaxItem strength={26}>
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 p-6 shadow-sm max-w-3xl">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--green)] shadow"
                style={{ ["--blue" as any]: GOOGLE.BLUE, ["--green" as any]: GOOGLE.GREEN }}
              />
              <div>
                <div className="font-semibold">Student • Phoenix, AZ</div>
                <div className="text-sm text-neutral-500">Computer Science | Business Minor | Data Science Track</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
So, I’m Aashir, a Computer Science student at Arizona State University, where I spend my days juggling ML project, backend chaos, classes, job, and the occasional existential crisis about AI taking over the world (just kidding… mostly). I’m passionate about building real-world machine learning systems, experimenting with new tech, and pushing myself way outside my comfort zone, because that’s where all the fun happens. Why? I honestly just love figuring out how things work and making them better. If you ever want to chat about all of this stuff, you know where to find me.            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 px-2 py-1">
                2026 Summer Internship target
              </span>
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 px-2 py-1">
                Software | AI/ML Roles
              </span>
            </div>
          </div>
        </ParallaxItem>

        <DoodleDivider />
      </section>

      {/* CONTACT */}
      <section
        id="contact"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 relative"
      >
        <ParallaxHeader strength={0} xStrength={0} className="relative z-10">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-widest text-neutral-400">Inbox</div>
            <SectionTitle className="mt-1">Contact</SectionTitle>
          </div>
        </ParallaxHeader>
        <ParallaxItem strength={18}>
          <ContactCard />
        </ParallaxItem>
        <div className="mt-6 flex items-center justify-between text-xs text-neutral-500">
          <div>Built with Tailwind + Framer Motion • Doodle Mode: {theme.label}</div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="rounded-full border px-3 py-1.5"
          >
            Back to top
          </button>
        </div>
      </section>

      {/* Project modal */}
      <ProjectSheet project={activeProject} onClose={() => setOpenId(null)} />

      <style jsx global>{`
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

/********************** Top Projects **********************/
const PROJECTS = [
  {
    id: "t5-neuromem",
    title: "T5-NeuroMem — Memory-Aware T5 Service",
    range: "Aug 2025 – Present",
    status: "Ongoing",
    summary:
      "A T5 that remembers: BigQuery vector retrieval + PageRank rerank. Prompts are blended with top chunks and answers include citations. Served via FastAPI on Cloud Run / Vertex.",
    tags: ["T5-LoRA", "FastAPI", "BigQuery Vector", "PageRank", "GCP", "Vertex AI"],
    color: GOOGLE.BLUE,
    details: {
      problem:
        "Vanilla T5 drifts on long-context queries and hallucinates without durable memory/citations.",
      solution:
        "Embedded corpus in BigQuery vectors, ANN retrieval + PageRank surfacing, prompt blending with source citations; FastAPI endpoint on Cloud Run/Vertex.",
      impact:
        "End-to-end telemetry (p50/p95, hit-rate, cost) to show reduced hallucination and higher factuality at competitive latency.",
      links: [
        { label: "GitHub", href: "https://github.com/Aaxhirrr/t5-neuromem" },
        { label: "Docs", href: "#" },
        { label: "Demo", href: "#" },
      ],
    },
  },
  {
    id: "data-den",
    title: "Data Den — GPU Learning Workspace",
    range: "Jun 2025",
    summary:
      "Hackathon (NVIDIA × ASU AI Spark, 3rd Place). LLM-powered GPU tutoring: RAPIDS/cuDF, CuPy, and SLURM on ASU’s Sol cluster with a LangGraph RAG agent (Ollama) guiding optimizations.",
    tags: ["RAPIDS/cuDF", "CuPy", "SLURM", "Gradio", "LangGraph", "RAG", "Ollama"],
    color: GOOGLE.GREEN,
    details: {
      problem:
        "Students lack hands-on, real-time feedback to move CPU workflows to GPU efficiently.",
      solution:
        "Benchmarked NumPy→CuPy & Pandas→cuDF, submitted sbatch to A100s, multi-tab Gradio UI for chat/bench/live analysis; RAG agent generated optimization guidance.",
      impact:
        "Achieved up to 18× speedups on matrix workloads with live visualizations; 3rd place overall.",
      links: [
        { label: "GitHub", href: "https://github.com/Aaxhirrr/data-den" },
        { label: "Write-up", href: "#" },
        { label: "Demo", href: "#" },
      ],
    },
  },
  {
    id: "breathe-pulse-ai",
    title: "BreathePulseAI — Emotion-Aware Microbreak Coach",
    range: "Apr 2025",
    summary:
      "Privacy-first CV (MediaPipe) tracks 5+ facial biomarkers and a lightweight RL engine (Q-learning/MAB) recommends the most effective microbreak. FastAPI + React + Firebase.",
    tags: ["MediaPipe", "RL (Q-learning/MAB)", "FastAPI", "React/TS", "Firebase", "Tailwind"],
    color: GOOGLE.RED,
    details: {
      problem:
        "Zoom fatigue and stress accumulate without timely, personalized micro-interventions.",
      solution:
        "On-device signals (facial biomarkers), RL policy picks posture/breathing prompts; Firebase Firestore stores state for long-term personalization.",
      impact:
        "More effective microbreaks with privacy-first processing and persistent context across sessions.",
      links: [
        { label: "GitHub", href: "https://github.com/Aaxhirrr/breathe-pulse" },
        { label: "Demo", href: "#" },
      ],
    },
  },
  {
    id: "disaster-rag",
    title: "Disaster Response AI — RAG Chatbot",
    range: "Oct 2024 – Jan 2025",
    summary:
      "LangChain + FastAPI RAG (FAISS, TF-IDF, GPT-4) for disaster intel. Pulls NASA/FEMA/NOAA/Google/OSM feeds (200+ alerts/day) and finds nearby shelters in <500ms.",
    tags: ["Python", "FastAPI", "LangChain", "RAG", "FAISS", "Sentiment"],
    color: GOOGLE.YELLOW,
    details: {
      problem:
        "During crises, responders get slow, repetitive, and incomplete information.",
      solution:
        "Asynch REST ingest + RAG ranker with sentiment triage; smart context filtering to reduce duplication; shelter lookup pipeline.",
      impact:
        "≈85% response-time reduction, ≈80% duplicate info removed; sub-500ms shelter queries at ~95% accuracy.",
      links: [{ label: "GitHub", href: "#" }, { label: "Docs", href: "#" }, { label: "Demo", href: "#" }],
    },
  },
  {
    id: "heart-disease-classification",
    title: "Heart Disease Classification",
    summary:
      "End-to-end ML pipeline for tabular heart-disease risk prediction with clean EDA, feature engineering, and model selection.",
    tags: ["Python", "scikit-learn", "Classification", "EDA"],
    color: GOOGLE.INDIGO,
    details: {
      problem:
        "Clinical/tabular data needs a reliable classifier to flag potential heart-disease cases early.",
      solution:
        "Structured EDA → preprocessing (imputation, scaling, encoding) → model comparison (linear baselines + tree-based models) with cross-validation and clear metrics/plots.",
      impact:
        "Reproducible baseline for healthcare tabular tasks with documented pipeline and evaluation artifacts.",
      links: [{ label: "Repo", href: "https://github.com/Aaxhirrr/Heart-Disease-Classification" }],
    },
  },
];
