import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transporter } from "@/lib/mailer";

const BUG_REPORT_EMAIL = "chesssitebug@gmail.com";
const MAX_SCREENSHOT_BASE64_LENGTH = 7 * 1024 * 1024; // ~5MB original file

function parseDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { message, pageUrl, puzzleId, screenshot } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "내용이 너무 깁니다 (최대 2000자)." }, { status: 400 });
  }
  if (screenshot && screenshot.length > MAX_SCREENSHOT_BASE64_LENGTH) {
    return NextResponse.json({ error: "첨부 이미지가 너무 큽니다 (최대 5MB)." }, { status: 400 });
  }

  const report = await prisma.bugReport.create({
    data: {
      userId: session?.user?.id ?? null,
      puzzleId: puzzleId || null,
      message: message.trim(),
      pageUrl: pageUrl || null,
    },
  });

  try {
    const reporter = session?.user?.email
      ? `${session.user.name ?? ""} (${session.user.email})`
      : "비로그인 사용자";
    const image = typeof screenshot === "string" ? parseDataUrl(screenshot) : null;

    await transporter.sendMail({
      from: `"체스 퍼즐 버그 신고" <${process.env.EMAIL_USER}>`,
      to: BUG_REPORT_EMAIL,
      subject: `[체스 퍼즐] 새 버그 신고 (${report.id})`,
      text: [
        `신고자: ${reporter}`,
        `페이지: ${pageUrl || "알 수 없음"}`,
        puzzleId ? `퍼즐 ID: ${puzzleId}` : null,
        "",
        message.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p><strong>신고자:</strong> ${reporter}</p>
        <p><strong>페이지:</strong> ${pageUrl || "알 수 없음"}</p>
        ${puzzleId ? `<p><strong>퍼즐 ID:</strong> ${puzzleId}</p>` : ""}
        <p style="white-space:pre-wrap">${message.trim()}</p>
      `,
      attachments: image
        ? [{ filename: `screenshot.${image.contentType.split("/")[1] || "png"}`, content: image.buffer, contentType: image.contentType }]
        : undefined,
    });
  } catch (err) {
    // The report is already saved — a notification-email failure shouldn't
    // fail the request, just get logged for later investigation.
    console.error("Failed to send bug report email:", err);
  }

  return NextResponse.json({ success: true });
}
