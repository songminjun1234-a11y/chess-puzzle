"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

type Puzzle = {
  id: string;
  title: string;
  category: string;
  mateIn: string | null;
  fen: string;
  moves: string;
  createdAt: string;
  _count: { solvedPuzzles: number };
};

const TACTIC_CATEGORIES = [
  { value: "fork", label: "포크" },
  { value: "double_check", label: "더블체크" },
  { value: "skewer", label: "스큐어" },
  { value: "discovered", label: "디스커버드" },
  { value: "pin", label: "핀" },
  { value: "sacrifice", label: "희생" },
  { value: "defender_removal", label: "수비수 제거" },
  { value: "trap", label: "트랩" },
  { value: "zugzwang", label: "추크 추방" },
  { value: "zwischenzug", label: "사잇수" },
];

const CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(TACTIC_CATEGORIES.map((c) => [c.value, c.label])),
  checkmate: "체크메이트",
};

const MATE_IN_OPTIONS = ["1", "2", "3", "4", "5+"];

type Tab = "list" | "add" | "lichess" | "generate" | "bugs";

type BugReport = {
  id: string;
  message: string;
  pageUrl: string | null;
  status: string;
  createdAt: string;
  user: { name: string; email: string } | null;
  puzzle: { title: string } | null;
};

function statusColor(msg: string): string {
  if (msg.startsWith("✓")) return "var(--color-gold)";
  if (msg.startsWith("✗")) return "#e07a7a";
  return "var(--color-text-muted)";
}

export default function AdminPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("list");
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [form, setForm] = useState({ title: "", fen: "", moves: "", category: "fork", mateIn: "1", explanation: "" });

  // Lichess 가져오기
  const [lichessId, setLichessId] = useState("");
  const [csvCount, setCsvCount] = useState(20);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState("");

  // 테마별 일괄 가져오기
  const BULK_THEMES = [
    { key: "checkmate:1", label: "체크메이트 1수" },
    { key: "checkmate:2", label: "체크메이트 2수" },
    { key: "checkmate:3", label: "체크메이트 3수" },
    { key: "checkmate:4", label: "체크메이트 4수" },
    { key: "checkmate:5+", label: "체크메이트 5+수" },
    { key: "fork",             label: "포크" },
    { key: "pin",              label: "핀" },
    { key: "skewer",           label: "스큐어" },
    { key: "discovered",       label: "디스커버드" },
    { key: "double_check",     label: "더블체크" },
    { key: "sacrifice",        label: "희생" },
    { key: "trap",             label: "트랩" },
    { key: "zugzwang",         label: "추크 추방" },
    { key: "zwischenzug",      label: "사잇수" },
    { key: "defender_removal", label: "수비수 제거" },
  ];
  const [bulkCounts, setBulkCounts] = useState<Record<string, number>>(
    Object.fromEntries(BULK_THEMES.map((t) => [t.key, 100]))
  );
  const [bulkStatus, setBulkStatus] = useState<Record<string, string>>({});
  const [bulkLoading, setBulkLoading] = useState<Record<string, boolean>>({});

  // 자동 생성
  const [genCount, setGenCount] = useState(50);
  const [genStatus, setGenStatus] = useState<Record<string, string>>({});
  const [genLoading, setGenLoading] = useState<Record<string, boolean>>({});

  // 버그 신고
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [bugFilter, setBugFilter] = useState<"open" | "all">("open");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/admin/me")
        .then((r) => r.json())
        .then((d) => {
          setIsAdmin(d.isAdmin);
          if (d.isAdmin) {
            fetchPuzzles();
            fetchBugReports();
          }
        });
    }
  }, [status]);

  async function fetchBugReports() {
    const res = await fetch("/api/admin/bug-reports");
    if (res.ok) setBugReports(await res.json());
  }

  async function updateBugStatus(id: string, newStatus: "open" | "resolved") {
    const res = await fetch(`/api/admin/bug-reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchBugReports();
  }

  async function deleteBugReport(id: string) {
    if (!confirm("이 신고를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/bug-reports/${id}`, { method: "DELETE" });
    if (res.ok) fetchBugReports();
  }

  async function fetchPuzzles() {
    const res = await fetch("/api/admin/puzzles");
    if (res.ok) setPuzzles(await res.json());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const body = {
      title: form.title,
      fen: form.fen,
      moves: form.moves,
      category: form.category,
      mateIn: form.category === "checkmate" ? form.mateIn : undefined,
      explanation: form.explanation || undefined,
    };

    const res = await fetch("/api/admin/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.ok) {
      setMessage("퍼즐이 추가되었습니다!");
      setForm({ title: "", fen: "", moves: "", category: "fork", mateIn: "1", explanation: "" });
      fetchPuzzles();
      setTab("list");
    } else {
      const d = await res.json();
      setMessage(d.error || "오류가 발생했습니다.");
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 퍼즐을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/puzzles/${id}`, { method: "DELETE" });
    if (res.ok) fetchPuzzles();
  }

  async function handleGenerate(mateIn: string) {
    setGenLoading((p) => ({ ...p, [mateIn]: true }));
    setGenStatus((p) => ({ ...p, [mateIn]: `생성 중... (최대 25초)` }));
    const res = await fetch("/api/admin/generate-puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mateIn, count: genCount }),
    });
    const data = await res.json();
    setGenLoading((p) => ({ ...p, [mateIn]: false }));
    if (res.ok) {
      setGenStatus((p) => ({ ...p, [mateIn]: `✓ ${data.imported}개 생성 완료` }));
      fetchPuzzles();
    } else {
      setGenStatus((p) => ({ ...p, [mateIn]: `✗ ${data.error}` }));
    }
  }

  async function handleBulkImport(themeKey: string) {
    setBulkLoading((p) => ({ ...p, [themeKey]: true }));
    setBulkStatus((p) => ({ ...p, [themeKey]: "가져오는 중..." }));
    const res = await fetch("/api/admin/import-lichess-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeKey, count: bulkCounts[themeKey] ?? 100 }),
    });
    const data = await res.json();
    setBulkLoading((p) => ({ ...p, [themeKey]: false }));
    if (res.ok) {
      setBulkStatus((p) => ({ ...p, [themeKey]: `✓ ${data.imported}개 완료` }));
      fetchPuzzles();
    } else {
      setBulkStatus((p) => ({ ...p, [themeKey]: `✗ ${data.error}` }));
    }
  }

  async function handleImportById() {
    if (!lichessId.trim()) return;
    setImportMsg("가져오는 중...");
    const res = await fetch("/api/admin/import-lichess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puzzleId: lichessId.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setImportMsg(`✓ "${data.puzzle.title}" 가져오기 완료!`);
      setLichessId("");
      fetchPuzzles();
    } else {
      setImportMsg(`✗ ${data.error}`);
    }
  }

  async function handleImportCsv() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setImportMsg("CSV 읽는 중...");
    const csv = await file.text();
    setImportMsg("서버에 전송 중...");

    const res = await fetch("/api/admin/import-lichess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, count: csvCount }),
    });

    const data = await res.json();
    if (res.ok) {
      setImportMsg(`✓ ${data.imported}개 가져오기 완료! (실패: ${data.errors}개)`);
      fetchPuzzles();
    } else {
      setImportMsg(`✗ ${data.error}`);
    }
  }

  if (status === "loading" || isAdmin === null) {
    return <div className="text-center py-20" style={{ color: "var(--color-text-muted)" }}>로딩 중...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20 text-red-700">
        관리자만 접근할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" style={{ fontFamily: "var(--font-ui)" }}>
      <h1
        className="text-4xl mb-8 tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
      >
        ⚙️ 관리자 페이지
      </h1>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {(["list", "add", "generate", "lichess", "bugs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMessage(""); setImportMsg(""); }}
            className={`px-4 py-2 text-sm font-medium transition border ${tab === t ? "filter-btn-active" : "filter-btn"}`}
          >
            {t === "list"
              ? `퍼즐 목록 (${puzzles.length})`
              : t === "add"
              ? "퍼즐 추가"
              : t === "generate"
              ? "자동 생성"
              : t === "lichess"
              ? "Lichess 가져오기"
              : `버그 신고 (${bugReports.filter((b) => b.status === "open").length})`}
          </button>
        ))}
      </div>

      {/* ── 퍼즐 목록 ── */}
      {tab === "list" && (
        <div className="panel-classic frame-tight overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ color: "var(--color-text-muted)", borderColor: "var(--color-gold-soft)" }}>
                <th className="py-3 px-4 text-left font-normal">제목</th>
                <th className="py-3 px-4 text-left font-normal">분류</th>
                <th className="py-3 px-4 text-center font-normal">풀이 수</th>
                <th className="py-3 px-4 text-right font-normal">삭제</th>
              </tr>
            </thead>
            <tbody>
              {puzzles.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
                    퍼즐이 없습니다.
                  </td>
                </tr>
              )}
              {puzzles.map((p) => (
                <tr key={p.id} className="border-b last:border-0 transition" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
                  <td className="py-3 px-4 font-medium" style={{ color: "var(--color-text)" }}>{p.title}</td>
                  <td className="py-3 px-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {CATEGORY_LABEL[p.category] ?? p.category}
                    {p.category === "checkmate" && p.mateIn ? ` ${p.mateIn}수` : ""}
                  </td>
                  <td className="py-3 px-4 text-center" style={{ color: "var(--color-text-muted)" }}>
                    {p._count.solvedPuzzles}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      className="text-red-700 hover:text-red-800 text-xs border border-red-700/30 hover:border-red-700 px-2 py-1 rounded transition"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 퍼즐 추가 ── */}
      {tab === "add" && (
        <div className="panel-classic p-6 max-w-xl">
          <h2 className="text-xl mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
            새 퍼즐 추가
          </h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="label-classic">제목</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 핀 전술 #7"
                className="input-classic"
                required
              />
            </div>
            <div>
              <label className="label-classic">
                FEN <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>(퍼즐 시작 위치)</span>
              </label>
              <input
                type="text"
                value={form.fen}
                onChange={(e) => setForm({ ...form, fen: e.target.value })}
                placeholder="예: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
                className="input-classic font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="label-classic">
                정답 수순 <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>(UCI 형식, 공백 구분)</span>
              </label>
              <input
                type="text"
                value={form.moves}
                onChange={(e) => setForm({ ...form, moves: e.target.value })}
                placeholder="예: e2e4 e7e5 d1h5"
                className="input-classic font-mono"
                required
              />
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                플레이어 수 → 상대 응수 → 플레이어 수 순으로 입력
              </p>
            </div>
            <div>
              <label className="label-classic">분류</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-classic"
              >
                {TACTIC_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                <option value="checkmate">체크메이트</option>
              </select>
            </div>
            {form.category === "checkmate" && (
              <div>
                <label className="label-classic">체크메이트 수</label>
                <select
                  value={form.mateIn}
                  onChange={(e) => setForm({ ...form, mateIn: e.target.value })}
                  className="input-classic"
                >
                  {MATE_IN_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}수</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label-classic">
                해설 코멘트 <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>(선택, 오답 시 사람이 쓴 코멘트로 표시됨)</span>
              </label>
              <textarea
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="예: 이 위치에서는 룩을 희생해 킹을 노출시키는 것이 핵심입니다."
                rows={3}
                className="input-classic resize-none"
              />
            </div>
            {message && (
              <p className="text-sm" style={{ color: statusColor(message.startsWith("퍼즐") ? "✓" : "✗") }}>
                {message}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-classic-gold py-2 disabled:opacity-50">
              {loading ? "추가 중..." : "퍼즐 추가"}
            </button>
          </form>
        </div>
      )}

      {/* ── 자동 생성 ── */}
      {tab === "generate" && (
        <div className="panel-classic p-6 max-w-md">
          <h2 className="text-xl mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
            체크메이트 퍼즐 자동 생성
          </h2>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
            chess.js로 KQK 포지션에서 체크메이트 퍼즐을 자동 생성합니다. Lichess API 불필요.
          </p>
          <div className="mb-4">
            <label className="label-classic">생성할 퍼즐 수 (최대 100)</label>
            <input
              type="number"
              value={genCount}
              onChange={(e) => setGenCount(Math.min(100, Math.max(1, Number(e.target.value))))}
              min={1}
              max={100}
              className="input-classic w-32"
            />
          </div>
          <div className="flex flex-col gap-3">
            {[
              { mateIn: "1", label: "1수 체크메이트 생성" },
              { mateIn: "2", label: "2수 체크메이트 생성" },
            ].map(({ mateIn, label }) => (
              <div key={mateIn} className="flex items-center gap-3">
                <button
                  onClick={() => handleGenerate(mateIn)}
                  disabled={genLoading[mateIn]}
                  className="btn-classic-gold text-sm px-4 py-2 min-w-[160px] disabled:opacity-40"
                >
                  {genLoading[mateIn] ? "생성 중..." : label}
                </button>
                {genStatus[mateIn] && (
                  <span className="text-sm" style={{ color: statusColor(genStatus[mateIn]) }}>
                    {genStatus[mateIn]}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--color-text-muted)" }}>
            1수: 빠름 (~5초) · 2수: 느림 (~25초, 시간 제한으로 100개 미만일 수 있음)
          </p>
        </div>
      )}

      {/* ── Lichess 가져오기 ── */}
      {tab === "lichess" && (
        <div className="flex flex-col gap-6 max-w-xl">

          {/* 테마별 일괄 가져오기 */}
          <div className="panel-classic p-6">
            <h2 className="text-xl mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
              테마별 일괄 가져오기
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              <code style={{ color: "var(--color-gold)" }}>LICHESS_TOKEN</code>을 .env.local에 설정해야 합니다.{" "}
              lichess.org/account/oauth/token → Puzzle 권한으로 생성
            </p>
            <div className="flex flex-col gap-2">
              {BULK_THEMES.map((t) => (
                <div key={t.key} className="flex items-center gap-2">
                  <span className="text-sm w-36 shrink-0" style={{ color: "var(--color-text)" }}>{t.label}</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bulkCounts[t.key]}
                    onChange={(e) =>
                      setBulkCounts((p) => ({ ...p, [t.key]: Number(e.target.value) }))
                    }
                    className="input-classic w-20 py-1 text-sm"
                  />
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>개</span>
                  <button
                    onClick={() => handleBulkImport(t.key)}
                    disabled={bulkLoading[t.key]}
                    className="btn-classic-gold text-xs px-3 py-1 disabled:opacity-40"
                  >
                    {bulkLoading[t.key] ? "..." : "가져오기"}
                  </button>
                  {bulkStatus[t.key] && (
                    <span className="text-xs" style={{ color: statusColor(bulkStatus[t.key]) }}>
                      {bulkStatus[t.key]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ID로 가져오기 */}
          <div className="panel-classic p-6">
            <h2 className="text-xl mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
              퍼즐 ID로 가져오기
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
              Lichess 퍼즐 URL의 ID를 입력하세요.{" "}
              <span>예: lichess.org/training/<strong>DTJ7x</strong></span>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={lichessId}
                onChange={(e) => setLichessId(e.target.value)}
                placeholder="퍼즐 ID (예: DTJ7x)"
                className="input-classic flex-1 font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleImportById()}
              />
              <button
                onClick={handleImportById}
                disabled={!lichessId.trim()}
                className="btn-classic-gold px-4 py-2 disabled:opacity-50"
              >
                가져오기
              </button>
            </div>
          </div>

          {/* CSV 업로드 */}
          <div className="panel-classic p-6">
            <h2 className="text-xl mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
              CSV로 대량 가져오기
            </h2>
            <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>
              Lichess 퍼즐 데이터베이스 CSV를 업로드하세요.
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              다운로드:{" "}
              <code style={{ color: "var(--color-text)" }}>database.lichess.org → Puzzles</code>
              {" "}→ 압축 해제 후 업로드
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="label-classic">가져올 퍼즐 수</label>
                <input
                  type="number"
                  value={csvCount}
                  onChange={(e) => setCsvCount(Number(e.target.value))}
                  min={1}
                  max={200}
                  className="input-classic w-32"
                />
              </div>
              <div>
                <label className="label-classic">CSV 파일 선택</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="text-sm file:mr-3 file:py-1 file:px-3 file:rounded-sm file:border-0 file:cursor-pointer"
                  style={{ color: "var(--color-text-muted)" }}
                />
              </div>
              <button onClick={handleImportCsv} className="btn-classic-gold py-2 w-full">
                CSV 가져오기
              </button>
            </div>
          </div>

          {importMsg && (
            <p
              className="text-sm px-4 py-3 rounded-sm border"
              style={{
                color: statusColor(importMsg),
                borderColor: "var(--color-gold-soft)",
                background: "rgba(201, 162, 39, 0.06)",
              }}
            >
              {importMsg}
            </p>
          )}
        </div>
      )}

      {/* ── 버그 신고 ── */}
      {tab === "bugs" && (
        <div className="flex flex-col gap-4 max-w-3xl">
          <div className="flex gap-2">
            <button
              onClick={() => setBugFilter("open")}
              className={`px-3 py-1 text-xs font-medium transition border rounded-full ${bugFilter === "open" ? "filter-btn-active" : "filter-btn"}`}
            >
              열림
            </button>
            <button
              onClick={() => setBugFilter("all")}
              className={`px-3 py-1 text-xs font-medium transition border rounded-full ${bugFilter === "all" ? "filter-btn-active" : "filter-btn"}`}
            >
              전체
            </button>
          </div>

          {bugReports.filter((b) => bugFilter === "all" || b.status === "open").length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
              신고된 버그가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {bugReports
                .filter((b) => bugFilter === "all" || b.status === "open")
                .map((b) => (
                  <div key={b.id} className="panel-classic p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border shrink-0"
                        style={{
                          borderColor: "var(--color-gold-soft)",
                          color: b.status === "open" ? "var(--color-gold)" : "var(--color-text-muted)",
                        }}
                      >
                        {b.status === "open" ? "열림" : "해결됨"}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "var(--color-text-muted)" }}>
                        {new Date(b.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm mb-2 whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                      {b.message}
                    </p>
                    <div className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
                      {b.user ? `${b.user.name} (${b.user.email})` : "비로그인 사용자"}
                      {b.pageUrl && <> · {b.pageUrl}</>}
                      {b.puzzle && <> · 퍼즐: {b.puzzle.title}</>}
                    </div>
                    <div className="flex gap-2">
                      {b.status === "open" ? (
                        <button
                          onClick={() => updateBugStatus(b.id, "resolved")}
                          className="btn-classic-outline px-3 py-1 text-xs"
                        >
                          해결됨으로 표시
                        </button>
                      ) : (
                        <button
                          onClick={() => updateBugStatus(b.id, "open")}
                          className="btn-classic-outline px-3 py-1 text-xs"
                        >
                          다시 열기
                        </button>
                      )}
                      <button
                        onClick={() => deleteBugReport(b.id)}
                        className="text-red-700 hover:text-red-800 text-xs border border-red-700/30 hover:border-red-700 px-3 py-1 rounded transition"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
