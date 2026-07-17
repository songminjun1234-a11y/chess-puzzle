import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const logs = await prisma.solveLog.findMany({
    where: { userId: session.user.id },
    include: { puzzle: true },
    orderBy: { solvedAt: "desc" },
    take: 100,
  });

  const history = logs.map((log) => ({
    id: log.id,
    solvedAt: log.solvedAt,
    attempts: log.attempts,
    timeSeconds: log.timeSeconds,
    puzzle: {
      id: log.puzzle.id,
      title: log.puzzle.title,
      category: log.puzzle.category,
      mateIn: log.puzzle.mateIn,
      difficulty: log.puzzle.difficulty,
      rating: log.puzzle.rating,
    },
  }));

  return NextResponse.json(history);
}
