import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { puzzleId, attempts } = await req.json();

  await prisma.solvedPuzzle.upsert({
    where: { userId_puzzleId: { userId: session.user.id, puzzleId } },
    update: { attempts, solvedAt: new Date() },
    create: { userId: session.user.id, puzzleId, attempts },
  });

  return NextResponse.json({ success: true });
}
