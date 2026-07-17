"use client";

import { useEffect, useState } from "react";

type RankEntry = { id: string; name: string; solved: number };

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankEntry[]>([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setRanking);
  }, []);

  return (
    <div className="max-w-[600px] mx-auto px-4 py-10" style={{ fontFamily: "var(--font-ui)" }}>
      <h1
        className="text-4xl mb-8 text-center tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
      >
        명예의 전당
      </h1>

      <div className="panel-classic frame-tight overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b text-sm" style={{ color: "var(--color-text-muted)", borderColor: "var(--color-gold-soft)" }}>
              <th className="py-3 px-4 text-left font-normal">순위</th>
              <th className="py-3 px-4 text-left font-normal">이름</th>
              <th className="py-3 px-4 text-right font-normal">해결한 문제</th>
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  아직 데이터가 없습니다.
                </td>
              </tr>
            )}
            {ranking.map((entry, i) => (
              <tr
                key={entry.id}
                className="border-b last:border-0 transition"
                style={{ borderColor: "rgba(201,162,39,0.12)" }}
              >
                <td className="py-3 px-4 font-bold text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </td>
                <td className="py-3 px-4 text-sm" style={{ color: "var(--color-text)" }}>{entry.name}</td>
                <td className="py-3 px-4 text-right font-semibold text-sm" style={{ color: "var(--color-gold)" }}>
                  {entry.solved}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
