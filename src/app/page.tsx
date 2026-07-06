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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 text-center">
      <h1 className="text-5xl font-bold mb-4 text-white">♟ 체스 퍼즐</h1>
      <p className="text-gray-400 text-lg mb-8 max-w-md">
        다양한 난이도의 체스 퍼즐을 풀며 실력을 향상시키세요.
      </p>
      <div className="flex gap-4 mb-10">
        <Link
          href="/puzzle"
          className="bg-[#81b64c] hover:bg-[#6ba53a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] active:shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)] active:translate-y-px text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          퍼즐 풀기 시작
        </Link>
        <Link
          href="/ranking"
          className="border border-[#3d3a37] hover:border-[#81b64c] text-gray-300 hover:text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          랭킹 보기
        </Link>
      </div>

      <div className="w-full max-w-md">
        <h2 className="text-lg font-bold text-white mb-3 text-left">🏆 랭킹</h2>
        <div className="bg-[#262421] border border-[#3d3a37] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#3d3a37] text-gray-400 text-sm">
                <th className="py-2 px-4 text-left">순위</th>
                <th className="py-2 px-4 text-left">이름</th>
                <th className="py-2 px-4 text-right">해결</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-500 text-sm">
                    아직 데이터가 없습니다.
                  </td>
                </tr>
              )}
              {ranking.slice(0, 10).map((entry, i) => (
                <tr
                  key={entry.id}
                  className="border-b border-[#3d3a37] last:border-0 hover:bg-[#3d3a37]/30 transition"
                >
                  <td className="py-2 px-4 font-bold text-gray-300 text-sm">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="py-2 px-4 text-white text-sm">{entry.name}</td>
                  <td className="py-2 px-4 text-right text-[#81b64c] font-semibold text-sm">
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
