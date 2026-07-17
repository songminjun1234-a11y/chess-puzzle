import { CATEGORY_FALLBACK_LABEL, checkmateFallbackLabel, isSkillTheme, THEME_LABEL } from "./themeLabels";

type SolvedRecord = {
  attempts: number;
  puzzle: {
    category: string;
    mateIn: string | null;
    themes: string | null;
  };
};

export type Weakness = {
  key: string;
  label: string;
  total: number;
  struggled: number;
  missRate: number;
};

const MIN_SAMPLES = 3;
const MAX_RESULTS = 3;

function themeKeysFor(p: SolvedRecord["puzzle"]): { key: string; label: string }[] {
  const raw = (p.themes ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const skillThemes = raw.filter(isSkillTheme);

  if (skillThemes.length > 0) {
    return skillThemes.map((t) => ({ key: t, label: THEME_LABEL[t] ?? t }));
  }

  // No raw Lichess theme data on this puzzle — fall back to our own category.
  if (p.category === "checkmate") {
    return [{ key: `checkmate:${p.mateIn ?? "?"}`, label: checkmateFallbackLabel(p.mateIn) }];
  }
  return [{ key: p.category, label: CATEGORY_FALLBACK_LABEL[p.category] ?? p.category }];
}

function computeThemeStats(records: SolvedRecord[]): Weakness[] {
  const stats = new Map<string, { label: string; total: number; struggled: number }>();

  for (const r of records) {
    const struggled = r.attempts > 1;
    for (const { key, label } of themeKeysFor(r.puzzle)) {
      const entry = stats.get(key) ?? { label, total: 0, struggled: 0 };
      entry.total += 1;
      if (struggled) entry.struggled += 1;
      stats.set(key, entry);
    }
  }

  return Array.from(stats.entries()).map(([key, s]) => ({
    key,
    label: s.label,
    total: s.total,
    struggled: s.struggled,
    missRate: s.struggled / s.total,
  }));
}

export function computeWeaknesses(records: SolvedRecord[]): Weakness[] {
  return computeThemeStats(records)
    .filter((w) => w.total >= MIN_SAMPLES)
    .sort((a, b) => b.missRate - a.missRate || b.total - a.total)
    .slice(0, MAX_RESULTS);
}

// Fuller breakdown for the analysis chart — lower sample floor (a chart can
// show thin data gracefully where a one-line "weakness" callout can't), and
// no cap other than keeping the chart readable.
const BREAKDOWN_MIN_SAMPLES = 2;
const BREAKDOWN_MAX_RESULTS = 10;

export function computeThemeBreakdown(records: SolvedRecord[]): Weakness[] {
  return computeThemeStats(records)
    .filter((w) => w.total >= BREAKDOWN_MIN_SAMPLES)
    .sort((a, b) => b.missRate - a.missRate || b.total - a.total)
    .slice(0, BREAKDOWN_MAX_RESULTS);
}
