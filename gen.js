const { Chess } = require("./node_modules/chess.js/dist/cjs/chess.js");
const FILES="abcdefgh",RANKS="12345678";
function rand(n){return Math.floor(Math.random()*n);}
function randEdgeSq(){const e=[];for(const f of FILES)for(const r of RANKS)if(f==="a"||f==="h"||r==="1"||r==="8")e.push(f+r);return e[rand(e.length)];}
function randSq(){return FILES[rand(8)]+RANKS[rand(8)];}
function chebyshev(a,b){return Math.max(Math.abs(FILES.indexOf(a[0])-FILES.indexOf(b[0])),Math.abs(parseInt(a[1])-parseInt(b[1])));}
function buildFen(pieces,turn){turn=turn||"w";const board=[];for(let i=0;i<8;i++){board.push([]);for(let j=0;j<8;j++)board[i].push(".");}for(const item of pieces)board[7-(parseInt(item.sq[1])-1)][FILES.indexOf(item.sq[0])]=item.p;let fen="";for(let r=0;r<8;r++){let e=0;for(let f=0;f<8;f++){if(board[r][f]===".")e++;else{if(e){fen+=e;e=0;}fen+=board[r][f];}}if(e)fen+=e;if(r<7)fen+="/";}return fen+" "+turn+" - - 0 1";}
function mateIn1Move(fen){const chess=new Chess(fen);for(const m of chess.moves({verbose:true})){const t=new Chess(fen);t.move(m);if(t.isCheckmate())return m.from+m.to+(m.promotion||"");}return null;}
function genKQK(){for(let i=0;i<300;i++){const bk=randEdgeSq(),wk=randSq(),wq=randSq();if(wk===bk||wq===bk||wq===wk)continue;if(chebyshev(wk,bk)<=1)continue;const fen=buildFen([{sq:wk,p:"K"},{sq:wq,p:"Q"},{sq:bk,p:"k"}]);try{const c=new Chess(fen);if(c.isCheckmate()||c.isStalemate()||c.isDraw()||c.isCheck())continue;return fen;}catch(e){continue;}}return null;}
const m1=[],m2=[];
let t1=0;while(m1.length<100&&t1<100000){t1++;const fen=genKQK();if(!fen)continue;const mv=mateIn1Move(fen);if(mv)m1.push({fen,moves:mv,mateIn:"1"});}
process.stderr.write("m1:"+m1.length+"\n");
let t2=0;while(m2.length<100&&t2<300000){t2++;const fen=genKQK();if(!fen)continue;if(mateIn1Move(fen))continue;const chess=new Chess(fen);const moves=chess.moves({verbose:true});let found=false;for(let mi=0;mi<moves.length&&!found;mi++){const mv1=moves[mi];const p1=new Chess(fen);p1.move(mv1);if(p1.isCheckmate()||p1.isStalemate()||p1.isDraw())continue;const blk=p1.moves({verbose:true});if(!blk.length)continue;let all=true;for(const mv2 of blk){const p2=new Chess(p1.fen());p2.move(mv2);if(!mateIn1Move(p2.fen())){all=false;break;}}if(all){m2.push({fen,moves:mv1.from+mv1.to+(mv1.promotion||""),mateIn:"2"});found=true;}}}
process.stderr.write("m2:"+m2.length+"\n");
process.stdout.write(JSON.stringify({m1,m2}));
