type CodeEntry = { code: string; expires: number };
const store = new Map<string, CodeEntry>();

export function saveCode(email: string, code: string) {
  store.set(email, { code, expires: Date.now() + 5 * 60 * 1000 });
}

export function verifyCode(email: string, code: string): "ok" | "expired" | "invalid" {
  const entry = store.get(email);
  if (!entry) return "invalid";
  if (Date.now() > entry.expires) { store.delete(email); return "expired"; }
  if (entry.code !== code) return "invalid";
  store.delete(email);
  return "ok";
}
