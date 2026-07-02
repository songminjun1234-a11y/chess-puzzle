import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const records = await prisma.solvedPuzzle.findMany({
    where: { userId: session.user.id },
    include: { puzzle: true },
    orderBy: { solvedAt: "desc" },
  });

  const correct = records.filter((r) => r.attempts === 1).map((r) => ({ ...r.puzzle, attempts: r.attempts, solvedAt: r.solvedAt }));
  const wrong = records.filter((r) => r.attempts > 1).map((r) => ({ ...r.puzzle, attempts: r.attempts, solvedAt: r.solvedAt }));

  return NextResponse.json({ correct, wrong });
}
