"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { BugReportButton } from "@/components/BugReportButton";

export function Navbar() {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  useEffect(() => {
    if (session) {
      fetch("/api/admin/me")
        .then((r) => r.json())
        .then((d) => setIsAdmin(d.isAdmin));
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  return (
    <nav
      className="surface-dark px-8 py-4 flex items-center justify-between border-b"
      style={{
        background: "linear-gradient(180deg, var(--color-bg-panel-alt), var(--color-bg-panel))",
        borderColor: "var(--color-gold-soft-ondark)",
      }}
    >
      <Link
        href="/"
        className="text-2xl tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold-bright)" }}
      >
        ♟ 체스 퍼즐
      </Link>
      <div
        className="flex items-center gap-6 text-[15px]"
        style={{ fontFamily: "var(--font-ui)", color: "var(--color-text-muted)" }}
      >
        <Link href="/puzzle" className="nav-link">
          퍼즐 풀기
        </Link>
        <Link href={session ? "/my" : "/register"} className="nav-link">
          My
        </Link>
        <Link href="/ranking" className="nav-link">
          랭킹
        </Link>
        <button
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setSoundEnabled(next);
          }}
          title={soundOn ? "효과음 끄기" : "효과음 켜기"}
          className="nav-link text-sm"
          aria-label={soundOn ? "효과음 끄기" : "효과음 켜기"}
        >
          {soundOn ? "♪ 소리 켜짐" : "♪ 소리 꺼짐"}
        </button>
        <Suspense fallback={null}>
          <BugReportButton />
        </Suspense>
        {session ? (
          <>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs px-2 py-0.5 rounded border"
                style={{ color: "var(--color-gold-bright)", borderColor: "var(--color-gold-soft)" }}
              >
                관리자
              </Link>
            )}
            <span style={{ color: "var(--color-text)" }}>{session.user?.name}</span>
            <button onClick={() => signOut()} className="btn-classic-gold-ondark px-4 py-1.5 text-sm">
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link">
              로그인
            </Link>
            <Link href="/register" className="btn-classic-gold-ondark px-4 py-1.5 text-sm">
              회원가입
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
