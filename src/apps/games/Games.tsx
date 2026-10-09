import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "../../store";

type Cell = { mine: boolean; open: boolean; flag: boolean };
function makeBoard(): Cell[] {
  const mines = new Set<number>();
  while (mines.size < 10) mines.add(Math.floor(Math.random() * 64));
  return Array.from({ length: 64 }, (_, i) => ({ mine: mines.has(i), open: false, flag: false }));
}
function Mines() {
  const [board, setBoard] = useState(makeBoard);
  const [lost, setLost] = useState(false);
  const [won, setWon] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const count = (i: number) => {
    let n = 0;
    for (let y = Math.max(0, Math.floor(i / 8) - 1); y <= Math.min(7, Math.floor(i / 8) + 1); y++) for (let x = Math.max(0, i % 8 - 1); x <= Math.min(7, i % 8 + 1); x++) if (board[y * 8 + x]?.mine) n++;
    return n;
  };
  const reset = () => { setBoard(makeBoard()); setLost(false); setWon(false); setFlagMode(false); };
  const toggleFlag = (i: number) => setBoard(old => old.map((x, j) => j === i && !x.open ? { ...x, flag: !x.flag } : x));
  return <section className="game-panel"><div className="toolbar"><h2>Minesweeper</h2><button onClick={reset}>New game</button><button aria-pressed={flagMode} onClick={() => setFlagMode(x => !x)}>{flagMode ? "Flag mode on" : "Flag mode"}</button><span>{lost ? "Boom! Try again." : won ? "Board cleared!" : `${board.filter(c => c.flag).length} flagged`}</span></div><div className="mine-board">{board.map((c, i) => <button key={i} aria-label={`Cell ${i + 1}${c.open ? `, ${c.mine ? "mine" : count(i) ? count(i) + " neighbors" : "empty"}` : c.flag ? ", flagged" : " hidden"}`} className={c.open ? "mine-open" : ""} onContextMenu={e => { e.preventDefault(); toggleFlag(i); }} onClick={() => { if (lost || won) return; if (flagMode) { toggleFlag(i); return; } if (c.flag) return; const next = board.map((x, j) => j === i ? { ...x, open: true } : x); setBoard(next); if (c.mine) setLost(true); else if (next.filter(x => !x.mine && x.open).length === 54) setWon(true); }}>{c.open ? (c.mine ? "💣" : count(i) || "") : c.flag ? "🚩" : ""}</button>)}</div><small>Click a square to reveal it. Use Flag mode or right-click to mark a mine.</small></section>;
}
function Memory() {
  const [seed, setSeed] = useState(0);
  const deck = useMemo(() => { const cards = ["🌙", "🌿", "🪐", "🎨", "🎵", "⭐", "🌈", "☁️"]; return [...cards, ...cards].sort(() => Math.random() - .5); }, [seed]);
  const [open, setOpen] = useState<number[]>([]), [matched, setMatched] = useState<number[]>([]), [moves, setMoves] = useState(0);
  const flip = (i: number) => { if (open.length === 2 || open.includes(i) || matched.includes(i)) return; const next = [...open, i]; setOpen(next); if (next.length === 2) { setMoves(m => m + 1); if (deck[next[0]] === deck[next[1]]) { setMatched(m => [...m, ...next]); setOpen([]); } else setTimeout(() => setOpen([]), 750); } };
  return <section className="game-panel"><div className="toolbar"><h2>Memory Match</h2><span>{matched.length === 16 ? `Solved in ${moves} moves!` : `${moves} moves`}</span><button onClick={() => { setSeed(x => x + 1); setOpen([]); setMatched([]); setMoves(0); }}>New game</button></div><div className="memory-board">{deck.map((x, i) => <button key={i} onClick={() => flip(i)}>{open.includes(i) || matched.includes(i) ? x : "✦"}</button>)}</div></section>;
}
function Beat() {
  const [score, setScore] = useState(0), [playing, setPlaying] = useState(false), [left, setLeft] = useState(20), [tick, setTick] = useState(0);
  const beatAt = useRef(0);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!playing) return; beatAt.current = performance.now(); const id = setInterval(() => { beatAt.current = performance.now(); setLeft(n => { if (n <= 1) { setPlaying(false); return 0; } return n - 1; }); setTick(n => n + 1); }, 600); return () => clearInterval(id); }, [playing]);
  const start = () => { setScore(0); setLeft(20); setPlaying(true); setFeedback(""); };
  const tap = () => { const delta = Math.abs(performance.now() - beatAt.current); if (delta <= 180 || delta >= 420) { setScore(n => n + 1); setFeedback("On beat!"); } else setFeedback("Find the pulse…"); };
  return <section className="game-panel beat-game"><small>20 SECOND RHYTHM RUN</small><h2>{playing ? "Catch the beat" : left === 0 ? `Final score: ${score}` : "Ready when you are"}</h2><div className={`beat-orb ${playing ? "pulsing" : ""}`} key={tick}/><button disabled={!playing && left === 0} onClick={playing ? tap : start}>{playing ? "Tap on the beat" : left === 0 ? "Play again" : "Start"}</button><small>{feedback || `${left}s · ${score} on-beat taps`}</small></section>;
}
export default function Games({ data }: { data?: string }) {
  const installed = useOS(s => s.prefs.installedGames || []);
  const [game, setGame] = useState(data || installed[0] || "");
  const list = [{ id: "mines", label: "Minesweeper" }, { id: "memory", label: "Memory" }, { id: "beat", label: "Beat Tap" }].filter(x => installed.includes(x.id));
  return <div className="games-app"><aside><h2>Arcade</h2>{list.map(x => <button className={game === x.id ? "selected" : ""} key={x.id} onClick={() => setGame(x.id)}>{x.label}</button>)}{!list.length && <p>Visit the Store to install your first game.</p>}</aside><main>{game === "mines" ? <Mines/> : game === "memory" ? <Memory/> : game === "beat" ? <Beat/> : <div className="game-empty"><span>🕹️</span><h2>Your games live here</h2><p>Install an offline game from the Store to get started.</p><button onClick={() => useOS.getState().open("Store")}>Open Store</button></div>}</main></div>;
}
