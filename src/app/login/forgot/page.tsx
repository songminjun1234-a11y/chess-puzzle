"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", code: "", newPassword: "" });
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
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    setSendingCode(false);
    if (res.ok) {
      setCodeSent(true);
      setCodeMessage("해당 이메일로 가입된 계정이 있다면 인증번호를 발송했습니다.");
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
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "비밀번호 재설정에 실패했습니다.");
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
          비밀번호 찾기
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <>
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

              <div>
                <label className="label-classic">새 비밀번호</label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="input-classic"
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {error && <p className="text-red-700 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-classic-gold btn-restrained py-2 disabled:opacity-50">
            {loading ? "처리 중..." : "비밀번호 재설정"}
          </button>
        </form>

        <p className="text-sm text-center mt-4" style={{ color: "var(--color-text-muted)" }}>
          <Link href="/login" style={{ color: "var(--color-gold)" }} className="hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
