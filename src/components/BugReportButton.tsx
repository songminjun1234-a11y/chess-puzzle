"use client";

import { useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5MB

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BugReportButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setMessage("");
    setError("");
    setDone(false);
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 첨부할 수 있습니다.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }
    setError("");
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    const query = searchParams.toString();
    const pageUrl = query ? `${pathname}?${query}` : pathname;
    const puzzleId = pathname === "/puzzle" ? searchParams.get("id") : null;
    const screenshotDataUrl = screenshot ? await fileToDataUrl(screenshot) : null;

    const res = await fetch("/api/bug-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), pageUrl, puzzleId, screenshot: screenshotDataUrl }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "전송에 실패했습니다.");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="버그 신고"
        className="nav-link text-sm"
        aria-label="버그 신고"
      >
        🐛 버그 신고
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={close}
        >
          <div
            className="panel-classic p-6 w-96 max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>
                🐛 버그 신고
              </h3>
              <button
                onClick={close}
                style={{ color: "var(--color-text-muted)" }}
                className="text-xl leading-none hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            {done ? (
              <div className="py-4 text-center">
                <p className="text-sm mb-4" style={{ color: "var(--color-text)" }}>
                  신고해주셔서 감사합니다. 확인 후 조치하겠습니다.
                </p>
                <button onClick={close} className="btn-classic-outline px-4 py-2 text-sm">
                  닫기
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
                  어떤 문제가 있었는지 자세히 적어주시면 도움이 됩니다. (현재 페이지 정보가 자동으로 함께 전송됩니다)
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="예: 오답을 눌렀는데 반박 체스판이 뜨지 않아요."
                  rows={5}
                  className="input-classic resize-none mb-3"
                  autoFocus
                />

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
                {screenshotPreview ? (
                  <div className="relative mb-3 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotPreview}
                      alt="첨부 스크린샷 미리보기"
                      className="max-h-32 rounded border"
                      style={{ borderColor: "var(--color-gold-soft)" }}
                    />
                    <button
                      onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center"
                      style={{ background: "var(--color-bg-panel-alt)", color: "var(--color-text)" }}
                      aria-label="첨부 이미지 제거"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-classic-outline w-full py-1.5 text-xs mb-3"
                    type="button"
                  >
                    📎 스크린샷 첨부 (선택)
                  </button>
                )}

                {error && <p className="text-red-700 text-xs mb-3">{error}</p>}
                <button
                  onClick={submit}
                  disabled={submitting || !message.trim()}
                  className="btn-classic-gold w-full py-2 text-sm disabled:opacity-50"
                >
                  {submitting ? "전송 중..." : "신고 보내기"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
