import { prisma } from "./prisma";

export async function saveCode(email: string, code: string) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.verificationCode.upsert({
    where: { email },
    update: { code, expiresAt },
    create: { email, code, expiresAt },
  });
}

export async function verifyCode(email: string, code: string): Promise<"ok" | "expired" | "invalid"> {
  const entry = await prisma.verificationCode.findUnique({ where: { email } });
  if (!entry) return "invalid";
  if (Date.now() > entry.expiresAt.getTime()) {
    await prisma.verificationCode.delete({ where: { email } });
    return "expired";
  }
  if (entry.code !== code) return "invalid";
  await prisma.verificationCode.delete({ where: { email } });
  return "ok";
}
