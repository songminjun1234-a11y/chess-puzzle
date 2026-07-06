"use client";

import { useEffect, useRef, useState } from "react";
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

type PuzzleRecord = {
  id: string;
  category: string;
  mateIn: string | null;
  difficulty: string;
  rating: number | null;
  attempts: number;
  solvedAt: string;
};

type Folder = { id: string; name: string; createdAt: string };

function PuzzleCard({ p }: { p: PuzzleRecord }) {
  return (
    <Link
      href="/puzzle"
      className="bg-[#262421] border border-[#3d3a37] rounded-lg px-4 py-3 hover:border-[#81b64c]/50 transition block"
    >
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-medium">
          {CATEGORY_LABEL[p.category] ?? p.category}
          {p.category === "checkmate" && p.mateIn ? ` · ${p.mateIn}수` : ""}
        </span>
        <span className="text-xs text-gray-500">{p.attempts}번 시도</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          p.difficulty === "easy" ? "bg-green-900/40 text-green-400" :
          p.difficulty === "medium" ? "bg-yellow-900/40 text-yellow-400" :
          "bg-red-900/40 text-red-400"
        }`}>
          {p.difficulty === "easy" ? "쉬움" : p.difficulty === "medium" ? "보통" : "어려움"}
        </span>
        {p.rating != null && (
          <span className="text-xs text-gray-500">레이팅 {p.rating}</span>
        )}
        <span className="text-xs text-gray-600">
          {new Date(p.solvedAt).toLocaleDateString("ko-KR")}
        </span>
      </div>
    </Link>
  );
}

export default function MyPage() {
  const { data: session, status } = useSession();
  const [correct, setCorrect] = useState<PuzzleRecord[]>([]);
  const [wrong, setWrong] = useState<PuzzleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"wrong" | "correct">("wrong");

  const [folders, setFolders] = useState<Folder[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/my/puzzles")
        .then((r) => r.json())
        .then((data) => {
          setCorrect(data.correct ?? []);
          setWrong(data.wrong ?? []);
          setLoading(false);
        });
      fetch("/api/my/folders")
        .then((r) => r.json())
        .then(setFolders);
    }
  }, [status]);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const createFolder = async () => {
    if (!folderName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/my/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName.trim() }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [folder, ...prev]);
    }
    setFolderName("");
    setShowInput(false);
    setCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") createFolder();
    if (e.key === "Escape") { setShowInput(false); setFolderName(""); }
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <p className="text-gray-400">
          <Link href="/login" className="text-[#81b64c] hover:underline">로그인</Link>이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">My</h1>

      {/* 폴더 섹션 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">폴더</h2>
          <button
            onClick={() => setShowInput(true)}
            className="w-6 h-6 rounded-md bg-[#3d3a37] hover:bg-[#81b64c] text-white flex items-center justify-center text-lg leading-none transition"
          >
            +
          </button>
        </div>

        {showInput && (
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="폴더 이름 입력"
              className="flex-1 bg-[#3d3a37] border border-[#57534e] focus:border-[#81b64c] rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
            />
            <button
              onClick={createFolder}
              disabled={creating || !folderName.trim()}
              className="bg-[#81b64c] hover:bg-[#6ba53a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] active:shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)] active:translate-y-px text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {creating ? "..." : "만들기"}
            </button>
            <button
              onClick={() => { setShowInput(false); setFolderName(""); }}
              className="text-gray-500 hover:text-white px-2 py-2 text-sm transition"
            >
              취소
            </button>
          </div>
        )}

        {folders.length === 0 ? (
          <p className="text-gray-600 text-sm">폴더가 없습니다. + 를 눌러 만들어보세요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {folders.map((f) => (
              <Link
                key={f.id}
                href={`/my/folders/${f.id}`}
                className="bg-[#262421] border border-[#3d3a37] hover:border-[#81b64c]/50 rounded-lg px-4 py-3 flex items-center gap-2 transition"
              >
                <span className="text-lg">📁</span>
                <span className="text-white text-sm truncate">{f.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 풀이 기록 섹션 */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">풀이 기록</h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("wrong")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === "wrong"
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "text-gray-400 border border-[#3d3a37] hover:text-white"
            }`}
          >
            틀린 문제 {!loading && <span className="ml-1 text-xs">({wrong.length})</span>}
          </button>
          <button
            onClick={() => setTab("correct")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === "correct"
                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                : "text-gray-400 border border-[#3d3a37] hover:text-white"
            }`}
          >
            한 번에 맞힌 문제 {!loading && <span className="ml-1 text-xs">({correct.length})</span>}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">불러오는 중...</p>
        ) : tab === "wrong" ? (
          wrong.length === 0 ? (
            <p className="text-gray-500 text-sm">틀린 문제가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {wrong.map((p) => <PuzzleCard key={p.id} p={p} />)}
            </div>
          )
        ) : (
          correct.length === 0 ? (
            <p className="text-gray-500 text-sm">한 번에 맞힌 문제가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {correct.map((p) => <PuzzleCard key={p.id} p={p} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
