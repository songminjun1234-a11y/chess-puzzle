"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");

  const sendCode = async () => {
    if (!form.email) { setError("이메일을 먼저 입력하세요."); return; }
    setSendingCode(true);
    setError("");
    setCodeMessage("");
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    setSendingCode(false);
    if (res.ok) {
      setCodeSent(true);
      setCodeMessage("인증번호를 발송했습니다. 이메일을 확인해주세요.");
    } else {
      const data = await res.json();
      setError(data.error || "발송에 실패했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeSent) { setError("인증번호를 먼저 발송해주세요."); return; }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "회원가입에 실패했습니다.");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
      <div className="bg-[#16213e] border border-[#0f3460] rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">회원가입</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">이름</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560]"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">이메일</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setCodeSent(false); setCodeMessage(""); }}
                className="flex-1 bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560]"
                required
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={sendingCode}
                className="bg-[#0f3460] border border-[#1a4a7a] hover:border-[#e94560] text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm transition whitespace-nowrap disabled:opacity-50"
              >
                {sendingCode ? "발송 중..." : codeSent ? "재발송" : "인증번호 발송"}
              </button>
            </div>
            {codeMessage && <p className="text-green-400 text-xs mt-1">{codeMessage}</p>}
          </div>

          {codeSent && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">인증번호</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560] tracking-widest text-center text-lg"
                placeholder="6자리 입력"
                maxLength={6}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-1">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text) setForm((f) => ({ ...f, password: text }));
              }}
              className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e94560]"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#e94560] hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-4">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-[#e94560] hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
