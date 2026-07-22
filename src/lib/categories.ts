// Canonical tactic categories, shared between the puzzle filter UI, the
// review queue, and the skill-tree weakness view so they all agree on the
// same fixed set of skills.
export const TACTIC_CATEGORIES = [
  { value: "fork", label: "포크" },
  { value: "double_check", label: "더블체크" },
  { value: "skewer", label: "스큐어" },
  { value: "discovered", label: "디스커버드" },
  { value: "pin", label: "핀" },
  { value: "sacrifice", label: "희생" },
  { value: "defender_removal", label: "수비수 제거" },
  { value: "trap", label: "트랩" },
  { value: "zugzwang", label: "추크 추방" },
  { value: "zwischenzug", label: "사잇수" },
];

export const MATE_IN_OPTIONS = ["1", "2", "3", "4", "5+"];
