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
    <div className="flex items-center justify-center min-h-[calc(100vh-72px)] px-4">
      <div className="panel-classic p-8 w-full max-w-md" style={{ fontFamily: "var(--font-ui)" }}>
        <h2
          className="text-3xl mb-6 text-center tracking-wide"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
        >
          회원가입
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label-classic">이름</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-classic"
              required
            />
          </div>

          <div>
            <label className="label-classic">이메일</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setCodeSent(false); setCodeMessage(""); }}
                className="input-classic flex-1"
                required
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={sendingCode}
                className="btn-classic-outline px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50"
              >
                {sendingCode ? "발송 중..." : codeSent ? "재발송" : "인증번호 발송"}
              </button>
            </div>
            {codeMessage && (
              <p className="text-xs mt-1" style={{ color: "var(--color-gold)" }}>{codeMessage}</p>
            )}
          </div>

          {codeSent && (
            <div>
              <label className="label-classic">인증번호</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="input-classic tracking-widest text-center text-lg"
                placeholder="6자리 입력"
                maxLength={6}
                required
              />
            </div>
          )}

          <div>
            <label className="label-classic">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text) setForm((f) => ({ ...f, password: text }));
              }}
              className="input-classic"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-700 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-classic-gold btn-restrained py-2 disabled:opacity-50">
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-sm text-center mt-4" style={{ color: "var(--color-text-muted)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" style={{ color: "var(--color-gold)" }} className="hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
