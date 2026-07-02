import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const category = searchParams.get("category");
  const mateIn = searchParams.get("mateIn");

  const puzzles = await prisma.puzzle.findMany({
    where: {
      ...(id ? { id } : {}),
      ...(category ? { category } : {}),
      ...(mateIn ? { mateIn } : {}),
    },
    select: { id: true, title: true, fen: true, moves: true, category: true, mateIn: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(puzzles);
}
