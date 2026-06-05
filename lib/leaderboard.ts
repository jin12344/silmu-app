import {
  collection, addDoc, query,
  orderBy, limit, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  time: number;
  createdAt: Date;
}

export async function saveScore(nickname: string, time: number): Promise<void> {
  await addDoc(collection(db, 'leaderboard'), {
    nickname,
    time,
    createdAt: serverTimestamp(),
  });
}

export async function fetchTopScores(): Promise<LeaderboardEntry[]> {
  const q = query(
    collection(db, 'leaderboard'),
    orderBy('time', 'asc'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id:        doc.id,
    nickname:  doc.data().nickname as string,
    time:      doc.data().time as number,
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
  }));
}
