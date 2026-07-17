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

const DIFFICULTY_LABEL: Record<string, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };

export default async function LibraryFolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const folder = await prisma.folder.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!folder) redirect("/my/library");

  const items = await prisma.folderPuzzle.findMany({
    where: { folderId: id },
    include: { puzzle: true },
    orderBy: { createdAt: "desc" },
  });

  const puzzles = items.map((i) => i.puzzle);

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8" style={{ fontFamily: "var(--font-ui)" }}>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/my/library" className="text-sm hover:underline" style={{ color: "var(--color-text-muted)" }}>
          ← 나의 서재
        </Link>
      </div>
      <h1
        className="text-3xl mb-6 tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
      >
        ◆ {folder.name}
      </h1>

      {puzzles.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          저장된 퍼즐이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {puzzles.map((p) => (
            <Link
              key={p.id}
              href={`/puzzle?id=${p.id}`}
              className="panel-classic px-4 py-3 transition block"
              style={{ transitionDuration: "var(--motion-duration)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {CATEGORY_LABEL[p.category] ?? p.category}
                  {p.category === "checkmate" && p.mateIn ? ` · ${p.mateIn}수` : ""}
                </span>
                <div className="flex items-center gap-2">
                  {p.rating != null && (
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      레이팅 {p.rating}
                    </span>
                  )}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-sm border"
                    style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-gold)" }}
                  >
                    {DIFFICULTY_LABEL[p.difficulty] ?? p.difficulty}
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
