import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveCode } from "@/lib/verificationCodes";
import { transporter } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "이메일을 입력하세요." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond success regardless of whether the account exists, so this
  // endpoint can't be used to check which emails are registered.
  if (user) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    saveCode(`reset:${email}`, code);
    await transporter.sendMail({
      from: `"체스 퍼즐" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "체스 퍼즐 비밀번호 재설정 인증번호",
      text: `인증번호: ${code}\n\n5분 내에 입력해주세요.`,
      html: `<p>인증번호: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>5분 내에 입력해주세요.</p>`,
    });
  }

  return NextResponse.json({ success: true });
}
