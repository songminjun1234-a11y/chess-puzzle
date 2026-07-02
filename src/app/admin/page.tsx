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

type Tab = "list" | "add" | "lichess" | "generate";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("list");
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [form, setForm] = useState({ title: "", fen: "", moves: "", category: "fork", mateIn: "1" });

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
          if (d.isAdmin) fetchPuzzles();
        });
    }
  }, [status]);

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
    };

    const res = await fetch("/api/admin/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.ok) {
      setMessage("퍼즐이 추가되었습니다!");
      setForm({ title: "", fen: "", moves: "", category: "fork", mateIn: "1" });
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
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20 text-red-400">
        관리자만 접근할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">⚙️ 관리자 페이지</h1>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {(["list", "add", "generate", "lichess"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMessage(""); setImportMsg(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
              tab === t
                ? "bg-[#e94560] border-[#e94560] text-white"
                : "border-[#0f3460] text-gray-400 hover:text-white hover:border-[#e94560]"
            }`}
          >
            {t === "list" ? `퍼즐 목록 (${puzzles.length})` : t === "add" ? "퍼즐 추가" : t === "generate" ? "자동 생성" : "Lichess 가져오기"}
          </button>
        ))}
      </div>

      {/* ── 퍼즐 목록 ── */}
      {tab === "list" && (
        <div className="bg-[#16213e] border border-[#0f3460] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0f3460] text-gray-400">
                <th className="py-3 px-4 text-left">제목</th>
                <th className="py-3 px-4 text-left">분류</th>
                <th className="py-3 px-4 text-center">풀이 수</th>
                <th className="py-3 px-4 text-right">삭제</th>
              </tr>
            </thead>
            <tbody>
              {puzzles.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    퍼즐이 없습니다.
                  </td>
                </tr>
              )}
              {puzzles.map((p) => (
                <tr key={p.id} className="border-b border-[#0f3460] last:border-0 hover:bg-[#0f3460]/20">
                  <td className="py-3 px-4 text-white font-medium">{p.title}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm">
                    {CATEGORY_LABEL[p.category] ?? p.category}
                    {p.category === "checkmate" && p.mateIn ? ` ${p.mateIn}수` : ""}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-400">
                    {p._count.solvedPuzzles}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      className="text-red-400 hover:text-red-300 text-xs border border-red-400/30 hover:border-red-400 px-2 py-1 rounded transition"
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
        <div className="bg-[#16213e] border border-[#0f3460] rounded-xl p-6 max-w-xl">
          <h2 className="text-lg font-semibold text-white mb-4">새 퍼즐 추가</h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">제목</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 핀 전술 #7"
                className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560]"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                FEN <span className="text-xs text-gray-500">(퍼즐 시작 위치)</span>
              </label>
              <input
                type="text"
                value={form.fen}
                onChange={(e) => setForm({ ...form, fen: e.target.value })}
                placeholder="예: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
                className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560] font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                정답 수순 <span className="text-xs text-gray-500">(UCI 형식, 공백 구분)</span>
              </label>
              <input
                type="text"
                value={form.moves}
                onChange={(e) => setForm({ ...form, moves: e.target.value })}
                placeholder="예: e2e4 e7e5 d1h5"
                className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560] font-mono"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                플레이어 수 → 상대 응수 → 플레이어 수 순으로 입력
              </p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">분류</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560]"
              >
                {TACTIC_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                <option value="checkmate">체크메이트</option>
              </select>
            </div>
            {form.category === "checkmate" && (
              <div>
                <label className="block text-gray-400 text-sm mb-1">체크메이트 수</label>
                <select
                  value={form.mateIn}
                  onChange={(e) => setForm({ ...form, mateIn: e.target.value })}
                  className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560]"
                >
                  {MATE_IN_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}수</option>
                  ))}
                </select>
              </div>
            )}
            {message && (
              <p className={message.startsWith("퍼즐") ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-[#e94560] hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? "추가 중..." : "퍼즐 추가"}
            </button>
          </form>
        </div>
      )}

      {/* ── 자동 생성 ── */}
      {tab === "generate" && (
        <div className="bg-[#16213e] border border-[#0f3460] rounded-xl p-6 max-w-md">
          <h2 className="text-lg font-semibold text-white mb-1">체크메이트 퍼즐 자동 생성</h2>
          <p className="text-gray-500 text-sm mb-5">
            chess.js로 KQK 포지션에서 체크메이트 퍼즐을 자동 생성합니다. Lichess API 불필요.
          </p>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-1">생성할 퍼즐 수 (최대 100)</label>
            <input
              type="number"
              value={genCount}
              onChange={(e) => setGenCount(Math.min(100, Math.max(1, Number(e.target.value))))}
              min={1}
              max={100}
              className="w-32 bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560]"
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
                  className="bg-[#e94560] hover:bg-red-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition min-w-[160px]"
                >
                  {genLoading[mateIn] ? "생성 중..." : label}
                </button>
                {genStatus[mateIn] && (
                  <span className={`text-sm ${genStatus[mateIn].startsWith("✓") ? "text-green-400" : genStatus[mateIn].startsWith("✗") ? "text-red-400" : "text-yellow-400"}`}>
                    {genStatus[mateIn]}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-xs mt-4">
            1수: 빠름 (~5초) · 2수: 느림 (~25초, 시간 제한으로 100개 미만일 수 있음
          </p>
        </div>
      )}

      {/* ── Lichess 가져오기 ── */}
      {tab === "lichess" && (
        <div className="flex flex-col gap-6 max-w-xl">

          {/* 테마별 일괄 가져오기 */}
          <div className="bg-[#16213e] border border-[#0f3460] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">테마별 일괄 가져오기</h2>
            <p className="text-gray-500 text-xs mb-4">
              <code className="text-yellow-400">LICHESS_TOKEN</code>을 .env.local에 설정해야 합니다.{" "}
              lichess.org/account/oauth/token → Puzzle 권한으로 생성
            </p>
            <div className="flex flex-col gap-2">
              {BULK_THEMES.map((t) => (
                <div key={t.key} className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm w-36 shrink-0">{t.label}</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bulkCounts[t.key]}
                    onChange={(e) =>
                      setBulkCounts((p) => ({ ...p, [t.key]: Number(e.target.value) }))
                    }
                    className="w-20 bg-[#0f3460] border border-[#1a4a7a] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-[#e94560]"
                  />
                  <span className="text-gray-500 text-xs">개</span>
                  <button
                    onClick={() => handleBulkImport(t.key)}
                    disabled={bulkLoading[t.key]}
                    className="bg-[#e94560] hover:bg-red-600 disabled:opacity-40 text-white text-xs px-3 py-1 rounded transition"
                  >
                    {bulkLoading[t.key] ? "..." : "가져오기"}
                  </button>
                  {bulkStatus[t.key] && (
                    <span
                      className={`text-xs ${
                        bulkStatus[t.key].startsWith("✓") ? "text-green-400" : bulkStatus[t.key].startsWith("✗") ? "text-red-400" : "text-yellow-400"
                      }`}
                    >
                      {bulkStatus[t.key]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ID로 가져오기 */}
          <div className="bg-[#16213e] border border-[#0f3460] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">퍼즐 ID로 가져오기</h2>
            <p className="text-gray-500 text-sm mb-4">
              Lichess 퍼즐 URL의 ID를 입력하세요.{" "}
              <span className="text-gray-400">예: lichess.org/training/<strong>DTJ7x</strong></span>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={lichessId}
                onChange={(e) => setLichessId(e.target.value)}
                placeholder="퍼즐 ID (예: DTJ7x)"
                className="flex-1 bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560] font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleImportById()}
              />
              <button
                onClick={handleImportById}
                disabled={!lichessId.trim()}
                className="bg-[#e94560] hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
              >
                가져오기
              </button>
            </div>
          </div>

          {/* CSV 업로드 */}
          <div className="bg-[#16213e] border border-[#0f3460] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">CSV로 대량 가져오기</h2>
            <p className="text-gray-500 text-sm mb-1">
              Lichess 퍼즐 데이터베이스 CSV를 업로드하세요.
            </p>
            <p className="text-gray-500 text-xs mb-4">
              다운로드:{" "}
              <code className="text-gray-300">database.lichess.org → Puzzles</code>
              {" "}→ 압축 해제 후 업로드
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">가져올 퍼즐 수</label>
                <input
                  type="number"
                  value={csvCount}
                  onChange={(e) => setCsvCount(Number(e.target.value))}
                  min={1}
                  max={200}
                  className="w-32 bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560]"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">CSV 파일 선택</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="text-gray-400 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#0f3460] file:text-gray-300 hover:file:bg-[#1a4a7a]"
                />
              </div>
              <button
                onClick={handleImportCsv}
                className="bg-[#e94560] hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition w-full"
              >
                CSV 가져오기
              </button>
            </div>
          </div>

          {importMsg && (
            <p
              className={`text-sm px-4 py-3 rounded-lg border ${
                importMsg.startsWith("✓")
                  ? "text-green-400 border-green-400/30 bg-green-400/10"
                  : importMsg.startsWith("✗")
                  ? "text-red-400 border-red-400/30 bg-red-400/10"
                  : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
              }`}
            >
              {importMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
