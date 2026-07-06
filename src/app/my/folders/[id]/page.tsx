export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const CATEGORY_LABEL: Record<string, string> = {
  fork: "포크",
  pin: "핀",
  skewer: "스큐어",
  discovered: "디스커버드",
  sacrifice: "희생",
  checkmate: "체크메이트",
  doublecheck: "더블체크",
  trap: "트랩",
  deflection: "추크 추방",
};

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const folder = await prisma.folder.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!folder) redirect("/my");

  const items = await prisma.folderPuzzle.findMany({
    where: { folderId: id },
    include: { puzzle: true },
    orderBy: { createdAt: "desc" },
  });

  const puzzles = items.map((i) => i.puzzle);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my" className="text-gray-500 hover:text-white transition text-sm">← My</Link>
        <h1 className="text-2xl font-bold text-white">📁 {folder.name}</h1>
      </div>

      {puzzles.length === 0 ? (
        <p className="text-gray-500 text-sm">저장된 퍼즐이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {puzzles.map((p) => (
            <Link
              key={p.id}
              href={`/puzzle?id=${p.id}`}
              className="bg-[#262421] border border-[#3d3a37] hover:border-[#81b64c]/50 rounded-lg px-4 py-3 transition block"
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  {CATEGORY_LABEL[p.category] ?? p.category}
                  {p.category === "checkmate" && p.mateIn ? ` · ${p.mateIn}수` : ""}
                </span>
                <div className="flex items-center gap-2">
                  {p.rating != null && (
                    <span className="text-xs text-gray-500">레이팅 {p.rating}</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    p.difficulty === "easy" ? "bg-green-900/40 text-green-400" :
                    p.difficulty === "medium" ? "bg-yellow-900/40 text-yellow-400" :
                    "bg-red-900/40 text-red-400"
                  }`}>
                    {p.difficulty === "easy" ? "쉬움" : p.difficulty === "medium" ? "보통" : "어려움"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
