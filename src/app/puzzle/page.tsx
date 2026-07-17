"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { analyzeMultiPv } from "@/lib/stockfishClient";
import { buildMistakeReport, type MistakeReport } from "@/lib/mistakeExplanation";
import { EvalBar } from "@/components/EvalBar";
import { playMoveSound } from "@/lib/sound";

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
  explanation: string | null;
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

function pvToSan(fen: string, pv: string[]): string[] {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of pv) {
    let move;
    try {
      move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      break;
    }
    if (!move) break;
    sans.push(move.san);
  }
  return sans;
}

// Chess.com-style green board.
const CLASSIC_SQUARE_STYLES = {
  darkSquareStyle: { backgroundColor: "#769656" },
  lightSquareStyle: { backgroundColor: "#eeeed2" },
};

function PuzzlePageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isReview = searchParams.get("review") === "1";
  const [weakThemes, setWeakThemes] = useState<{ key: string; label: string; missRate: number }[]>([]);
  const [reviewEmpty, setReviewEmpty] = useState(false);
  const [reviewCandidateCount, setReviewCandidateCount] = useState(0);
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
  const [mistakeReport, setMistakeReport] = useState<MistakeReport | null>(null);
  const [mistakeLoading, setMistakeLoading] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [activeLine, setActiveLine] = useState(0);
  const [customReplayFen, setCustomReplayFen] = useState<string | null>(null);
  const mistakeRequestRef = useRef(0);

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
    if (isReview) {
      setReviewEmpty(false);
      fetch("/api/puzzles/review")
        .then((r) => r.json())
        .then((data: {
          puzzles: Puzzle[];
          weakThemes: { key: string; label: string; missRate: number }[];
          candidateCount: number;
        }) => {
          setWeakThemes(data.weakThemes ?? []);
          setReviewCandidateCount(data.candidateCount ?? 0);
          setPuzzles(data.puzzles ?? []);
          const next = pickRandomPuzzle(data.puzzles ?? []);
          if (next) loadPuzzle(next);
          else setReviewEmpty(true);
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
  }, [selectedCategory, selectedMateIn, selectedDifficulty, isReview]);

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
    mistakeRequestRef.current++;
    setMistakeReport(null);
    setMistakeLoading(false);
    setReplayIndex(0);
    setActiveLine(0);
    setCustomReplayFen(null);
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

  const analyzeMistake = async (fenAfterMove: string) => {
    const requestId = ++mistakeRequestRef.current;
    setMistakeLoading(true);
    const expectedLines = Math.min(3, new Chess(fenAfterMove).moves().length);
    try {
      const lines = await analyzeMultiPv(fenAfterMove, 14, 3, (partialLines) => {
        // Don't reveal a partial result (e.g. only 1 of 3 lines found so far) —
        // wait until the full expected line count has streamed in at least once.
        if (mistakeRequestRef.current !== requestId || partialLines.length < expectedLines) return;
        setMistakeLoading(false);
        setMistakeReport(buildMistakeReport(fenAfterMove, partialLines));
      });
      if (mistakeRequestRef.current !== requestId) return;
      setMistakeReport(buildMistakeReport(fenAfterMove, lines));
      setReplayIndex(0);
      setActiveLine(0);
      setCustomReplayFen(null);
    } catch {
      if (mistakeRequestRef.current !== requestId) return;
      setMistakeReport({ text: "분석에 실패했습니다.", lines: [] });
    } finally {
      if (mistakeRequestRef.current === requestId) setMistakeLoading(false);
    }
  };

  const activeLineReport = mistakeReport?.lines[activeLine] ?? null;

  useEffect(() => {
    if (!activeLineReport) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCustomReplayFen(null);
        setReplayIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        setCustomReplayFen(null);
        setReplayIndex((i) => Math.min(activeLineReport.replayFens.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeLineReport]);

  const replayPosition = activeLineReport
    ? customReplayFen ??
      activeLineReport.replayFens[Math.min(replayIndex, activeLineReport.replayFens.length - 1)]
    : null;

  const [customEvalCp, setCustomEvalCp] = useState<number | null>(null);
  const [customEvalMate, setCustomEvalMate] = useState<number | null>(null);
  const [customBestPv, setCustomBestPv] = useState<string[] | null>(null);
  const customEvalRequestRef = useRef(0);

  useEffect(() => {
    const requestId = ++customEvalRequestRef.current;
    if (!customReplayFen) {
      setCustomEvalCp(null);
      setCustomEvalMate(null);
      setCustomBestPv(null);
      return;
    }
    const sideToMove = customReplayFen.split(" ")[1] === "b" ? "b" : "w";
    const toWhitePerspective = (n: number) => (sideToMove === "w" ? n : -n);
    const applyTopLine = (lines: { scoreCp: number | null; scoreMate: number | null; pv: string[] }[]) => {
      if (customEvalRequestRef.current !== requestId) return;
      const top = lines[0];
      if (!top) return;
      setCustomEvalCp(top.scoreCp != null ? toWhitePerspective(top.scoreCp) : null);
      setCustomEvalMate(top.scoreMate != null ? toWhitePerspective(top.scoreMate) : null);
      setCustomBestPv(top.pv ?? null);
    };
    analyzeMultiPv(customReplayFen, 14, 1, applyTopLine).then(applyTopLine);
  }, [customReplayFen]);

  const customBestSan =
    customReplayFen && customBestPv ? pvToSan(customReplayFen, customBestPv) : null;

  const onReplayDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!replayPosition) return false;
    const chess = new Chess(replayPosition);
    let move;
    try {
      move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      return false;
    }
    if (!move) return false;
    playMoveSound();
    // Clear the previous position's live analysis immediately (not just via the
    // effect below) so a stale best-move PV never gets replayed against this new FEN.
    setCustomBestPv(null);
    setCustomEvalCp(null);
    setCustomEvalMate(null);
    setCustomReplayFen(chess.fen());
    return true;
  };

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (status !== "playing" || !currentPuzzle) return false;

    const expectedMove = solutionMoves[moveIndex];
    const playerMove = sourceSquare + targetSquare;

    const newGame = new Chess(game.fen());
    let result;
    try {
      result = newGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      return false;
    }
    if (!result) return false;
    playMoveSound();

    mistakeRequestRef.current++;
    setMistakeReport(null);
    setMistakeLoading(false);
    setReplayIndex(0);
    setActiveLine(0);
    setCustomReplayFen(null);

    if (playerMove === expectedMove) {
      const nextIndex = moveIndex + 1;
      setGame(newGame);
      setFen(newGame.fen());
      setMoveIndex(nextIndex);
      setHint("");

      if (nextIndex >= solutionMoves.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSolveTime(timeSeconds);
        setStatus("correct");
        if (session) {
          fetch("/api/puzzles/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzleId: currentPuzzle.id, attempts, timeSeconds }),
          });
        }
        const solved = currentPuzzle;
        setTimeout(() => loadNextPuzzle(solved), 500);
      } else {
        setTimeout(() => {
          const opponentMove = solutionMoves[nextIndex];
          const opponentGame = new Chess(newGame.fen());
          try {
            opponentGame.move({
              from: opponentMove.slice(0, 2),
              to: opponentMove.slice(2, 4),
              promotion: "q",
            });
          } catch {
            // Malformed puzzle solution data; leave the position as-is rather than crash.
          }
          playMoveSound();
          setGame(opponentGame);
          setFen(opponentGame.fen());
          setMoveIndex(nextIndex + 1);
        }, 400);
      }
    } else {
      setAttempts((a) => a + 1);
      setStatus("wrong");
      analyzeMistake(newGame.fen());
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
    `rounded-full transition border ${small ? "px-3 py-0.5 text-xs" : "px-3 py-1 text-sm"} ${
      active ? "filter-btn-active" : "filter-btn"
    }`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" style={{ fontFamily: "var(--font-ui)" }}>
      <h1
        className="text-4xl mb-6 tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
      >
        퍼즐 풀기
      </h1>

      {isReview ? (
        /* 복습 모드 배너 */
        <div className="panel-classic px-5 py-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              🔁 약점 복습 모드
            </span>
            <Link href="/puzzle" className="text-xs hover:underline" style={{ color: "var(--color-text-muted)" }}>
              복습 종료
            </Link>
          </div>
          {weakThemes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {weakThemes.map((w) => (
                <span
                  key={w.key}
                  className="text-xs px-2 py-0.5 rounded-full border"
                  style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-muted)" }}
                >
                  {w.label} · 오답률 {Math.round(w.missRate * 100)}%
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 필터 박스 */
        <div className="panel-classic px-5 py-4 mb-8 flex flex-col gap-3">
          {/* 전술 행 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => selectCategory("all")}
              className={btnClass(selectedCategory === "all")}
            >
              전체
            </button>
            <span style={{ color: "var(--color-gold-soft)" }} className="select-none mx-0.5">│</span>
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
          <div className="border-t" style={{ borderColor: "var(--color-gold-soft)" }} />

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
      )}

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* 체스판 */}
        <div className="flex-1">
          {currentPuzzle ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-w-[480px]">
                <Chessboard
                  key={currentPuzzle.id}
                  options={{
                    id: "main-board",
                    position: fen || currentPuzzle.fen,
                    boardOrientation: orientation,
                    ...CLASSIC_SQUARE_STYLES,
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

              <div className="panel-classic w-full max-w-[480px] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
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
                  <span className="text-sm" style={{ fontFamily: "var(--font-ui)", color: "var(--color-text-muted)" }}>
                    {status === "correct" && solveTime !== null
                      ? `${solveTime}초`
                      : `${elapsed}초`}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="w-3.5 h-3.5 rounded-full border"
                    style={{
                      background: orientation === "white" ? "var(--color-cream)" : "#1a1108",
                      borderColor: "var(--color-gold-soft)",
                    }}
                  />
                  <span className="text-sm" style={{ color: "var(--color-text)" }}>
                    {orientation === "white" ? "백" : "흑"}으로 플레이
                  </span>
                </div>

                {status === "correct" && (
                  <p style={{ color: "var(--color-gold)" }} className="font-semibold">
                    ✓ 정답입니다! ({attempts}번 시도 · {solveTime}초) — 다음 문제 로딩 중...
                  </p>
                )}
                {status === "wrong" && (
                  <p className="text-sm" style={{ fontFamily: "var(--font-ui)", color: "var(--color-text-muted)" }}>
                    이 수는 정답이 아닙니다. 다시 시도해보세요.
                  </p>
                )}
                {status === "playing" && !mistakeReport && !mistakeLoading && (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>올바른 수를 찾아보세요.</p>
                )}
                {hint && (
                  <p className="text-sm mt-1" style={{ color: "var(--color-gold)" }}>{hint}</p>
                )}

                {(mistakeLoading || mistakeReport) && (
                  <div
                    className="surface-dark mt-3 p-4 rounded-sm border"
                    style={{
                      background: "linear-gradient(180deg, var(--color-feedback-bg), var(--color-bg-panel-alt))",
                      borderColor: "var(--color-gold-soft)",
                    }}
                  >
                    {mistakeLoading ? (
                      <p className="text-xs" style={{ fontFamily: "var(--font-ui)", color: "var(--color-text-muted)" }}>
                        ◆ 분석 중...
                      </p>
                    ) : (
                      <>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ fontFamily: "var(--font-body)", color: "var(--color-cream)" }}
                        >
                          <span style={{ color: "var(--color-gold-bright)" }}>◆ </span>
                          {mistakeReport!.text}
                        </p>
                        {currentPuzzle.explanation && (
                          <p
                            className="text-sm leading-relaxed mt-2 pt-2 border-t"
                            style={{
                              fontFamily: "var(--font-body)",
                              color: "var(--color-text-muted)",
                              borderColor: "var(--color-gold-soft)",
                            }}
                          >
                            <span style={{ color: "var(--color-gold-bright)" }}>◆ </span>
                            {currentPuzzle.explanation}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-4 flex-wrap items-end">
                  {status === "playing" && (
                    <button onClick={showHint} className="btn-classic-outline text-sm px-3 py-1">
                      힌트
                    </button>
                  )}
                  <button onClick={() => loadPuzzle(currentPuzzle)} className="btn-classic-outline text-sm px-3 py-1">
                    다시 풀기
                  </button>
                  {session && (
                    <button
                      onClick={() => { setSaveError(""); setShowSaveMenu(true); }}
                      className="text-sm px-3 py-1 rounded-none border transition"
                      style={{
                        transitionDuration: "var(--motion-duration)",
                        borderColor: savedFolderId ? "var(--color-gold)" : "var(--color-gold-soft)",
                        color: savedFolderId ? "var(--color-gold)" : "var(--color-text-muted)",
                      }}
                    >
                      {savedFolderId ? "✓ 저장됨" : "저장"}
                    </button>
                  )}
                </div>

                <div className="flex gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--color-gold-soft)" }}>
                  {DIFFICULTY_OPTIONS.map((d) => {
                    const active = selectedDifficulty === d.value;
                    return (
                      <div key={d.value} className="flex flex-1 flex-col items-center gap-1" title={d.range}>
                        <span className="text-[10px] whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                          {d.range}
                        </span>
                        <button
                          onClick={() => selectDifficulty(d.value)}
                          className={`w-full text-sm px-3 py-1 border transition ${active ? "filter-btn-active" : "filter-btn"}`}
                        >
                          {d.label}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {saveError && !showSaveMenu && (
                  <p className="text-red-700 text-xs mt-2">{saveError}</p>
                )}
              </div>

              {!session && (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  풀이 기록을 저장하려면{" "}
                  <Link href="/login" style={{ color: "var(--color-gold)" }} className="hover:underline">
                    로그인
                  </Link>
                  하세요.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-sm text-center gap-2" style={{ color: "var(--color-text-muted)" }}>
              {isReview && reviewEmpty ? (
                reviewCandidateCount > 0 ? (
                  <>
                    <p>🎉 지금 복습할 문제가 없습니다.</p>
                    <p>약점 문제는 모두 예정된 시점까지 잘 기억하고 계세요. 나중에 다시 확인해보세요.</p>
                  </>
                ) : (
                  <>
                    <p>아직 복습할 약점 데이터가 부족합니다.</p>
                    <p>문제를 더 풀고 나서 다시 시도해보세요.</p>
                  </>
                )
              ) : (
                "왼쪽에서 퍼즐을 선택하세요."
              )}
            </div>
          )}
        </div>

        {/* 오답 반박 수순 재현 체스판 */}
        {mistakeReport && activeLineReport && (
          <div className="flex-1">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-3 w-full max-w-[480px] items-start">
                <EvalBar
                  scoreCpWhite={customReplayFen ? customEvalCp : activeLineReport.scoreCpWhite}
                  scoreMateWhite={customReplayFen ? customEvalMate : activeLineReport.scoreMateWhite}
                  orientation={orientation}
                  heightPx={480}
                />
                <div className="flex-1 min-w-0">
                  <Chessboard
                    key={`replay-${activeLine}-${replayIndex}`}
                    options={{
                      id: "replay-board",
                      position: replayPosition ?? undefined,
                      boardOrientation: orientation,
                      ...CLASSIC_SQUARE_STYLES,
                      boardStyle: {
                        borderRadius: "8px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                        width: "100%",
                      },
                      onPieceDrop: ({ sourceSquare, targetSquare }) => {
                        if (!targetSquare) return false;
                        return onReplayDrop(sourceSquare, targetSquare);
                      },
                      canDragPiece: ({ piece }) =>
                        !!replayPosition && piece.pieceType[0] === replayPosition.split(" ")[1],
                    }}
                  />
                </div>
              </div>

              {replayPosition && (
                <div
                  className="w-full max-w-[480px] text-center text-xs font-semibold py-1.5 rounded border"
                  style={{
                    fontFamily: "var(--font-ui)",
                    borderColor: "var(--color-gold-soft)",
                    background: replayPosition.split(" ")[1] === "w" ? "var(--color-cream)" : "#1a1108",
                    color: replayPosition.split(" ")[1] === "w" ? "#241505" : "var(--color-text-ondark)",
                  }}
                >
                  {replayPosition.split(" ")[1] === "w" ? "백 차례" : "흑 차례"}
                </div>
              )}

              {customReplayFen && customBestSan && customBestSan.length > 0 && (
                <div
                  className="w-full max-w-[480px] rounded-lg p-3 text-xs border"
                  style={{
                    background: "rgba(166, 124, 0, 0.08)",
                    borderColor: "var(--color-gold-soft)",
                    color: "var(--color-text)",
                  }}
                >
                  <span style={{ color: "var(--color-gold)" }} className="font-semibold">
                    실시간 엔진 추천:
                  </span>{" "}
                  {customBestSan[0]}
                  {customBestSan.length > 1 && (
                    <span style={{ color: "var(--color-text-muted)" }}> (전체: {customBestSan.join(" ")})</span>
                  )}
                </div>
              )}

              <div className="panel-classic w-full max-w-[480px] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    ◆ 엔진 추천 수순 (상위 {mistakeReport.lines.length}개)
                  </span>
                  <span className="text-xs" style={{ fontFamily: "var(--font-ui)", color: "var(--color-text-muted)" }}>
                    {activeLineReport.replaySan.length > 0
                      ? `${Math.min(replayIndex, activeLineReport.replaySan.length)} / ${activeLineReport.replaySan.length}`
                      : ""}
                  </span>
                </div>

                <div className="flex flex-col gap-2 mb-3">
                  {mistakeReport.lines.map((line, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setActiveLine(idx); setReplayIndex(0); setCustomReplayFen(null); }}
                      className="text-left px-3 py-2 rounded-lg border transition"
                      style={{
                        transitionDuration: "var(--motion-duration)",
                        borderColor: idx === activeLine ? "var(--color-gold)" : "var(--color-gold-soft)",
                        background: idx === activeLine ? "rgba(166, 124, 0, 0.1)" : "transparent",
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            fontFamily: "var(--font-ui)",
                            background:
                              line.evalText.startsWith("+") || line.evalText.startsWith("내")
                                ? "rgba(166, 124, 0, 0.18)"
                                : "rgba(92, 31, 31, 0.14)",
                            color:
                              line.evalText.startsWith("+") || line.evalText.startsWith("내")
                                ? "var(--color-gold)"
                                : "var(--color-wine)",
                          }}
                        >
                          {line.evalText}
                        </span>
                        <span className="text-sm leading-snug" style={{ color: "var(--color-text-muted)" }}>
                          {line.replaySan.map((san, i) => (
                            <span
                              key={i}
                              style={
                                idx !== activeLine
                                  ? undefined
                                  : i === replayIndex - 1
                                  ? { color: "var(--color-gold)", fontWeight: 700 }
                                  : i === replayIndex
                                  ? { color: "var(--color-text)", fontWeight: 700, textDecoration: "underline" }
                                  : undefined
                              }
                            >
                              {san}
                              {i < line.replaySan.length - 1 ? " " : ""}
                            </span>
                          ))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setCustomReplayFen(null); setReplayIndex((i) => Math.max(0, i - 1)); }}
                    disabled={replayIndex === 0}
                    className="btn-classic-outline text-sm px-3 py-1 disabled:opacity-30"
                  >
                    ◀ 이전
                  </button>
                  <button
                    onClick={() => {
                      setCustomReplayFen(null);
                      setReplayIndex((i) => Math.min(activeLineReport.replayFens.length - 1, i + 1));
                    }}
                    disabled={replayIndex >= activeLineReport.replayFens.length - 1}
                    className="btn-classic-outline text-sm px-3 py-1 disabled:opacity-30"
                  >
                    다음 ▶
                  </button>
                  <button
                    onClick={() => { setCustomReplayFen(null); setReplayIndex(0); }}
                    className="btn-classic-outline text-sm px-3 py-1"
                  >
                    처음부터
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 저장 모달 */}
      {showSaveMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowSaveMenu(false)}
        >
          <div
            className="panel-classic p-6 w-80"
            style={{ fontFamily: "var(--font-ui)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }} className="text-lg">
                폴더에 저장
              </h3>
              <button
                onClick={() => setShowSaveMenu(false)}
                style={{ color: "var(--color-text-muted)" }}
                className="text-xl leading-none hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            {saveError && (
              <p className="text-red-700 text-sm mb-3">{saveError}</p>
            )}

            {folders.length > 0 ? (
              <div className="flex flex-col gap-1 mb-4">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => savePuzzle(f.id)}
                    className="text-left text-sm px-3 py-2.5 rounded-lg transition flex items-center gap-2"
                    style={{
                      transitionDuration: "var(--motion-duration)",
                      background: savedFolderId === f.id ? "rgba(166, 124, 0, 0.12)" : "transparent",
                      color: savedFolderId === f.id ? "var(--color-gold)" : "var(--color-text)",
                      border: savedFolderId === f.id ? "1px solid var(--color-gold-soft)" : "1px solid transparent",
                    }}
                  >
                    <span>📁</span> {f.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
                폴더가 없습니다. 아래에서 만들어보세요.
              </p>
            )}

            <div className="border-t pt-4" style={{ borderColor: "var(--color-gold-soft)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>새 폴더 만들고 저장</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createFolderAndSave()}
                  placeholder="폴더 이름"
                  autoFocus={folders.length === 0}
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: "var(--color-bg-alt)",
                    border: "1px solid var(--color-gold-soft)",
                    color: "var(--color-text)",
                  }}
                />
                <button
                  onClick={createFolderAndSave}
                  disabled={!newFolderName.trim()}
                  className="btn-classic-gold text-sm px-4 py-2 disabled:opacity-50"
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

export default function PuzzlePage() {
  return (
    <Suspense fallback={null}>
      <PuzzlePageInner />
    </Suspense>
  );
}
