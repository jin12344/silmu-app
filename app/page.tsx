'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  saveScore,
  fetchTopScores,
  type LeaderboardEntry,
} from '@/lib/leaderboard';
import styles from './page.module.css';

// ── 타입 ─────────────────────────────────────────────────
type CellState  = 'hidden' | 'revealed' | 'flagged';
type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

interface Cell {
  state:         CellState;
  isMine:        boolean;
  adjacentMines: number;
}

// ── 상수 ─────────────────────────────────────────────────
const ROWS       = 10;
const COLS       = 10;
const MINE_COUNT = 10;

const DELTAS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
];

const NUM_COLORS: Record<number, string> = {
  1: '#1a73e8', 2: '#0f9d58', 3: '#d93025', 4: '#4527a0',
  5: '#7b3f00', 6: '#00838f', 7: '#212121', 8: '#757575',
};

const FACE: Record<GameStatus, string> = {
  idle: '🙂', playing: '😮', won: '😎', lost: '😵',
};

const MEDALS = ['🥇', '🥈', '🥉'];

// ── 유틸 ─────────────────────────────────────────────────
function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function padLcd(n: number, max = 999): string {
  return String(Math.min(Math.max(n, 0), max)).padStart(3, '0');
}

// ── 게임 엔진 (순수 함수) ──────────────────────────────────
function createGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      state: 'hidden' as CellState,
      isMine: false,
      adjacentMines: 0,
    }))
  );
}

function placeMines(grid: Cell[][], safeRow: number, safeCol: number): Cell[][] {
  const next = grid.map(r => r.map(c => ({ ...c })));

  let placed = 0;
  while (placed < MINE_COUNT) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    if (next[r][c].isMine) continue;
    next[r][c].isMine = true;
    placed++;
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (next[r][c].isMine) continue;
      next[r][c].adjacentMines = DELTAS.reduce((acc, [dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        return acc + (
          nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && next[nr][nc].isMine ? 1 : 0
        );
      }, 0);
    }
  }
  return next;
}

function floodReveal(grid: Cell[][], startRow: number, startCol: number): Cell[][] {
  const next = grid.map(r => r.map(c => ({ ...c })));

  function flood(r: number, c: number) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (next[r][c].state !== 'hidden') return;
    next[r][c].state = 'revealed';
    if (next[r][c].adjacentMines === 0) {
      DELTAS.forEach(([dr, dc]) => flood(r + dr, c + dc));
    }
  }

  flood(startRow, startCol);
  return next;
}

function revealAllMines(grid: Cell[][]): Cell[][] {
  return grid.map(r =>
    r.map(c => ({ ...c, state: (c.isMine ? 'revealed' : c.state) as CellState }))
  );
}

function flagAllMines(grid: Cell[][]): Cell[][] {
  return grid.map(r =>
    r.map(c => ({ ...c, state: (c.isMine ? 'flagged' : c.state) as CellState }))
  );
}

function isCleared(grid: Cell[][]): boolean {
  return grid.every(r => r.every(c => c.isMine || c.state === 'revealed'));
}

function cellLabel(cell: Cell): string {
  if (cell.state === 'flagged')   return '🚩';
  if (cell.state === 'hidden')    return '';
  if (cell.isMine)                return '💣';
  if (cell.adjacentMines === 0)   return '';
  return String(cell.adjacentMines);
}

function cellClassName(cell: Cell, s: typeof styles): string {
  const base  = s.cell;
  const state = cell.state === 'hidden'   ? s.hidden
              : cell.state === 'flagged'  ? s.flagged
              : s.revealed;
  const mine  = cell.state === 'revealed' && cell.isMine ? s.mine : '';
  return [base, state, mine].filter(Boolean).join(' ');
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

  const flagCount     = grid.flat().filter(c => c.state === 'flagged').length;
  const minesLeft     = MINE_COUNT - flagCount;

  // ── 타이머 ────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // ── 리더보드 로드 ──────────────────────────────────────
  const loadScores = useCallback(async () => {
    setLoading(true);
    try {
      setScores(await fetchTopScores());
    } catch {
      // Firebase 미설정 시 조용히 무시
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadScores(); }, [loadScores]);

  // ── 게임 로직 ──────────────────────────────────────────
  function handleCellClick(row: number, col: number) {
    if (status === 'won' || status === 'lost') return;
    if (grid[row][col].state !== 'hidden') return;

    let cur = grid;
    if (status === 'idle') {
      cur = placeMines(grid, row, col);
      setStatus('playing');
    }

    if (cur[row][col].isMine) {
      setGrid(revealAllMines(cur));
      setStatus('lost');
      return;
    }

    const next = floodReveal(cur, row, col);
    if (isCleared(next)) {
      setGrid(flagAllMines(next));
      setStatus('won');
    } else {
      setGrid(next);
    }
  }

  function handleCellRightClick(e: React.MouseEvent, row: number, col: number) {
    e.preventDefault();
    if (status === 'won' || status === 'lost') return;
    if (grid[row][col].state === 'revealed') return;

    setGrid(prev => {
      const next = prev.map(r => r.map(c => ({ ...c })));
      next[row][col].state =
        prev[row][col].state === 'hidden' ? 'flagged' : 'hidden';
      return next;
    });
  }

  function resetGame() {
    setGrid(createGrid());
    setStatus('idle');
    setSeconds(0);
    setNickname('');
    setSaved(false);
  }

  // ── Firebase 저장 ──────────────────────────────────────
  async function handleSave() {
    const name = nickname.trim();
    if (!name || saved || saving) return;
    setSaving(true);
    try {
      await saveScore(name, seconds);
      await loadScores();
      setSaved(true);
    } catch {
      alert('저장 중 오류가 발생했습니다. Firebase 설정을 확인하세요.');
    } finally {
      setSaving(false);
    }
  }

  // ── 렌더 ───────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>지뢰찾기</h1>

      {/* ── 게임 영역 ── */}
      <div className={styles.game}>

        {/* 상태바 */}
        <div className={styles.statusBar}>
          <div className={styles.lcd}>{padLcd(minesLeft)}</div>
          <button className={styles.face} onClick={resetGame} title="다시 시작">
            {FACE[status]}
          </button>
          <div className={styles.lcd}>{padLcd(seconds)}</div>
        </div>

        {/* 보드 */}
        <div
          className={styles.board}
          onContextMenu={e => e.preventDefault()}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                className={cellClassName(cell, styles)}
                onClick={() => handleCellClick(r, c)}
                onContextMenu={e => handleCellRightClick(e, r, c)}
                style={{
                  color:
                    cell.state === 'revealed' &&
                    !cell.isMine &&
                    cell.adjacentMines > 0
                      ? NUM_COLORS[cell.adjacentMines]
                      : undefined,
                }}
              >
                {cellLabel(cell)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── 결과 배너 ── */}
      {(status === 'won' || status === 'lost') && (
        <div className={`${styles.result} ${status === 'won' ? styles.won : styles.lost}`}>
          <p className={styles.resultTitle}>
            {status === 'won' ? '🎉 클리어!' : '💥 게임 오버'}
          </p>

          {status === 'won' && (
            <div className={styles.saveArea}>
              <p className={styles.winTime}>{fmtTime(seconds)}</p>

              {!saved ? (
                <div className={styles.saveRow}>
                  <input
                    className={styles.input}
                    placeholder="닉네임 (최대 12자)"
                    value={nickname}
                    maxLength={12}
                    onChange={e => setNickname(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    autoFocus
                  />
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? '저장 중…' : '저장'}
                  </button>
                </div>
              ) : (
                <p className={styles.savedMsg}>✅ 기록 저장 완료!</p>
              )}
            </div>
          )}

          <button className={styles.retryBtn} onClick={resetGame}>
            다시 하기
          </button>
        </div>
      )}

      {/* ── 리더보드 ── */}
      <section className={styles.leaderboard}>
        <h2 className={styles.lbTitle}>🏆 TOP 10</h2>

        {loading ? (
          <p className={styles.hint}>불러오는 중…</p>
        ) : scores.length === 0 ? (
          <p className={styles.hint}>아직 기록이 없습니다</p>
        ) : (
          <ul className={styles.lbList}>
            {scores.map((entry, i) => (
              <li key={entry.id} className={styles.lbRow}>
                <span className={styles.lbRank}>
                  {i < 3
                    ? MEDALS[i]
                    : <span className={styles.lbNum}>{i + 1}</span>}
                </span>
                <span className={styles.lbName}>{entry.nickname}</span>
                <span className={styles.lbTime}>{fmtTime(entry.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
