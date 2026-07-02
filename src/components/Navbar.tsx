"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

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
    <nav className="bg-[#16213e] border-b border-[#0f3460] px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-[#e94560]">
        ♟ 체스 퍼즐
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/puzzle" className="hover:text-white text-gray-300">
          퍼즐 풀기
        </Link>
        <Link href={session ? "/my" : "/register"} className="hover:text-white text-gray-300">
          My
        </Link>
        <Link href="/ranking" className="hover:text-white text-gray-300">
          랭킹
        </Link>
        {session ? (
          <>
            {isAdmin && (
              <Link href="/admin" className="hover:text-white text-yellow-400 text-xs border border-yellow-400/40 px-2 py-0.5 rounded">
                관리자
              </Link>
            )}
            <span className="text-gray-400">{session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="bg-[#e94560] hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-white text-gray-300">
              로그인
            </Link>
            <Link
              href="/register"
              className="bg-[#e94560] hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
