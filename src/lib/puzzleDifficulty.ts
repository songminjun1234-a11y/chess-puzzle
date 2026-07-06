export function ratingToDifficulty(rating: number): "easy" | "medium" | "hard" {
  if (rating < 1300) return "easy";
  if (rating < 1800) return "medium";
  return "hard";
}
