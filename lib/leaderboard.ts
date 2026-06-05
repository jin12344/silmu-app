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

// n=닉네임, t=시간(초), c=저장시각 — 짧은 키로 용량 절약
export async function saveScore(nickname: string, time: number): Promise<void> {
  await push(ref(db, 'leaderboard'), {
    n: nickname,
    t: time,
    c: Date.now(),
  });
}

// .indexOn["t"] 덕분에 서버 정렬 후 10개만 전송
export async function fetchTopScores(): Promise<LeaderboardEntry[]> {
  const q = query(
    ref(db, 'leaderboard'),
    orderByChild('t'),
    limitToFirst(10),
  );
  const snap = await get(q);

  const entries: LeaderboardEntry[] = [];
  snap.forEach(child => {
    const v = child.val();
    entries.push({
      id:        child.key ?? '',
      nickname:  v.n as string,
      time:      v.t as number,
      createdAt: new Date(v.c as number),
    });
  });

  return entries.sort((a, b) => a.time - b.time);
}
