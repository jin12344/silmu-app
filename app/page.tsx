'use client';

import { useState, useEffect } from 'react';
import { saveScore, fetchTopScores, type LeaderboardEntry } from '@/lib/leaderboard';
import styles from './page.module.css';

// ── 타입 ─────────────────────────────────────────────────
type CellState  = 'hidden' | 'revealed' | 'flagged';
type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

interface Cell {
  state: CellState;
  isMine: boolean;
  adjacentMines: number;
}

// ── 상수 ─────────────────────────────────────────────────
const ROWS = 10, COLS = 10, MINE_COUNT = 10;

const DELTAS: [number, number][] = [
  [-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1],
];

const NUMBER_COLORS: Record<number, string> = {
  1:'#1a73e8', 2:'#0f9d58', 3:'#d93025', 4:'#4527a0',
  5:'#7b3f00', 6:'#00838f', 7:'#212121', 8:'#757575',
};

const FACE: Record<GameStatus, string> = {
  idle:'🙂', playing:'😮', won:'😎', lost:'😵',
};

const MEDALS = ['🥇','🥈','🥉'];

// ── 유틸 ─────────────────────────────────────────────────
function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

// ── 순수 함수 ─────────────────────────────────────────────
function createGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ state: 'hidden' as CellState, isMine: false, adjacentMines: 0 }))
  );
}

function placeMines(grid: Cell[][], sr: number, sc: number): Cell[][] {
  const g = grid.map(r => r.map(c => ({ ...c })));
  let placed = 0;
  while (placed < MINE_COUNT) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue;
    if (g[r][c].isMine) continue;
    g[r][c].isMine = true;
    placed++;
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c].isMine) continue;
      g[r][c].adjacentMines = DELTAS.reduce((acc, [dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        return acc + (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && g[nr][nc].isMine ? 1 : 0);
      }, 0);
    }
  }
  return g;
}

function floodReveal(grid: Cell[][], sr: number, sc: number): Cell[][] {
  const g = grid.map(r => r.map(c => ({ ...c })));
  function flood(r: number, c: number) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || g[r][c].state !== 'hidden') return;
    g[r][c].state = 'revealed';
    if (g[r][c].adjacentMines === 0) DELTAS.forEach(([dr, dc]) => flood(r + dr, c + dc));
  }
  flood(sr, sc);
  return g;
}

function revealMines(grid: Cell[][]): Cell[][] {
  return grid.map(r => r.map(c => ({ ...c, state: (c.isMine ? 'revealed' : c.state) as CellState })));
}

function flagMines(grid: Cell[][]): Cell[][] {
  return grid.map(r => r.map(c => ({ ...c, state: (c.isMine ? 'flagged' : c.state) as CellState })));
}

function checkWin(grid: Cell[][]): boolean {
  return grid.every(r => r.every(c => c.isMine || c.state === 'revealed'));
}

// ── 컴포넌트 ──────────────────────────────────────────────
export default function Page() {
  const [grid,     setGrid]     = useState<Cell[][]>(createGrid);
  const [status,   setStatus]   = useState<GameStatus>('idle');
  const [seconds,  setSeconds]  = useState(0);
  const [scores,   setScores]   = useState<LeaderboardEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [nickname, setNickname] = useState('');
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);

  const flagCount = grid.flat().filter(c => c.state === 'flagged').length;

  // 타이머
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // 초기 리더보드 로드
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try   { setScores(await fetchTopScores()); }
    catch { /* Firebase 미설정 시 무시 */ }
    finally { setLoading(false); }
  }

  function handleClick(r: number, c: number) {
    if (status === 'won' || status === 'lost') return;
    if (grid[r][c].state !== 'hidden') return;

    let cur = grid;
    if (status === 'idle') { cur = placeMines(grid, r, c); setStatus('playing'); }

    if (cur[r][c].isMine) { setGrid(revealMines(cur)); setStatus('lost'); return; }

    const next = floodReveal(cur, r, c);
    if (checkWin(next)) { setGrid(flagMines(next)); setStatus('won'); }
    else setGrid(next);
  }

  function handleRight(e: React.MouseEvent, r: number, c: number) {
    e.preventDefault();
    if (status === 'won' || status === 'lost' || grid[r][c].state === 'revealed') return;
    setGrid(prev => {
      const g = prev.map(r => r.map(c => ({ ...c })));
      g[r][c].state = prev[r][c].state === 'hidden' ? 'flagged' : 'hidden';
      return g;
    });
  }

  function reset() {
    setGrid(createGrid()); setStatus('idle');
    setSeconds(0); setNickname(''); setSaved(false);
  }

  async function handleSave() {
    const name = nickname.trim();
    if (!name || saved || saving) return;
    setSaving(true);
    try { await saveScore(name, seconds); await load(); setSaved(true); }
    finally { setSaving(false); }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>지뢰찾기</h1>

      <div className={styles.game}>
        <div className={styles.statusBar}>
          <div className={styles.lcd}>
            {String(Math.max(MINE_COUNT - flagCount, 0)).padStart(3, '0')}
          </div>
          <button className={styles.face} onClick={reset}>{FACE[status]}</button>
          <div className={styles.lcd}>
            {String(Math.min(seconds, 999)).padStart(3, '0')}
          </div>
        </div>

        <div className={styles.board} onContextMenu={e => e.preventDefault()}>
          {grid.map((row, r) => row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={[
                styles.cell,
                styles[cell.state],
                cell.state === 'revealed' && cell.isMine ? styles.mine : '',
              ].join(' ')}
              onClick={() => handleClick(r, c)}
              onContextMenu={e => handleRight(e, r, c)}
              style={{
                color: cell.state === 'revealed' && !cell.isMine && cell.adjacentMines > 0
                  ? NUMBER_COLORS[cell.adjacentMines] : undefined,
              }}
            >
              {cell.state === 'flagged' ? '🚩'
                : cell.state === 'hidden' ? ''
                : cell.isMine ? '💣'
                : cell.adjacentMines > 0 ? String(cell.adjacentMines) : ''}
            </button>
          )))}
        </div>
      </div>

      {(status === 'won' || status === 'lost') && (
        <div className={`${styles.result} ${status === 'won' ? styles.won : styles.lost}`}>
          <p>{status === 'won' ? '🎉 클리어!' : '💥 게임 오버'}</p>
          {status === 'won' && (
            <>
              <p className={styles.winTime}>{fmt(seconds)}</p>
              {!saved
                ? <div className={styles.saveRow}>
                    <input
                      className={styles.input}
                      placeholder="닉네임"
                      value={nickname}
                      maxLength={12}
                      onChange={e => setNickname(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                      autoFocus
                    />
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                      {saving ? '…' : '저장'}
                    </button>
                  </div>
                : <p className={styles.savedMsg}>저장 완료!</p>
              }
            </>
          )}
          <button className={styles.retry} onClick={reset}>다시 하기</button>
        </div>
      )}

      <div className={styles.board2}>
        <p className={styles.boardTitle}>🏆 TOP 10</p>
        {loading
          ? <p className={styles.hint}>불러오는 중…</p>
          : scores.length === 0
            ? <p className={styles.hint}>기록 없음</p>
            : <ul className={styles.list}>
                {scores.map((e, i) => (
                  <li key={e.id} className={styles.row}>
                    <span className={styles.rank}>
                      {i < 3 ? MEDALS[i] : <span className={styles.num}>{i + 1}</span>}
                    </span>
                    <span className={styles.name}>{e.nickname}</span>
                    <span className={styles.time}>{fmt(e.time)}</span>
                  </li>
                ))}
              </ul>
        }
      </div>
    </div>
  );
}
