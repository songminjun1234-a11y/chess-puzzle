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
  doublecheck: "더블체크",
  trap: "트랩",
  deflection: "추크 추방",
  mateIn1: "메이트1",
};

const DIFFICULTY_LABEL: Record<string, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };

type PuzzleRecord = {
  id: string;
  category: string;
  mateIn: string | null;
  difficulty: string;
  rating: number | null;
  attempts: number;
  solvedAt: string;
};

type Weakness = {
  key: string;
  label: string;
  total: number;
  struggled: number;
  missRate: number;
};

function PuzzleCard({ p }: { p: PuzzleRecord }) {
  return (
    <Link href="/puzzle" className="panel-classic px-4 py-3 transition block" style={{ transitionDuration: "var(--motion-duration)" }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          {CATEGORY_LABEL[p.category] ?? p.category}
          {p.category === "checkmate" && p.mateIn ? ` · ${p.mateIn}수` : ""}
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{p.attempts}번 시도</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span
          className="text-xs px-1.5 py-0.5 rounded-sm border"
          style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-gold)" }}
        >
          {DIFFICULTY_LABEL[p.difficulty] ?? p.difficulty}
        </span>
        {p.rating != null && (
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>레이팅 {p.rating}</span>
        )}
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {new Date(p.solvedAt).toLocaleDateString("ko-KR")}
        </span>
      </div>
    </Link>
  );
}

export default function MyPage() {
  const { status } = useSession();
  const [correct, setCorrect] = useState<PuzzleRecord[]>([]);
  const [wrong, setWrong] = useState<PuzzleRecord[]>([]);
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"wrong" | "correct">("wrong");
  const [sentences, setSentences] = useState<string[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/my/puzzles")
        .then((r) => r.json())
        .then((data) => {
          setCorrect(data.correct ?? []);
          setWrong(data.wrong ?? []);
          setWeaknesses(data.weaknesses ?? []);
          setLoading(false);
        });
      fetch("/api/stats/me")
        .then((r) => r.json())
        .then((data) => {
          setSentences(data.sentences ?? []);
          setStatsLoading(false);
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
      <h1
        className="text-4xl mb-8 tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
      >
        My
      </h1>

      {/* 통계 요약 (문장형) */}
      {!statsLoading && sentences.length > 0 && (
        <div className="panel-classic p-5 mb-6">
          <h2 className="eyebrow-classic mb-3">
            나의 발자취
          </h2>
          <div className="flex flex-col gap-1.5">
            {sentences.map((s, i) => (
              <p key={i} className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "var(--color-text)" }}>
                <span style={{ color: "var(--color-gold)" }}>◆ </span>
                {s}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 개인화된 피드백 */}
      {!loading && correct.length + wrong.length > 0 && (
        <div className="panel-classic p-5 mb-6">
          <h2 className="eyebrow-classic mb-3">
            개인화된 피드백
          </h2>
          {weaknesses.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              아직 패턴을 분석하기엔 데이터가 부족합니다. 문제를 더 풀어보세요.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {weaknesses.map((w) => (
                <div key={w.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: "var(--color-text)" }}>
                    <span style={{ color: "var(--color-gold)" }} className="mr-1.5">⚠</span>
                    {w.label} 관련 문제를 자주 놓칩니다
                  </span>
                  <span className="text-xs whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                    {w.total}문제 중 {w.struggled}번 여러 번 시도
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 서재 / 기보 다시보기 / 약점 분석 링크 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Link href="/my/library" className="panel-classic p-4 transition" style={{ transitionDuration: "var(--motion-duration)" }}>
          <div className="text-2xl mb-1">📁</div>
          <div style={{ color: "var(--color-text)" }} className="text-sm font-medium">
            나의 서재
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>저장한 퍼즐 모음</div>
        </Link>
        <Link href="/my/history" className="panel-classic p-4 transition" style={{ transitionDuration: "var(--motion-duration)" }}>
          <div className="text-2xl mb-1">🕘</div>
          <div style={{ color: "var(--color-text)" }} className="text-sm font-medium">
            기보 다시보기
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>풀이 기록 시간순 보기</div>
        </Link>
        <Link href="/my/analysis" className="panel-classic p-4 transition" style={{ transitionDuration: "var(--motion-duration)" }}>
          <div className="text-2xl mb-1">📊</div>
          <div style={{ color: "var(--color-text)" }} className="text-sm font-medium">
            약점 분석
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>오답 그래프로 보기</div>
        </Link>
      </div>

      {/* 풀이 기록 섹션 */}
      <div>
        <h2 className="eyebrow-classic mb-3">
          풀이 기록
        </h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("wrong")}
            className={`px-4 py-2 text-sm font-medium transition border ${tab === "wrong" ? "filter-btn-active" : "filter-btn"}`}
          >
            틀린 문제 {!loading && <span className="ml-1 text-xs">({wrong.length})</span>}
          </button>
          <button
            onClick={() => setTab("correct")}
            className={`px-4 py-2 text-sm font-medium transition border ${tab === "correct" ? "filter-btn-active" : "filter-btn"}`}
          >
            한 번에 맞힌 문제 {!loading && <span className="ml-1 text-xs">({correct.length})</span>}
          </button>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>불러오는 중...</p>
        ) : tab === "wrong" ? (
          wrong.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>틀린 문제가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {wrong.map((p) => <PuzzleCard key={p.id} p={p} />)}
            </div>
          )
        ) : correct.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>한 번에 맞힌 문제가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {correct.map((p) => <PuzzleCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
