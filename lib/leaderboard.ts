import {
  ref, push, query,
  orderByChild, limitToFirst, get,
} from 'firebase/database';
import { db } from './firebase';

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  time: number;
  createdAt: Date;
}

export async function saveScore(nickname: string, time: number): Promise<void> {
  await push(ref(db, 'leaderboard'), {
    n: nickname,
    t: time,
    c: Date.now(),
  });
}

export async function fetchTopScores(): Promise<LeaderboardEntry[]> {
  const q = query(ref(db, 'leaderboard'), orderByChild('t'), limitToFirst(10));
  const snap = await get(q);

  const entries: LeaderboardEntry[] = [];
  snap.forEach(child => {
    entries.push({
      id:        child.key!,
      nickname:  child.val().n,
      time:      child.val().t,
      createdAt: new Date(child.val().c),
    });
  });

  return entries.sort((a, b) => a.time - b.time);
}
