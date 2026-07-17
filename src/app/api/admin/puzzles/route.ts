import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.email === process.env.ADMIN_EMAIL ? session : null;
}

export async function GET() {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const puzzles = await prisma.puzzle.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { solvedPuzzles: true } } },
  });

  return NextResponse.json(puzzles);
}

export async function POST(req: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { title, fen, moves, category, mateIn, explanation } = await req.json();
  if (!title || !fen || !moves || !category) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
  }

  const puzzle = await prisma.puzzle.create({
    data: {
      title,
      fen,
      moves,
      difficulty: "medium",
      category,
      mateIn: category === "checkmate" ? (mateIn ?? computeMateIn(moves)) : null,
      explanation: explanation || null,
    },
  });
  return NextResponse.json(puzzle);
}

function computeMateIn(moves: string): string {
  const n = Math.ceil(moves.trim().split(/\s+/).filter(Boolean).length / 2);
  return n >= 5 ? "5+" : String(n);
}
