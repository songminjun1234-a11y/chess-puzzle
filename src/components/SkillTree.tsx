"use client";

import Link from "next/link";
import type { SkillNode } from "@/lib/skillTree";

const TIER_COLOR: Record<string, string> = {
  mastered: "#81b64c",
  learning: "var(--color-gold)",
  weak: "#e0685a",
  locked: "var(--color-text-muted)",
};

const TIER_LABEL: Record<string, string> = {
  mastered: "마스터",
  learning: "학습 중",
  weak: "약점",
  locked: "시작 전",
};

const RADIUS = 30;
const STROKE = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function practiceHref(node: SkillNode): string {
  if (node.tier === "locked") {
    const mateMatch = node.key.match(/^checkmate:(.+)$/);
    return mateMatch
      ? `/puzzle?category=checkmate&mateIn=${encodeURIComponent(mateMatch[1])}`
      : `/puzzle?category=${encodeURIComponent(node.key)}`;
  }
  return `/puzzle?review=1&theme=${encodeURIComponent(node.key)}`;
}

function SkillNodeCard({ node }: { node: SkillNode }) {
  const mastery = node.missRate == null ? 0 : 1 - node.missRate;
  const color = TIER_COLOR[node.tier];
  const dash = CIRCUMFERENCE * mastery;
  const faded = node.decayed;

  return (
    <Link
      href={practiceHref(node)}
      className="flex flex-col items-center gap-1.5 group"
      style={{ opacity: faded ? 0.55 : 1 }}
    >
      <div className="relative w-[72px] h-[72px] transition-transform group-hover:scale-105" style={{ transitionDuration: "var(--motion-duration)" }}>
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle
            cx="36"
            cy="36"
            r={RADIUS}
            fill="none"
            stroke="var(--color-gold-soft)"
            strokeOpacity={0.25}
            strokeWidth={STROKE}
          />
          {node.tier !== "locked" && (
            <circle
              cx="36"
              cy="36"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            />
          )}
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold"
          style={{ color }}
        >
          {node.tier === "locked" ? "🔒" : faded ? "⏰" : `${Math.round(mastery * 100)}%`}
        </div>
      </div>
      <span className="text-xs font-medium text-center" style={{ color: "var(--color-text)" }}>
        {node.label}
      </span>
      <span className="text-[11px]" style={{ color: faded ? "#e0a05a" : "var(--color-text-muted)" }}>
        {faded ? "복습 필요" : TIER_LABEL[node.tier]}
      </span>
    </Link>
  );
}

export function SkillTree({ nodes }: { nodes: SkillNode[] }) {
  return (
    <div
      className="grid gap-x-2 gap-y-5"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}
    >
      {nodes.map((node) => (
        <SkillNodeCard key={node.key} node={node} />
      ))}
    </div>
  );
}
