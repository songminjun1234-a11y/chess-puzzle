"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const Chessboard = dynamic(
  () => import("react-chessboard").then((m) => m.Chessboard),
  { ssr: false }
);

type Puzzle = {
  id: string;
  title: string;
  fen: string;
  moves: string;
  category: string;
  mateIn: string | null;
  difficulty: string;
  rating: number | null;
};

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "쉬움", range: "레이팅 1300 미만" },
  { value: "medium", label: "보통", range: "레이팅 1300~1799" },
  { value: "hard", label: "어려움", range: "레이팅 1800 이상" },
];

const TACTIC_CATEGORIES = [
  { value: "fork", label: "포크" },
  { value: "double_check", label: "더블체크" },
  { value: "skewer", label: "스큐어" },
  { value: "discovered", label: "디스커버드" },
  { value: "pin", label: "핀" },
  { value: "sacrifice", label: "희생" },
  { value: "defender_removal", label: "수비수 제거" },
  { value: "trap", label: "트랩" },
  { value: "zugzwang", label: "추크 추방" },
  { value: "zwischenzug", label: "사잇수" },
];

const MATE_IN_OPTIONS = ["1", "2", "3", "4", "5+"];

const CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(TACTIC_CATEGORIES.map((c) => [c.value, c.label])),
  checkmate: "체크메이트",
};

const themeKey = (p: Puzzle) =>
  p.category === "checkmate" ? `checkmate:${p.mateIn}` : p.category;

function pickRandomPuzzle(list: Puzzle[]): Puzzle | undefined {
  if (list.length === 0) return undefined;
  const groups = new Map<string, Puzzle[]>();
  for (const p of list) {
    const key = themeKey(p);
    const group = groups.get(key);
    if (group) group.push(p);
    else groups.set(key, [p]);
  }
  const keys = Array.from(groups.keys());
  const randomGroup = groups.get(keys[Math.floor(Math.random() * keys.length)])!;
  return randomGroup[Math.floor(Math.random() * randomGroup.length)];
}

export default function PuzzlePage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMateIn, setSelectedMateIn] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("");
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<"playing" | "correct" | "wrong">("playing");
  const [attempts, setAttempts] = useState(1);
  const [hint, setHint] = useState("");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [elapsed, setElapsed] = useState(0);
  const [solveTime, setSolveTime] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  type Folder = { id: string; name: string };
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (session) {
      fetch("/api/my/folders").then((r) => r.json()).then(setFolders);
    }
  }, [session]);

  useEffect(() => {
    const puzzleId = searchParams.get("id");
    if (puzzleId) {
      fetch(`/api/puzzles?id=${puzzleId}`)
        .then((r) => r.json())
        .then((data: Puzzle[]) => {
          if (data.length > 0) loadPuzzle(data[0]);
        });
      return;
    }
    const params = new URLSearchParams();
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedCategory === "checkmate" && selectedMateIn !== "all") {
      params.set("mateIn", selectedMateIn);
    }
    if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
    const query = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/puzzles${query}`)
      .then((r) => r.json())
      .then((data: Puzzle[]) => {
        setPuzzles(data);
        const next = pickRandomPuzzle(data);
        if (next) loadPuzzle(next);
      });
  }, [selectedCategory, selectedMateIn, selectedDifficulty]);

  const selectDifficulty = (diff: string) => {
    setSelectedDifficulty((prev) => (prev === diff ? "all" : diff));
  };

  const selectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedMateIn("all");
  };

  const loadPuzzle = (puzzle: Puzzle) => {
    const chess = new Chess(puzzle.fen);
    setGame(chess);
    setFen(puzzle.fen);
    setCurrentPuzzle(puzzle);
    setSolutionMoves(puzzle.moves.split(" "));
    setMoveIndex(0);
    setStatus("playing");
    setAttempts(1);
    setHint("");
    setOrientation(chess.turn() === "b" ? "black" : "white");
    if (timerRef.current) clearInterval(timerRef.current);
    setSolveTime(null);
    setElapsed(0);
    setShowSaveMenu(false);
    setSavedFolderId(null);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const loadNextPuzzle = (solved: Puzzle) => {
    const candidates =
      selectedCategory === "all"
        ? puzzles.filter((p) => p.id !== solved.id)
        : puzzles.filter(
            (p) =>
              p.id !== solved.id &&
              p.category === solved.category &&
              (selectedCategory !== "checkmate" || selectedMateIn === "all" || p.mateIn === selectedMateIn)
          );
    const next = pickRandomPuzzle(candidates);
    if (!next) return;
    loadPuzzle(next);
  };

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (status !== "playing" || !currentPuzzle) return false;

    const expectedMove = solutionMoves[moveIndex];
    const playerMove = sourceSquare + targetSquare;

    const newGame = new Chess(game.fen());
    const result = newGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    if (!result) return false;

    if (playerMove === expectedMove) {
      const nextIndex = moveIndex + 1;
      setGame(newGame);
      setFen(newGame.fen());
      setMoveIndex(nextIndex);
      setHint("");

      if (nextIndex >= solutionMoves.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setSolveTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        setStatus("correct");
        if (session) {
          fetch("/api/puzzles/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzleId: currentPuzzle.id, attempts }),
          });
        }
        const solved = currentPuzzle;
        setTimeout(() => loadNextPuzzle(solved), 500);
      } else {
        setTimeout(() => {
          const opponentMove = solutionMoves[nextIndex];
          const opponentGame = new Chess(newGame.fen());
          opponentGame.move({
            from: opponentMove.slice(0, 2),
            to: opponentMove.slice(2, 4),
            promotion: "q",
          });
          setGame(opponentGame);
          setFen(opponentGame.fen());
          setMoveIndex(nextIndex + 1);
        }, 400);
      }
    } else {
      setAttempts((a) => a + 1);
      setStatus("wrong");
      setTimeout(() => setStatus("playing"), 1200);
    }

    return true;
  };

  const savePuzzle = async (folderId: string) => {
    if (!currentPuzzle) return;
    setSaveError("");
    const res = await fetch(`/api/my/folders/${folderId}/puzzles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puzzleId: currentPuzzle.id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setSaveError(data?.error || "저장에 실패했습니다.");
      return;
    }
    setSavedFolderId(folderId);
    setShowSaveMenu(false);
  };

  const createFolderAndSave = async () => {
    if (!newFolderName.trim() || !currentPuzzle) return;
    setSaveError("");
    const res = await fetch("/api/my/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setSaveError(data?.error || "폴더 생성에 실패했습니다.");
      return;
    }
    const folder = await res.json();
    setFolders((prev) => [folder, ...prev]);
    await savePuzzle(folder.id);
    setNewFolderName("");
  };

  const showHint = () => {
    if (!currentPuzzle) return;
    const move = solutionMoves[moveIndex];
    setHint(`힌트: ${move.slice(0, 2)} → ${move.slice(2, 4)}`);
  };

  const btnClass = (active: boolean, small = false) =>
    `rounded-full font-medium transition border ${small ? "px-3 py-0.5 text-xs" : "px-3 py-1 text-sm"} ${
      active
        ? "bg-[#81b64c] border-[#81b64c] text-white"
        : "border-[#3d3a37] text-gray-400 hover:border-[#81b64c] hover:text-white"
    }`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">퍼즐 풀기</h1>

      {/* 필터 박스 */}
      <div className="bg-[#262421] border border-[#3d3a37] rounded-xl px-4 py-3 mb-6 flex flex-col gap-2.5">
        {/* 전술 행 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => selectCategory("all")}
            className={btnClass(selectedCategory === "all")}
          >
            전체
          </button>
          <span className="text-[#3d3a37] select-none mx-0.5">│</span>
          {TACTIC_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => selectCategory(cat.value)}
              className={btnClass(selectedCategory === cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 구분선 */}
        <div className="border-t border-[#3d3a37]" />

        {/* 체크메이트 행 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => selectCategory("checkmate")}
            className={btnClass(selectedCategory === "checkmate" && selectedMateIn === "all")}
          >
            체크메이트
          </button>
          {MATE_IN_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => { setSelectedCategory("checkmate"); setSelectedMateIn(n); }}
              className={btnClass(
                selectedCategory === "checkmate" && selectedMateIn === n,
                true
              )}
            >
              {n}수
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* 체스판 */}
        <div className="flex-1">
          {currentPuzzle ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-w-[480px]">
                <Chessboard
                  key={currentPuzzle.id}
                  options={{
                    position: fen || currentPuzzle.fen,
                    boardOrientation: orientation,
                    boardStyle: {
                      borderRadius: "8px",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                      width: "100%",
                    },
                    onPieceDrop: ({ sourceSquare, targetSquare }) => {
                      if (!targetSquare) return false;
                      return onDrop(sourceSquare, targetSquare);
                    },
                    canDragPiece: ({ piece }) => piece.pieceType[0] === game.turn(),
                  }}
                />
              </div>

              <div className="w-full max-w-[480px] bg-[#262421] border border-[#3d3a37] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    {selectedCategory === "all" ? (
                      "전체"
                    ) : (
                      <>
                        {CATEGORY_LABEL[currentPuzzle.category] ?? currentPuzzle.category}
                        {currentPuzzle.category === "checkmate" && currentPuzzle.mateIn
                          ? ` · ${currentPuzzle.mateIn}수`
                          : ""}
                      </>
                    )}
                    {currentPuzzle.rating != null && ` · 레이팅 ${currentPuzzle.rating}`}
                  </span>
                  <span className="text-sm font-mono text-gray-400">
                    {status === "correct" && solveTime !== null
                      ? `${solveTime}초`
                      : `${elapsed}초`}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-4 h-4 rounded-full border-2 ${orientation === "white" ? "bg-white border-gray-300" : "bg-gray-900 border-gray-500"}`}
                  />
                  <span className="text-sm text-gray-300">
                    {orientation === "white" ? "백" : "흑"}으로 플레이
                  </span>
                </div>

                {status === "correct" && (
                  <p className="text-green-400 font-semibold">✓ 정답입니다! ({attempts}번 시도 · {solveTime}초) — 다음 문제 로딩 중...</p>
                )}
                {status === "wrong" && (
                  <p className="text-red-400 font-semibold">✗ 틀렸습니다. 다시 시도해보세요.</p>
                )}
                {status === "playing" && (
                  <p className="text-gray-400 text-sm">올바른 수를 찾아보세요.</p>
                )}
                {hint && <p className="text-yellow-400 text-sm mt-1">{hint}</p>}

                <div className="flex gap-2 mt-3 flex-wrap items-end">
                  {status === "playing" && (
                    <button
                      onClick={showHint}
                      className="text-sm border border-[#3d3a37] hover:border-yellow-400 text-gray-400 hover:text-yellow-400 px-3 py-1 rounded transition"
                    >
                      힌트
                    </button>
                  )}
                  <button
                    onClick={() => loadPuzzle(currentPuzzle)}
                    className="text-sm border border-[#3d3a37] hover:border-white text-gray-400 hover:text-white px-3 py-1 rounded transition"
                  >
                    다시 풀기
                  </button>
                  {session && (
                    <button
                      onClick={() => { setSaveError(""); setShowSaveMenu(true); }}
                      className={`text-sm border px-3 py-1 rounded transition ${
                        savedFolderId
                          ? "border-blue-500/60 text-blue-400"
                          : "border-[#3d3a37] hover:border-blue-400 text-gray-400 hover:text-blue-400"
                      }`}
                    >
                      {savedFolderId ? "✓ 저장됨" : "저장"}
                    </button>
                  )}
                </div>

                <div className="flex gap-3 mt-3 pt-3 border-t border-[#3d3a37]">
                  {DIFFICULTY_OPTIONS.map((d) => {
                    const active = selectedDifficulty === d.value;
                    const activeClass =
                      d.value === "easy"
                        ? "bg-green-900/40 border-green-500/60 text-green-400"
                        : d.value === "medium"
                        ? "bg-yellow-900/40 border-yellow-500/60 text-yellow-400"
                        : "bg-red-900/40 border-red-500/60 text-red-400";
                    return (
                      <div key={d.value} className="flex flex-1 flex-col items-center gap-1" title={d.range}>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">{d.range}</span>
                        <button
                          onClick={() => selectDifficulty(d.value)}
                          className={`w-full text-sm border px-3 py-1 rounded transition ${
                            active
                              ? activeClass
                              : "border-[#3d3a37] text-gray-400 hover:text-white hover:border-white"
                          }`}
                        >
                          {d.label}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {saveError && !showSaveMenu && (
                  <p className="text-red-400 text-xs mt-2">{saveError}</p>
                )}
              </div>

              {!session && (
                <p className="text-gray-500 text-sm">
                  풀이 기록을 저장하려면{" "}
                  <Link href="/login" className="text-[#81b64c] hover:underline">
                    로그인
                  </Link>
                  하세요.
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              왼쪽에서 퍼즐을 선택하세요.
            </div>
          )}
        </div>
      </div>

      {/* 저장 모달 */}
      {showSaveMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowSaveMenu(false)}
        >
          <div
            className="bg-[#262421] border border-[#3d3a37] rounded-2xl shadow-2xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">폴더에 저장</h3>
              <button onClick={() => setShowSaveMenu(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            {saveError && (
              <p className="text-red-400 text-sm mb-3">{saveError}</p>
            )}

            {folders.length > 0 ? (
              <div className="flex flex-col gap-1 mb-4">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => savePuzzle(f.id)}
                    className={`text-left text-sm px-3 py-2.5 rounded-lg transition flex items-center gap-2 ${
                      savedFolderId === f.id
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                        : "hover:bg-[#3d3a37] text-gray-300"
                    }`}
                  >
                    <span>📁</span> {f.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-4">폴더가 없습니다. 아래에서 만들어보세요.</p>
            )}

            <div className="border-t border-[#3d3a37] pt-4">
              <p className="text-xs text-gray-500 mb-2">새 폴더 만들고 저장</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createFolderAndSave()}
                  placeholder="폴더 이름"
                  autoFocus={folders.length === 0}
                  className="flex-1 bg-[#3d3a37] border border-[#57534e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#81b64c]"
                />
                <button
                  onClick={createFolderAndSave}
                  disabled={!newFolderName.trim()}
                  className="bg-[#81b64c] hover:bg-[#6ba53a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] active:shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)] active:translate-y-px text-white text-sm px-3 py-2 rounded-lg transition disabled:opacity-50"
                >
                  만들기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
