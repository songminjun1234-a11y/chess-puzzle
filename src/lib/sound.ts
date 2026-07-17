const STORAGE_KEY = "chess-puzzle-sound-enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "true";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
  window.dispatchEvent(new Event("chess-sound-setting-changed"));
}

let moveAudio: HTMLAudioElement | null = null;

// Plays a low, heavy move sound (file to be supplied at public/sounds/move.mp3).
// Silently no-ops until that file exists, or if the browser blocks autoplay.
export function playMoveSound() {
  if (typeof window === "undefined" || !isSoundEnabled()) return;
  try {
    if (!moveAudio) {
      moveAudio = new Audio("/sounds/move.mp3");
      moveAudio.volume = 0.6;
    }
    moveAudio.currentTime = 0;
    void moveAudio.play().catch(() => {});
  } catch {
    // Sound is a non-critical enhancement — never let it break gameplay.
  }
}
