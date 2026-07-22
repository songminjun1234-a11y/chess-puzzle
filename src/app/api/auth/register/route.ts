import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyCode } from "@/lib/verificationCodes";

export async function POST(req: NextRequest) {
  const { email, password, name, code } = await req.json();

  const result = await verifyCode(email, code);
  if (result === "expired") return NextResponse.json({ error: "인증번호가 만료되었습니다. 다시 발송해주세요." }, { status: 400 });
  if (result === "invalid") return NextResponse.json({ error: "인증번호가 다릅니다." }, { status: 400 });

  if (!email || !password || !name) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, password: hashed },
  });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
