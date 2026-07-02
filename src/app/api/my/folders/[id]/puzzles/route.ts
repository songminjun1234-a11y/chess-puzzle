import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const folder = await prisma.folder.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!folder) return NextResponse.json({ error: "폴더를 찾을 수 없습니다." }, { status: 404 });

  const items = await prisma.folderPuzzle.findMany({
    where: { folderId: params.id },
    include: { puzzle: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ folder, puzzles: items.map((i) => i.puzzle) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const folder = await prisma.folder.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!folder) return NextResponse.json({ error: "폴더를 찾을 수 없습니다." }, { status: 404 });

  const { puzzleId } = await req.json();

  await prisma.folderPuzzle.upsert({
    where: { folderId_puzzleId: { folderId: params.id, puzzleId } },
    update: {},
    create: { folderId: params.id, puzzleId },
  });

  return NextResponse.json({ success: true });
}
