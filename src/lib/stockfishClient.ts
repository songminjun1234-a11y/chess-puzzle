let worker: Worker | null = null;
let readyPromise: Promise<Worker> | null = null;

function createWorker(): Promise<Worker> {
  const w = new Worker("/stockfish/stockfish-18-lite-single.js");
  return new Promise((resolve) => {
    const onMessage = (e: MessageEvent) => {
      if (e.data === "uciok") {
        w.postMessage("isready");
      } else if (e.data === "readyok") {
        w.removeEventListener("message", onMessage);
        resolve(w);
      }
    };
    w.addEventListener("message", onMessage);
    w.postMessage("uci");
  });
}

function getEngine(): Promise<Worker> {
  if (!readyPromise) {
    worker = null;
    readyPromise = createWorker().then((w) => {
      worker = w;
      return w;
    });
  }
  return readyPromise;
}

export type EngineLine = {
  multipv: number;
  scoreCp: number | null;
  scoreMate: number | null;
  pv: string[];
};

// Analyzes a position and returns the top `numLines` candidate lines (Stockfish
// MultiPV), streaming intermediate results via onUpdate as the search deepens.
export async function analyzeMultiPv(
  fen: string,
  depth = 14,
  numLines = 3,
  onUpdate?: (lines: EngineLine[]) => void
): Promise<EngineLine[]> {
  const w = await getEngine();

  return new Promise((resolve) => {
    const linesByIndex = new Map<number, EngineLine>();
    const snapshot = () => Array.from(linesByIndex.values()).sort((a, b) => a.multipv - b.multipv);

    const onMessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";
      if (line.startsWith("info") && line.includes(" pv ") && line.includes(" multipv ")) {
        const multipvMatch = line.match(/multipv (\d+)/);
        const pvMatch = line.match(/ pv (.+)$/);
        if (!multipvMatch || !pvMatch) return;
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        const idx = parseInt(multipvMatch[1], 10);
        linesByIndex.set(idx, {
          multipv: idx,
          scoreCp: mateMatch ? null : cpMatch ? parseInt(cpMatch[1], 10) : null,
          scoreMate: mateMatch ? parseInt(mateMatch[1], 10) : null,
          pv: pvMatch[1].trim().split(" "),
        });
        onUpdate?.(snapshot());
      } else if (line.startsWith("bestmove")) {
        w.removeEventListener("message", onMessage);
        resolve(snapshot());
      }
    };

    w.addEventListener("message", onMessage);
    w.postMessage(`setoption name MultiPV value ${numLines}`);
    w.postMessage("position fen " + fen);
    w.postMessage("go depth " + depth);
  });
}
