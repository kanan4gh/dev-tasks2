import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { DailyLog, Routine } from '../types/index.js';

const DAILY_DIR = join(homedir(), '.task', 'daily');

export class DailyStorage {
  private readonly dailyDir: string;
  private readonly routinesPath: string;
  private readonly logPath: string;

  constructor(dailyDir: string = DAILY_DIR) {
    this.dailyDir = dailyDir;
    this.routinesPath = join(dailyDir, 'routines.json');
    this.logPath = join(dailyDir, 'log.json');
  }

  ensureDirectory(): void {
    if (!existsSync(this.dailyDir)) {
      mkdirSync(this.dailyDir, { recursive: true });
    }
  }

  loadRoutines(): Routine[] {
    this.ensureDirectory();
    if (!existsSync(this.routinesPath)) return [];
    try {
      return JSON.parse(readFileSync(this.routinesPath, 'utf-8')) as Routine[];
    } catch {
      return [];
    }
  }

  saveRoutines(routines: Routine[]): void {
    this.ensureDirectory();
    writeFileSync(
      this.routinesPath,
      JSON.stringify(routines, null, 2),
      'utf-8'
    );
  }

  /**
   * 最新の DailyLog を返す。
   * ログが存在しない場合は今日の空ログを返す。
   * 最新ログが今日以外の場合もそのまま返す（checkAndResetIfNewDay で判定するため）。
   */
  loadLog(): DailyLog {
    const logs = this.loadAllLogs();
    if (logs.length === 0) {
      return { date: todayStr(), entries: {} };
    }
    return logs[0]; // 新しい順にソート済み
  }

  /**
   * 指定した DailyLog を日付キーで upsert する。
   * 30日を超えた古いログは自動削除する。
   */
  saveLog(log: DailyLog): void {
    const logs = this.loadAllLogs();
    const index = logs.findIndex((l) => l.date === log.date);
    if (index === -1) {
      logs.push(log);
    } else {
      logs[index] = log;
    }
    this.saveAllLogs(logs);
  }

  /**
   * 直近 n 日分のログを新しい順で返す（stats 用）。
   */
  loadRecentLogs(days: number): DailyLog[] {
    return this.loadAllLogs().slice(0, days);
  }

  /**
   * 指定ルーティーン ID のエントリを全ログから削除する（deleteRoutine 用）。
   */
  cleanupRoutineFromLogs(routineId: number): void {
    const logs = this.loadAllLogs();
    const updated = logs.map((log) => {
      const entries = { ...log.entries };
      delete entries[routineId];
      return { ...log, entries };
    });
    this.saveAllLogs(updated);
  }

  private loadAllLogs(): DailyLog[] {
    this.ensureDirectory();
    if (!existsSync(this.logPath)) return [];
    try {
      const parsed = JSON.parse(
        readFileSync(this.logPath, 'utf-8')
      ) as DailyLog[];
      // ゼロ埋めなし日付（例: "2026-03-9"）を正規化してからソートする。
      // 正規化しないと "2026-03-9" > "2026-03-10" となり並び順が崩れる。
      const normalized = parsed.map((log) => ({
        ...log,
        date: normalizeDate(log.date),
      }));
      return normalized.sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  }

  private saveAllLogs(logs: DailyLog[]): void {
    this.ensureDirectory();
    const sorted = logs
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30); // 30日分のみ保持
    writeFileSync(this.logPath, JSON.stringify(sorted, null, 2), 'utf-8');
  }
}

function todayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** "2026-3-9" → "2026-03-09" のようにゼロ埋め正規化する */
function normalizeDate(date: string): string {
  const parts = date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return date;
  const [year, month, day] = parts;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export { DAILY_DIR };
