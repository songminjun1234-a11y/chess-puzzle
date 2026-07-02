import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { saveCode } from "@/lib/verificationCodes";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "이메일을 입력하세요." }, { status: 400 });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  saveCode(email, code);

  await transporter.sendMail({
    from: `"체스 퍼즐" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "체스 퍼즐 회원가입 인증번호",
    text: `인증번호: ${code}\n\n5분 내에 입력해주세요.`,
    html: `<p>인증번호: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>5분 내에 입력해주세요.</p>`,
  });

  return NextResponse.json({ success: true });
}
