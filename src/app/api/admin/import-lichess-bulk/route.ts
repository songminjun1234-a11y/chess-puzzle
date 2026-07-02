import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Chess } from "chess.js";

const ANGLE_MAP: Record<string, string> = {
  "checkmate:1":    "mateIn1",
  "checkmate:2":    "mateIn2",
  "checkmate:3":    "mateIn3",
  "checkmate:4":    "mateIn4",
  "checkmate:5+":   "mate",
  fork:             "fork",
  pin:              "pin",
  skewer:           "skewer",
  discovered:       "discoveredAttack",
  double_check:     "doubleCheck",
  sacrifice:        "sacrifice",
  trap:             "trappedPiece",
  zugzwang:         "zugzwang",
  zwischenzug:      "zwischenzug",
  defender_removal: "removingTheGuard",
};

const INIT_URL: Record<string, string> = {
  mateIn1:         "lichess.org/training/mateIn1",
  mateIn2:         "lichess.org/training/mateIn2",
  mateIn3:         "lichess.org/training/mateIn3",
  mateIn4:         "lichess.org/training/mateIn4",
  mate:            "lichess.org/training/mate",
  fork:            "lichess.org/training/fork",
  pin:             "lichess.org/training/pin",
  skewer:          "lichess.org/training/skewer",
  discoveredAttack:"lichess.org/training/discoveredAttack",
  doubleCheck:     "lichess.org/training/doubleCheck",
  sacrifice:       "lichess.org/training/sacrifice",
  trappedPiece:    "lichess.org/training/trappedPiece",
  zugzwang:        "lichess.org/training/zugzwang",
  zwischenzug:     "lichess.org/training/zwischenzug",
  removingTheGuard:"lichess.org/training/removingTheGuard",
};

function computeMateIn(moves: string): string {
  const n = Math.ceil(moves.trim().split(/\s+/).filter(Boolean).length / 2);
  return n >= 5 ? "5+" : String(n);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const token = process.env.LICHESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "LICHESS_TOKEN이 .env.local에 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { themeKey, count = 50 } = await req.json();
  const angle = ANGLE_MAP[themeKey];
  if (!angle) {
    return NextResponse.json({ error: "알 수 없는 테마입니다." }, { status: 400 });
  }

  const category = themeKey.startsWith("checkmate:") ? "checkmate" : themeKey;
  const mateInOverride = themeKey.startsWith("checkmate:") ? themeKey.replace("checkmate:", "") : null;

  const res = await fetch(
    `https://lichess.org/api/puzzle/batch/next?nb=${Math.min(count, 100)}&angle=${angle}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const minutes = Math.ceil((parseInt(retryAfter ?? "60")) / 60);
    return NextResponse.json(
      { error: `Lichess 요청 제한입니다. ${minutes}분 후 다시 시도하세요.` },
      { status: 429 }
    );
  }

  if (res.status === 404) {
    const url = INIT_URL[angle] ?? "lichess.org/training";
    return NextResponse.json(
      { error: `초기화 필요: ${url} 에서 퍼즐을 1개 이상 풀고 다시 시도하세요.` },
      { status: 404 }
    );
  }

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Lichess 오류 (${res.status}): ${text}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const puzzleItems: { game: { pgn: string }; puzzle: { id: string; initialPly: number; solution: string[] } }[] =
    data.puzzles ?? [];

  let imported = 0;
  let skipped = 0;

  for (const { game, puzzle } of puzzleItems) {
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      const history = chess.history({ verbose: true });

      const pos = new Chess();
      for (let i = 0; i < Math.min(puzzle.initialPly, history.length); i++) {
        pos.move(history[i]);
      }

      const fen = pos.fen();
      const moves = puzzle.solution.join(" ");
      const mateIn = mateInOverride ?? (category === "checkmate" ? computeMateIn(moves) : null);

      await prisma.puzzle.create({
        data: { title: `Lichess #${puzzle.id}`, fen, moves, difficulty: "medium", category, mateIn },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ success: true, imported, skipped });
}
