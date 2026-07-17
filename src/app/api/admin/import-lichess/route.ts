import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Chess } from "chess.js";
import { ratingToDifficulty } from "@/lib/puzzleDifficulty";

function computeMateIn(moves: string): string {
  const n = Math.ceil(moves.trim().split(/\s+/).filter(Boolean).length / 2);
  return n >= 5 ? "5+" : String(n);
}

function themesToCategory(themes: string[]): { category: string; mateIn: string | null } {
  // 체크메이트 테마 우선
  const mateNumTheme = themes.find((t) => /^mateIn\d+$/.test(t));
  if (mateNumTheme || themes.some((t) => t === "mate" || t.startsWith("mate"))) {
    if (mateNumTheme) {
      const n = parseInt(mateNumTheme.replace("mateIn", ""));
      return { category: "checkmate", mateIn: n >= 5 ? "5+" : String(n) };
    }
    return { category: "checkmate", mateIn: null };
  }

  if (themes.includes("fork")) return { category: "fork", mateIn: null };
  if (themes.includes("pin")) return { category: "pin", mateIn: null };
  if (themes.includes("skewer")) return { category: "skewer", mateIn: null };
  if (themes.includes("discoveredAttack")) return { category: "discovered", mateIn: null };
  if (themes.includes("doubleCheck")) return { category: "double_check", mateIn: null };
  if (themes.includes("sacrifice") || themes.includes("attraction")) return { category: "sacrifice", mateIn: null };
  if (themes.includes("trappedPiece")) return { category: "trap", mateIn: null };
  if (themes.includes("zugzwang")) return { category: "zugzwang", mateIn: null };
  if (themes.includes("zwischenzug") || themes.includes("intermezzo")) return { category: "zwischenzug", mateIn: null };
  if (themes.includes("removingTheGuard") || themes.includes("capturingDefender")) {
    return { category: "defender_removal", mateIn: null };
  }

  return { category: "fork", mateIn: null };
}

function applyUciMove(chess: Chess, uci: string) {
  return chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4] || undefined,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json();

  // ── 1. Lichess 퍼즐 ID로 개별 가져오기 ──────────────────────────
  if (body.puzzleId) {
    const res = await fetch(`https://lichess.org/api/puzzle/${body.puzzleId}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Lichess에서 퍼즐을 찾을 수 없습니다." }, { status: 404 });
    }

    const data = await res.json();
    const { game, puzzle } = data;

    const chess = new Chess();
    chess.loadPgn(game.pgn);
    const history = chess.history({ verbose: true });

    const chess2 = new Chess();
    for (let i = 0; i < Math.min(puzzle.initialPly, history.length); i++) {
      chess2.move(history[i]);
    }

    const fen = chess2.fen();
    const moves = (puzzle.solution as string[]).join(" ");
    const difficulty = ratingToDifficulty(puzzle.rating);
    const { category, mateIn } = themesToCategory(puzzle.themes ?? []);
    const finalMateIn = category === "checkmate" ? (mateIn ?? computeMateIn(moves)) : null;

    const created = await prisma.puzzle.create({
      data: {
        title: `Lichess #${puzzle.id}`,
        fen,
        moves,
        difficulty,
        rating: puzzle.rating,
        category,
        mateIn: finalMateIn,
        themes: (puzzle.themes ?? []).join(","),
      },
    });

    return NextResponse.json({ success: true, imported: 1, puzzle: created });
  }

  // ── 2. CSV 업로드로 대량 가져오기 ──────────────────────────────
  if (body.csv) {
    const lines: string[] = (body.csv as string)
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean);

    const rows = lines[0].startsWith("PuzzleId") ? lines.slice(1) : lines;
    const limit = Math.min(body.count ?? 20, rows.length);

    const imported: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < limit; i++) {
      const parts = rows[i].split(",");
      if (parts.length < 4) continue;

      // PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,...
      const [lichessId, fen, movesRaw, ratingStr, , , , themesRaw] = parts;
      const allMoves = movesRaw.trim().split(" ");

      if (allMoves.length < 2) continue;

      const chess = new Chess(fen);
      if (!applyUciMove(chess, allMoves[0])) {
        errors.push(lichessId);
        continue;
      }

      const puzzleFen = chess.fen();
      const puzzleMoves = allMoves.slice(1).join(" ");
      const rating = parseInt(ratingStr) || 1500;
      const difficulty = ratingToDifficulty(rating);
      const themes = (themesRaw ?? "").trim().split(" ").filter(Boolean);
      const { category, mateIn } = themesToCategory(themes);
      const finalMateIn = category === "checkmate" ? (mateIn ?? computeMateIn(puzzleMoves)) : null;

      try {
        await prisma.puzzle.create({
          data: {
            title: `Lichess #${lichessId}`,
            fen: puzzleFen,
            moves: puzzleMoves,
            difficulty,
            rating,
            category,
            mateIn: finalMateIn,
            themes: themes.join(","),
          },
        });
        imported.push(lichessId);
      } catch {
        errors.push(lichessId);
      }
    }

    return NextResponse.json({ success: true, imported: imported.length, errors: errors.length });
  }

  return NextResponse.json({ error: "puzzleId 또는 csv를 제공해주세요." }, { status: 400 });
}
