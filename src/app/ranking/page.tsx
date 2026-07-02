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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">🏆 랭킹</h1>

      <div className="bg-[#16213e] border border-[#0f3460] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#0f3460] text-gray-400 text-sm">
              <th className="py-3 px-4 text-left">순위</th>
              <th className="py-3 px-4 text-left">이름</th>
              <th className="py-3 px-4 text-right">해결한 문제</th>
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-500">
                  아직 데이터가 없습니다.
                </td>
              </tr>
            )}
            {ranking.map((entry, i) => (
              <tr
                key={entry.id}
                className="border-b border-[#0f3460] last:border-0 hover:bg-[#0f3460]/30 transition"
              >
                <td className="py-3 px-4 font-bold text-gray-300">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </td>
                <td className="py-3 px-4 text-white">{entry.name}</td>
                <td className="py-3 px-4 text-right text-[#e94560] font-semibold">
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
