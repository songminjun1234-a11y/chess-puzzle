import { Chess } from "chess.js";
import type { EngineLine } from "./stockfishClient";

export type EngineLineReport = {
  evalText: string;
  // Score from White's perspective, for a chess.com-style eval bar
  // (independent of whose move it is or which side the player is playing).
  scoreCpWhite: number | null;
  scoreMateWhite: number | null;
  // replayFens[0] is the position right after the player's mistake;
  // replayFens[i] is the position after replaySan[i-1] has been played.
  replayFens: string[];
  replaySan: string[];
};

export type MistakeReport = {
  text: string;
  lines: EngineLineReport[];
};

function buildLineReport(fenAfterMove: string, line: EngineLine): EngineLineReport {
  const sideToMove = fenAfterMove.split(" ")[1] === "b" ? "b" : "w";
  const toWhitePerspective = (n: number) => (sideToMove === "w" ? n : -n);
  const scoreCpWhite = line.scoreCp != null ? toWhitePerspective(line.scoreCp) : null;
  const scoreMateWhite = line.scoreMate != null ? toWhitePerspective(line.scoreMate) : null;

  const chess = new Chess(fenAfterMove);
  const replayFens = [fenAfterMove];
  const replaySan: string[] = [];
  for (const uci of line.pv) {
    let move;
    try {
      move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      break;
    }
    if (!move) break;
    replaySan.push(move.san);
    replayFens.push(chess.fen());
  }

  // line.scoreCp / scoreMate are from the perspective of the side to move in
  // fenAfterMove, i.e. the opponent — negate for the player's perspective.
  let evalText: string;
  if (line.scoreMate != null) {
    evalText = line.scoreMate > 0 ? `상대 메이트 ${line.scoreMate}수` : `내 메이트 ${Math.abs(line.scoreMate)}수`;
  } else {
    const playerCp = -(line.scoreCp ?? 0);
    const pawns = (playerCp / 100).toFixed(1);
    evalText = `${playerCp >= 0 ? "+" : ""}${pawns}`;
  }

  return { evalText, scoreCpWhite, scoreMateWhite, replayFens, replaySan };
}

export function buildMistakeReport(fenAfterMove: string, lines: EngineLine[]): MistakeReport {
  const validLines = lines.filter((l) => l.pv.length > 0).sort((a, b) => a.multipv - b.multipv);

  if (validLines.length === 0) {
    return {
      text: "상대에게 마땅한 응수가 없는 조용한 위치입니다. 그래도 정답 수순은 아니었어요 — 다시 시도해보세요.",
      lines: [],
    };
  }

  const lineReports = validLines.map((l) => buildLineReport(fenAfterMove, l));
  const top = validLines[0];
  const topReport = lineReports[0];
  const refutationSan = topReport.replaySan[0] ?? "";
  const lineText = topReport.replaySan.length > 1 ? ` (예상 수순: ${topReport.replaySan.join(" ")})` : "";

  let text: string;
  if (top.scoreMate != null) {
    if (top.scoreMate > 0) {
      text = `이 수는 좋지 않습니다. 상대가 ${refutationSan}로 응수하면 ${top.scoreMate}수 만에 외통메이트를 당합니다!${lineText}`;
    } else {
      text = `이 수를 두어도 상대는 여전히 외통(${Math.abs(top.scoreMate)}수)에 몰려 있지만, 정답 수순은 아니었습니다. 최선의 수를 다시 찾아보세요.`;
    }
  } else {
    const playerCp = -(top.scoreCp ?? 0);
    const pawns = (playerCp / 100).toFixed(1);
    const sign = playerCp >= 0 ? "+" : "";
    if (playerCp <= -150) {
      text = `이 수는 좋지 않습니다. 상대가 ${refutationSan}로 응수하면 형세가 ${sign}${pawns}로 상대에게 유리해집니다.${lineText}`;
    } else {
      text = `이 수는 최선이 아닙니다. 상대의 최선 응수는 ${refutationSan}이며, 이후 평가는 ${sign}${pawns}입니다.${lineText}`;
    }
  }

  return { text, lines: lineReports };
}
