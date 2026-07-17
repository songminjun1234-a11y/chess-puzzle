import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeWeaknesses } from "@/lib/weaknesses";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const userId = session.user.id;

  const solved = await prisma.solvedPuzzle.count({ where: { userId } });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentLogs = await prisma.solveLog.findMany({
    where: { userId, solvedAt: { gte: thirtyDaysAgo } },
    select: { attempts: true, timeSeconds: true },
  });

  const recentCount = recentLogs.length;
  const timedLogs = recentLogs.filter((l) => l.timeSeconds != null) as { timeSeconds: number }[];
  const avgSeconds =
    timedLogs.length > 0
      ? Math.round(timedLogs.reduce((sum, l) => sum + l.timeSeconds, 0) / timedLogs.length)
      : null;
  const oneShotCount = recentLogs.filter((l) => l.attempts === 1).length;
  const oneShotRate = recentCount > 0 ? Math.round((oneShotCount / recentCount) * 100) : null;

  const solvedRecords = await prisma.solvedPuzzle.findMany({
    where: { userId },
    include: { puzzle: { select: { category: true, mateIn: true, themes: true } } },
  });
  const weaknesses = computeWeaknesses(solvedRecords);

  const sentences: string[] = [];
  if (recentCount > 0) {
    sentences.push(`지난 30일간 ${recentCount}개의 국면을 분석했습니다.`);
  } else {
    sentences.push("최근 30일간 분석한 국면이 없습니다. 오늘 한 문제 풀어보시겠어요?");
  }
  if (avgSeconds != null) {
    sentences.push(`평균 ${avgSeconds}초 만에 문제를 해결하고 있습니다.`);
  }
  if (oneShotRate != null) {
    sentences.push(`최근 30일 중 ${oneShotRate}%의 문제를 한 번에 맞혔습니다.`);
  }
  sentences.push(`지금까지 총 ${solved}개의 서로 다른 퍼즐을 해결했습니다.`);
  if (weaknesses.length > 0) {
    sentences.push(`가장 자주 놓치는 유형은 '${weaknesses[0].label}'입니다.`);
  }

  return NextResponse.json({ solved, recentCount, avgSeconds, oneShotRate, sentences });
}
