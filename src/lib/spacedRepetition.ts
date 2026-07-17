// A simplified SM-2 (SuperMemo 2) scheduler. There's no explicit self-rating
// UI — "quality" is derived from how many attempts the puzzle took to solve:
// solved first try -> easy, second try -> shaky, third+ -> struggled.
export type ReviewState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export function qualityFromAttempts(attempts: number): number {
  if (attempts <= 1) return 5;
  if (attempts === 2) return 3;
  return 1;
}

export function computeNextReview(
  current: ReviewState | null,
  quality: number
): ReviewState & { dueAt: Date } {
  const prevEase = current?.easeFactor ?? 2.5;
  const prevRepetitions = current?.repetitions ?? 0;
  const prevInterval = current?.intervalDays ?? 0;

  let repetitions: number;
  let intervalDays: number;

  if (quality < 3) {
    // Struggled — reset the streak and see it again tomorrow.
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = prevRepetitions + 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(prevInterval * prevEase);
  }

  const easeFactor = Math.max(
    1.3,
    prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const dueAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  return { easeFactor, intervalDays, repetitions, dueAt };
}
