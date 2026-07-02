import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Chess } from "chess.js";

const FILES = "abcdefgh";
const RANKS = "12345678";

function rand(n: number) { return Math.floor(Math.random() * n); }

function randEdgeSq(): string {
  const edge: string[] = [];
  for (const f of FILES) for (const r of RANKS)
    if (f === "a" || f === "h" || r === "1" || r === "8") edge.push(f + r);
  return edge[rand(edge.length)];
}

function randSq(): string { return FILES[rand(8)] + RANKS[rand(8)]; }

function chebyshev(a: string, b: string): number {
  return Math.max(
    Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(b[0])),
    Math.abs(parseInt(a[1]) - parseInt(b[1]))
  );
}

function buildFen(pieces: { sq: string; p: string }[], turn = "w"): string {
  const board = Array.from({ length: 8 }, () => Array<string>(8).fill("."));
  for (const { sq, p } of pieces)
    board[7 - (parseInt(sq[1]) - 1)][FILES.indexOf(sq[0])] = p;
  let fen = "";
  for (let r = 0; r < 8; r++) {
    let e = 0;
    for (let f = 0; f < 8; f++) {
      if (board[r][f] === ".") e++;
      else { if (e) { fen += e; e = 0; } fen += board[r][f]; }
    }
    if (e) fen += e;
    if (r < 7) fen += "/";
  }
  return `${fen} ${turn} - - 0 1`;
}

function mateIn1Move(fen: string): string | null {
  const chess = new Chess(fen);
  for (const m of chess.moves({ verbose: true })) {
    const t = new Chess(fen); t.move(m);
    if (t.isCheckmate()) return m.from + m.to + (m.promotion ?? "");
  }
  return null;
}

function genKQK(): string | null {
  for (let i = 0; i < 300; i++) {
    const bk = randEdgeSq(), wk = randSq(), wq = randSq();
    if (wk === bk || wq === bk || wq === wk) continue;
    if (chebyshev(wk, bk) <= 1) continue;
    const fen = buildFen([{ sq: wk, p: "K" }, { sq: wq, p: "Q" }, { sq: bk, p: "k" }]);
    try {
      const c = new Chess(fen);
      if (c.isCheckmate() || c.isStalemate() || c.isDraw() || c.isCheck()) continue;
      return fen;
    } catch { continue; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== process.env.ADMIN_EMAIL)
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { mateIn, count = 50 } = await req.json();
  const target = Math.min(count, 100);
  const deadline = Date.now() + 25000; // 25 second limit

  const puzzles: { fen: string; moves: string; mateIn: string }[] = [];

  if (mateIn === "1") {
    let tries = 0;
    while (puzzles.length < target && tries < 200000 && Date.now() < deadline) {
      tries++;
      const fen = genKQK(); if (!fen) continue;
      const mv = mateIn1Move(fen);
      if (mv) puzzles.push({ fen, moves: mv, mateIn: "1" });
    }
  } else if (mateIn === "2") {
    let tries = 0;
    while (puzzles.length < target && tries < 500000 && Date.now() < deadline) {
      tries++;
      const fen = genKQK(); if (!fen) continue;
      if (mateIn1Move(fen)) continue;
      const chess = new Chess(fen);
      let found = false;
      for (const mv1 of chess.moves({ verbose: true })) {
        if (found) break;
        const p1 = new Chess(fen); p1.move(mv1);
        if (p1.isCheckmate() || p1.isStalemate() || p1.isDraw()) continue;
        const blk = p1.moves({ verbose: true }); if (!blk.length) continue;
        let all = true;
        for (const mv2 of blk) {
          const p2 = new Chess(p1.fen()); p2.move(mv2);
          if (!mateIn1Move(p2.fen())) { all = false; break; }
        }
        if (all) {
          puzzles.push({ fen, moves: mv1.from + mv1.to + (mv1.promotion ?? ""), mateIn: "2" });
          found = true;
        }
      }
    }
  }

  let imported = 0;
  for (const { fen, moves, mateIn: mi } of puzzles) {
    await prisma.puzzle.create({
      data: { title: `체크메이트 ${mi}수 퍼즐`, fen, moves, difficulty: "medium", category: "checkmate", mateIn: mi },
    });
    imported++;
  }

  return NextResponse.json({ success: true, imported, requested: target });
}
