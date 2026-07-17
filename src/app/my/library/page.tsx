"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Folder = { id: string; name: string; createdAt: string };

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/my/folders")
        .then((r) => r.json())
        .then((data) => {
          setFolders(data);
          setLoading(false);
        });
    }
  }, [status]);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const createFolder = async () => {
    if (!folderName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/my/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName.trim() }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [folder, ...prev]);
    }
    setFolderName("");
    setShowInput(false);
    setCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") createFolder();
    if (e.key === "Escape") {
      setShowInput(false);
      setFolderName("");
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <p style={{ color: "var(--color-text-muted)" }}>
          <Link href="/login" style={{ color: "var(--color-gold)" }} className="hover:underline">
            로그인
          </Link>
          이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8" style={{ fontFamily: "var(--font-ui)" }}>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/my" className="text-sm hover:underline" style={{ color: "var(--color-text-muted)" }}>
          ← My
        </Link>
      </div>
      <h1
        className="text-4xl mb-2 tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
      >
        나의 서재
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        저장해 둔 퍼즐을 서가에 정리해두었습니다.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <h2 className="eyebrow-classic">
          서가
        </h2>
        <button
          onClick={() => setShowInput(true)}
          className="w-6 h-6 rounded-sm flex items-center justify-center text-lg leading-none transition"
          style={{
            transitionDuration: "var(--motion-duration)",
            border: "1px solid var(--color-gold-soft)",
            color: "var(--color-gold)",
          }}
        >
          +
        </button>
      </div>

      {showInput && (
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="서가 이름 입력"
            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              background: "var(--color-bg-alt)",
              border: "1px solid var(--color-gold-soft)",
              color: "var(--color-text)",
            }}
          />
          <button
            onClick={createFolder}
            disabled={creating || !folderName.trim()}
            className="btn-classic-gold px-4 py-2 text-sm disabled:opacity-50"
          >
            {creating ? "..." : "만들기"}
          </button>
          <button
            onClick={() => { setShowInput(false); setFolderName(""); }}
            className="px-2 py-2 text-sm transition"
            style={{ color: "var(--color-text-muted)", transitionDuration: "var(--motion-duration)" }}
          >
            취소
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          불러오는 중...
        </p>
      ) : folders.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          서가가 비어 있습니다. + 를 눌러 만들어보세요.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {folders.map((f) => (
            <Link
              key={f.id}
              href={`/my/library/${f.id}`}
              className="panel-classic px-4 py-3 flex items-center gap-2 transition"
              style={{ transitionDuration: "var(--motion-duration)" }}
            >
              <span style={{ color: "var(--color-gold)" }}>◆</span>
              <span className="text-sm truncate" style={{ color: "var(--color-text)" }}>
                {f.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
