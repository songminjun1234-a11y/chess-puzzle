import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeThemeBreakdown } from "@/lib/weaknesses";

const TREND_DAYS = 30;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const userId = session.user.id;

  const solvedRecords = await prisma.solvedPuzzle.findMany({
    where: { userId },
    include: { puzzle: { select: { category: true, mateIn: true, themes: true } } },
  });
  const themeBreakdown = computeThemeBreakdown(solvedRecords);

  const since = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);
  const logs = await prisma.solveLog.findMany({
    where: { userId, solvedAt: { gte: since } },
    select: { solvedAt: true, attempts: true },
    orderBy: { solvedAt: "asc" },
  });

  const byDay = new Map<string, { total: number; oneShot: number }>();
  for (const log of logs) {
    const key = dateKey(log.solvedAt);
    const entry = byDay.get(key) ?? { total: 0, oneShot: 0 };
    entry.total += 1;
    if (log.attempts === 1) entry.oneShot += 1;
    byDay.set(key, entry);
  }

  const dailyTrend: { date: string; accuracy: number | null; count: number }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = dateKey(d);
    const entry = byDay.get(key);
    dailyTrend.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      accuracy: entry ? Math.round((entry.oneShot / entry.total) * 100) : null,
      count: entry?.total ?? 0,
    });
  }

  return NextResponse.json({ themeBreakdown, dailyTrend });
}
