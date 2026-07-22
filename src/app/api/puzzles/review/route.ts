import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeThemeBreakdown } from "@/lib/weaknesses";
import { CATEGORY_FALLBACK_LABEL, checkmateFallbackLabel } from "@/lib/themeLabels";
import type { Prisma } from "@prisma/client";

const MAX_WEAK_THEMES = 5;
const MAX_PUZZLES = 30;

function whereForThemeKey(key: string): Prisma.PuzzleWhereInput {
  const mateMatch = key.match(/^checkmate:(.+)$/);
  if (mateMatch) {
    return { category: "checkmate", mateIn: mateMatch[1] };
  }
  return {
    OR: [{ category: key }, { themes: { contains: key } }],
  };
}

function fallbackLabelFor(key: string): string {
  const mateMatch = key.match(/^checkmate:(.+)$/);
  if (mateMatch) return checkmateFallbackLabel(mateMatch[1]);
  return CATEGORY_FALLBACK_LABEL[key] ?? key;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const userId = session.user.id;

  // A single skill-tree node the user clicked directly, instead of the
  // auto-picked "top weak themes" set.
  const themeParam = req.nextUrl.searchParams.get("theme");

  const solvedRecords = await prisma.solvedPuzzle.findMany({
    where: { userId },
    include: { puzzle: { select: { category: true, mateIn: true, themes: true } } },
  });

  const breakdown = computeThemeBreakdown(solvedRecords);
  const weakThemes = themeParam
    ? [
        {
          key: themeParam,
          label: breakdown.find((w) => w.key === themeParam)?.label ?? fallbackLabelFor(themeParam),
          missRate: breakdown.find((w) => w.key === themeParam)?.missRate ?? 0,
        },
      ]
    : breakdown.filter((w) => w.missRate > 0).slice(0, MAX_WEAK_THEMES);

  if (weakThemes.length === 0) {
    return NextResponse.json({ puzzles: [], weakThemes: [], candidateCount: 0 });
  }

  const candidates = await prisma.puzzle.findMany({
    where: { OR: weakThemes.map((w) => whereForThemeKey(w.key)) },
    select: {
      id: true,
      title: true,
      fen: true,
      moves: true,
      category: true,
      mateIn: true,
      difficulty: true,
      rating: true,
      explanation: true,
    },
  });

  const reviews = await prisma.puzzleReview.findMany({
    where: { userId, puzzleId: { in: candidates.map((p) => p.id) } },
    select: { puzzleId: true, dueAt: true },
  });
  const dueAtByPuzzle = new Map(reviews.map((r) => [r.puzzleId, r.dueAt]));

  const now = new Date();
  // A puzzle with no review record yet has never been scheduled — treat it as
  // due immediately. Otherwise only show it once its scheduled date arrives.
  const due = candidates.filter((p) => {
    const dueAt = dueAtByPuzzle.get(p.id);
    return !dueAt || dueAt <= now;
  });

  // Shuffle before capping so every due puzzle has a chance to surface,
  // instead of always the same fixed prefix of the candidate list.
  for (let i = due.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [due[i], due[j]] = [due[j], due[i]];
  }

  return NextResponse.json({
    puzzles: due.slice(0, MAX_PUZZLES),
    weakThemes: weakThemes.map((w) => ({ key: w.key, label: w.label, missRate: w.missRate })),
    candidateCount: candidates.length,
  });
}
