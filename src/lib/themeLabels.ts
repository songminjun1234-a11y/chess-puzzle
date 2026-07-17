// Lichess raw puzzle theme tags -> Korean label, for tactical/mate motifs worth
// surfacing as personalized feedback. Meta tags (length, phase, popularity, etc.)
// are intentionally omitted so they never show up as a "weakness".
export const THEME_LABEL: Record<string, string> = {
  fork: "포크",
  pin: "핀",
  skewer: "스큐어",
  discoveredAttack: "디스커버드 어택",
  doubleCheck: "더블체크",
  sacrifice: "희생",
  attraction: "유인",
  deflection: "전환",
  clearance: "클리어런스",
  interference: "인터피어런스",
  intermezzo: "사잇수",
  zwischenzug: "사잇수",
  zugzwang: "추크추방",
  trappedPiece: "트랩",
  capturingDefender: "수비수 제거",
  removingTheGuard: "수비수 제거",
  hangingPiece: "매달린 기물",
  xRayAttack: "엑스레이 공격",
  quietMove: "조용한 수",
  defensiveMove: "수비 수",
  promotion: "프로모션",
  underPromotion: "언더프로모션",
  enPassant: "앙파상",
  exposedKing: "노출된 킹",
  kingsideAttack: "킹사이드 공격",
  queensideAttack: "퀸사이드 공격",
  attackingF2F7: "f2/f7 공격",

  backRankMate: "백랭크 메이트",
  smotheredMate: "스모더드 메이트",
  arabianMate: "아라비안 메이트",
  anastasiaMate: "아나스타샤 메이트",
  bodenMate: "보든 메이트",
  doubleBishopMate: "더블 비숍 메이트",
  dovetailMate: "도브테일 메이트",
  hookMate: "훅 메이트",
  vukovicMate: "부코비치 메이트",

  pawnEndgame: "폰 엔드게임",
  knightEndgame: "나이트 엔드게임",
  bishopEndgame: "비숍 엔드게임",
  rookEndgame: "룩 엔드게임",
  queenEndgame: "퀸 엔드게임",
  queenRookEndgame: "퀸+룩 엔드게임",
};

// Meta/descriptive tags that don't represent a learnable tactical skill —
// never surfaced as a weakness even though Lichess includes them.
const META_THEMES = new Set([
  "advancedPawn", "advantage", "crushing", "equality", "castling",
  "endgame", "middlegame", "opening", "master", "masterVsMaster", "superGM",
  "oneMove", "short", "long", "veryLong", "mate",
  "mateIn1", "mateIn2", "mateIn3", "mateIn4", "mateIn5",
]);

export function isSkillTheme(theme: string): boolean {
  return !META_THEMES.has(theme) && !/^mateIn\d+$/.test(theme);
}

// Fallback labels for our own coarse category system, used when a puzzle has
// no raw Lichess theme tags (manually added, auto-generated, or imported
// before theme tracking was added).
export const CATEGORY_FALLBACK_LABEL: Record<string, string> = {
  fork: "포크",
  double_check: "더블체크",
  skewer: "스큐어",
  discovered: "디스커버드 어택",
  pin: "핀",
  sacrifice: "희생",
  defender_removal: "수비수 제거",
  trap: "트랩",
  zugzwang: "추크추방",
  zwischenzug: "사잇수",
};

export function checkmateFallbackLabel(mateIn: string | null): string {
  return mateIn ? `체크메이트 ${mateIn}수` : "체크메이트";
}
