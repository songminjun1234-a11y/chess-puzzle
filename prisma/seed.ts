import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./prisma/dev.db" } },
});

const puzzles = [
  {
    title: "1수 체크메이트 #1",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    moves: "h5f7",
    difficulty: "easy",
    category: "checkmate",
    mateIn: "1",
  },
  {
    title: "포크 전술 - 나이트",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3",
    moves: "c6d4",
    difficulty: "medium",
    category: "fork",
    mateIn: null,
  },
  {
    title: "룩 체크메이트",
    fen: "3k4/8/3K4/8/8/8/8/3R4 w - - 0 1",
    moves: "d1d8",
    difficulty: "easy",
    category: "checkmate",
    mateIn: "1",
  },
  {
    title: "퀸 희생 체크메이트",
    fen: "r1bk3r/ppp2ppp/2n5/3qp3/3P4/2PB1N2/PP3PPP/R1BQK2R w KQ - 0 9",
    moves: "d3h7",
    difficulty: "hard",
    category: "checkmate",
    mateIn: "1",
  },
  {
    title: "비숍 포크",
    fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 2 5",
    moves: "f3e5",
    difficulty: "medium",
    category: "fork",
    mateIn: null,
  },
  {
    title: "백 랭크 메이트",
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    moves: "a1a8",
    difficulty: "easy",
    category: "checkmate",
    mateIn: "1",
  },
];

async function main() {
  console.log("퍼즐 데이터 삽입 중...");
  for (const puzzle of puzzles) {
    await prisma.puzzle.create({ data: puzzle });
  }
  console.log(`${puzzles.length}개 퍼즐 삽입 완료!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
