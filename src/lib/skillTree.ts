import { TACTIC_CATEGORIES, MATE_IN_OPTIONS } from "./categories";

export type SkillTier = "locked" | "weak" | "learning" | "mastered";

export type SkillNode = {
  key: string;
  label: string;
  total: number;
  missRate: number | null;
  tier: SkillTier;
  decayed: boolean;
};

type PuzzleRef = { category: string; mateIn: string | null };
type SolvedRecord = { attempts: number; puzzle: PuzzleRef };
type ReviewRecord = { dueAt: Date; puzzle: PuzzleRef };

function nodeKey(p: PuzzleRef): string {
  return p.category === "checkmate" ? `checkmate:${p.mateIn}` : p.category;
}

// Weak once a skill's miss rate crosses this — matches the review queue's
// "worth practicing" bar so the tree and the review CTA agree.
const WEAK_THRESHOLD = 0.4;

function tierFor(total: number, missRate: number): SkillTier {
  if (total === 0) return "locked";
  if (missRate === 0) return "mastered";
  if (missRate >= WEAK_THRESHOLD) return "weak";
  return "learning";
}

export function buildSkillTree(solved: SolvedRecord[], reviews: ReviewRecord[]): SkillNode[] {
  const nodes = new Map<string, { label: string; total: number; struggled: number; decayed: boolean }>();
  for (const cat of TACTIC_CATEGORIES) {
    nodes.set(cat.value, { label: cat.label, total: 0, struggled: 0, decayed: false });
  }
  for (const m of MATE_IN_OPTIONS) {
    nodes.set(`checkmate:${m}`, { label: `체크메이트 ${m}수`, total: 0, struggled: 0, decayed: false });
  }

  for (const r of solved) {
    const entry = nodes.get(nodeKey(r.puzzle));
    if (!entry) continue;
    entry.total += 1;
    if (r.attempts > 1) entry.struggled += 1;
  }

  const now = Date.now();
  for (const r of reviews) {
    const entry = nodes.get(nodeKey(r.puzzle));
    if (entry && r.dueAt.getTime() <= now) entry.decayed = true;
  }

  return Array.from(nodes.entries()).map(([key, e]) => {
    const missRate = e.total > 0 ? e.struggled / e.total : null;
    return {
      key,
      label: e.label,
      total: e.total,
      missRate,
      tier: tierFor(e.total, missRate ?? 0),
      decayed: e.total > 0 && e.decayed,
    };
  });
}
