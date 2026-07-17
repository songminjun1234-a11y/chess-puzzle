"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RankEntry = { id: string; name: string; solved: number };

export default function Home() {
  const [ranking, setRanking] = useState<RankEntry[]>([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setRanking);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-72px)] px-6 py-20 text-center">
      <h1
        className="text-6xl mb-5 tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
      >
        ♟ 체스 퍼즐
      </h1>
      <div className="w-16 h-px mb-6" style={{ background: "var(--color-gold-soft)" }} />
      <p
        className="text-xl mb-12 max-w-lg leading-relaxed"
        style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}
      >
        다양한 난이도의 체스 퍼즐을 풀며 실력을 향상시키세요.
      </p>
      <div className="flex gap-5 mb-16">
        <Link href="/puzzle" className="btn-classic-gold px-8 py-3 text-lg">
          퍼즐 풀기 시작
        </Link>
        <Link href="/ranking" className="btn-classic-outline px-8 py-3 text-lg">
          랭킹 보기
        </Link>
      </div>

      <div className="w-full max-w-md">
        <h2
          className="text-lg font-bold mb-3 text-left"
          style={{ color: "var(--color-text)" }}
        >
          🏆 랭킹
        </h2>
        <div className="panel-classic frame-tight overflow-hidden">
          <table className="w-full" style={{ fontFamily: "var(--font-ui)" }}>
            <thead>
              <tr
                className="text-sm border-b"
                style={{ color: "var(--color-text-muted)", borderColor: "var(--color-gold-soft)" }}
              >
                <th className="py-3 px-5 text-left font-normal">순위</th>
                <th className="py-3 px-5 text-left font-normal">이름</th>
                <th className="py-3 px-5 text-right font-normal">해결</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-8 text-center text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    아직 데이터가 없습니다.
                  </td>
                </tr>
              )}
              {ranking.slice(0, 10).map((entry, i) => (
                <tr
                  key={entry.id}
                  className="border-b last:border-0 transition-colors"
                  style={{ borderColor: "rgba(201,162,39,0.12)", transitionDuration: "var(--motion-duration)" }}
                >
                  <td className="py-3 px-5 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="py-3 px-5 text-sm" style={{ color: "var(--color-text)" }}>
                    {entry.name}
                  </td>
                  <td
                    className="py-3 px-5 text-right text-sm font-semibold"
                    style={{ color: "var(--color-gold)" }}
                  >
                    {entry.solved}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
