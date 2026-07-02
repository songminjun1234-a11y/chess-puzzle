import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      solvedPuzzles: {
        select: { puzzleId: true },
      },
    },
  });

  const ranking = users
    .map((u) => ({ id: u.id, name: u.name, solved: u.solvedPuzzles.length }))
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 20);

  return NextResponse.json(ranking);
}
