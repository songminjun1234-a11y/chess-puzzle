import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeNextReview, qualityFromAttempts } from "@/lib/spacedRepetition";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const userId = session.user.id;

  const { puzzleId, attempts, timeSeconds } = await req.json();

  await prisma.solvedPuzzle.upsert({
    where: { userId_puzzleId: { userId, puzzleId } },
    update: { attempts, solvedAt: new Date() },
    create: { userId, puzzleId, attempts },
  });

  // Separate append-only log (SolvedPuzzle is upserted per puzzle, so it can't
  // hold history) so past attempts remain visible in "기보 다시보기".
  await prisma.solveLog.create({
    data: { userId, puzzleId, attempts, timeSeconds: timeSeconds ?? null },
  });

  // Spaced-repetition scheduling: a clean solve pushes the next review further
  // out, a struggled one brings it back soon — drives the "약점 복습" queue.
  const existingReview = await prisma.puzzleReview.findUnique({
    where: { userId_puzzleId: { userId, puzzleId } },
  });
  const quality = qualityFromAttempts(attempts);
  const next = computeNextReview(existingReview, quality);
  await prisma.puzzleReview.upsert({
    where: { userId_puzzleId: { userId, puzzleId } },
    create: {
      userId,
      puzzleId,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      dueAt: next.dueAt,
      lastReviewedAt: new Date(),
    },
    update: {
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      dueAt: next.dueAt,
      lastReviewedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
