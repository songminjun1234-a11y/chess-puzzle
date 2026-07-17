"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const CATEGORY_LABEL: Record<string, string> = {
  fork: "포크",
  pin: "핀",
  skewer: "스큐어",
  discovered: "디스커버드",
  sacrifice: "희생",
  checkmate: "체크메이트",
  double_check: "더블체크",
  trap: "트랩",
  zugzwang: "추크 추방",
  zwischenzug: "사잇수",
  defender_removal: "수비수 제거",
};

const DIFFICULTY_LABEL: Record<string, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };

type HistoryEntry = {
  id: string;
  solvedAt: string;
  attempts: number;
  timeSeconds: number | null;
  puzzle: {
    id: string;
    title: string;
    category: string;
    mateIn: string | null;
    difficulty: string;
    rating: number | null;
  };
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function ResultBadge({ attempts }: { attempts: number }) {
  const label = attempts === 1 ? "단번에 해결" : `${attempts}번 시도 후 해결`;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-sm border"
      style={{
        borderColor: "var(--color-gold-soft)",
        color: attempts === 1 ? "var(--color-gold)" : "var(--color-text-muted)",
      }}
    >
      {label}
    </span>
  );
}

export default function HistoryPage() {
  const { status } = useSession();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/my/history")
        .then((r) => r.json())
        .then((data) => {
          setHistory(data);
          setLoading(false);
        });
    }
  }, [status]);

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <p style={{ color: "var(--color-text-muted)" }}>
          <Link href="/login" style={{ color: "var(--color-gold)" }} className="hover:underline">
            로그인
          </Link>
          이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8" style={{ fontFamily: "var(--font-ui)" }}>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/my" className="text-sm hover:underline" style={{ color: "var(--color-text-muted)" }}>
          ← My
        </Link>
      </div>
      <h1
        className="text-4xl mb-2 tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
      >
        기보 다시보기
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        지금까지 풀었던 국면들을 시간순으로 되짚어봅니다.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          불러오는 중...
        </p>
      ) : history.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          아직 풀이 기록이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((h) => (
            <Link
              key={h.id}
              href={`/puzzle?id=${h.puzzle.id}`}
              className="panel-classic px-4 py-3 transition block"
              style={{ transitionDuration: "var(--motion-duration)" }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {CATEGORY_LABEL[h.puzzle.category] ?? h.puzzle.category}
                  {h.puzzle.category === "checkmate" && h.puzzle.mateIn ? ` · ${h.puzzle.mateIn}수` : ""}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {formatDate(h.solvedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ResultBadge attempts={h.attempts} />
                {h.timeSeconds != null && (
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {h.timeSeconds}초 소요
                  </span>
                )}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-sm border"
                  style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-gold)" }}
                >
                  {DIFFICULTY_LABEL[h.puzzle.difficulty] ?? h.puzzle.difficulty}
                </span>
                {h.puzzle.rating != null && (
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    레이팅 {h.puzzle.rating}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
