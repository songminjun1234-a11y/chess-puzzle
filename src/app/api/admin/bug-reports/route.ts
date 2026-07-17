import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const reports = await prisma.bugReport.findMany({
    include: {
      user: { select: { name: true, email: true } },
      puzzle: { select: { title: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(reports);
}
