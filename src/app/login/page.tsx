"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-72px)] px-4">
      <div className="panel-classic p-8 w-full max-w-md" style={{ fontFamily: "var(--font-ui)" }}>
        <h2
          className="text-3xl mb-6 text-center tracking-wide"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}
        >
          로그인
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label-classic">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-classic"
              required
            />
          </div>
          <div>
            <label className="label-classic">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-classic"
              required
            />
          </div>

          {error && <p className="text-red-700 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-classic-gold btn-restrained py-2 disabled:opacity-50">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-sm text-center mt-3">
          <Link href="/login/forgot" style={{ color: "var(--color-text-muted)" }} className="hover:underline">
            비밀번호를 잊으셨나요?
          </Link>
        </p>

        <p className="text-sm text-center mt-2" style={{ color: "var(--color-text-muted)" }}>
          계정이 없으신가요?{" "}
          <Link href="/register" style={{ color: "var(--color-gold)" }} className="hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
