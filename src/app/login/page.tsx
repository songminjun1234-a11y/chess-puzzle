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
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
      <div className="bg-[#262421] border border-[#3d3a37] rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">로그인</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#3d3a37] border border-[#57534e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#81b64c]"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#3d3a37] border border-[#57534e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#81b64c]"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#81b64c] hover:bg-[#6ba53a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] active:shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)] active:translate-y-px text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-4">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-[#81b64c] hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
