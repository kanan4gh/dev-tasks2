import { AppError } from '../types/index.js';
import type { DailyLog, Routine, RoutineStats } from '../types/index.js';
import type { DailyStorage } from '../storage/DailyStorage.js';

export interface RoutineListItem {
  routine: Routine;
  status: 'pending' | 'done' | 'paused';
  rate: number | null; // null = paused（表示用 `-`）
}

export class DailyManager {
  constructor(private readonly storage: DailyStorage) {}

  private today(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private nextId(): number {
    const routines = this.storage.loadRoutines();
    if (routines.length === 0) return 1;
    return Math.max(...routines.map((r) => r.id)) + 1;
  }

  /**
   * 日付が変わっていた場合、今日の空ログを新規作成する。
   */
  private checkAndResetIfNewDay(): void {
    const log = this.storage.loadLog();
    const today = this.today();
    if (log.date !== today) {
      const routines = this.storage.loadRoutines();
      const entries: Record<number, 'pending' | 'done'> = {};
      for (const r of routines.filter((r) => !r.paused)) {
        entries[r.id] = 'pending';
      }
      this.storage.saveLog({ date: today, entries });
    }
  }

  /**
   * 直近 n 日分の日付文字列を古い順で返す（今日を含む）。
   */
  private recentDates(days: number): string[] {
    const today = this.today();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });
  }

  private calcRate(
    routineId: number,
    createdAt: string,
    logs: DailyLog[]
  ): number {
    const createdDate = createdAt.slice(0, 10);
    const relevantLogs = logs.filter((l) => l.date >= createdDate);
    if (relevantLogs.length === 0) return 0;
    const doneDays = relevantLogs.filter(
      (l) => l.entries[routineId] === 'done'
    ).length;
    return doneDays / relevantLogs.length;
  }

  addRoutine(title: string): Routine {
    const routines = this.storage.loadRoutines();
    const routine: Routine = {
      id: this.nextId(),
      title,
      paused: false,
      createdAt: new Date().toISOString(),
    };
    routines.push(routine);
    this.storage.saveRoutines(routines);
    return routine;
  }

  /**
   * ルーティーン一覧を返す。
   * all=false: アクティブのみ（達成率高い順）
   * all=true: アクティブ（達成率高い順）+ paused（末尾）
   */
  listRoutines(all = false): RoutineListItem[] {
    this.checkAndResetIfNewDay();
    const routines = this.storage.loadRoutines();
    const log = this.storage.loadLog();
    const recentLogs = this.storage.loadRecentLogs(7);

    const active = routines
      .filter((r) => !r.paused)
      .map((routine) => ({
        routine,
        status: ((log.entries[routine.id] as 'pending' | 'done') ??
          'pending') as 'pending' | 'done' | 'paused',
        rate: this.calcRate(routine.id, routine.createdAt, recentLogs),
      }))
      .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

    if (!all) return active;

    const paused = routines
      .filter((r) => r.paused)
      .map((routine) => ({
        routine,
        status: 'paused' as const,
        rate: null,
      }));

    return [...active, ...paused];
  }

  markDone(id: number): void {
    this.checkAndResetIfNewDay();
    const routines = this.storage.loadRoutines();
    const routine = routines.find((r) => r.id === id);
    if (!routine) {
      throw new AppError(
        'ルーティーンが見つかりません',
        `ID=${id} のルーティーンは存在しません`,
        'task daily list で有効な ID を確認してください'
      );
    }
    if (routine.paused) {
      throw new AppError(
        'このルーティーンは一時停止中です',
        `ID=${id} のルーティーンは paused です`,
        'task daily resume <id> で再開してください'
      );
    }
    const log = this.storage.loadLog();
    log.entries[id] = 'done';
    this.storage.saveLog(log);
  }

  pauseRoutine(id: number): void {
    const routines = this.storage.loadRoutines();
    const index = routines.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new AppError(
        'ルーティーンが見つかりません',
        `ID=${id} のルーティーンは存在しません`,
        'task daily list --all で有効な ID を確認してください'
      );
    }
    routines[index] = { ...routines[index], paused: true };
    this.storage.saveRoutines(routines);
  }

  resumeRoutine(id: number): void {
    const routines = this.storage.loadRoutines();
    const index = routines.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new AppError(
        'ルーティーンが見つかりません',
        `ID=${id} のルーティーンは存在しません`,
        'task daily list --all で有効な ID を確認してください'
      );
    }
    routines[index] = { ...routines[index], paused: false };
    this.storage.saveRoutines(routines);
  }

  deleteRoutine(id: number): void {
    const routines = this.storage.loadRoutines();
    const index = routines.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new AppError(
        'ルーティーンが見つかりません',
        `ID=${id} のルーティーンは存在しません`,
        'task daily list --all で有効な ID を確認してください'
      );
    }
    routines.splice(index, 1);
    this.storage.saveRoutines(routines);
    this.storage.cleanupRoutineFromLogs(id);
  }

  reset(): void {
    this.checkAndResetIfNewDay();
    const log = this.storage.loadLog();
    const activeIds = new Set(
      this.storage
        .loadRoutines()
        .filter((r) => !r.paused)
        .map((r) => r.id)
    );
    const entries: Record<number, 'pending' | 'done'> = {};
    for (const key of Object.keys(log.entries)) {
      const id = Number(key);
      if (activeIds.has(id)) {
        entries[id] = 'pending';
      }
    }
    this.storage.saveLog({ ...log, entries });
  }

  getStats(): RoutineStats[] {
    const routines = this.storage.loadRoutines().filter((r) => !r.paused);
    const recentLogs = this.storage.loadRecentLogs(7);
    const dates = this.recentDates(7);

    return routines.map((routine) => {
      const weekHistory = dates.map<'done' | 'pending' | 'no-data'>((date) => {
        if (date < routine.createdAt.slice(0, 10)) return 'no-data';
        const log = recentLogs.find((l) => l.date === date);
        if (!log) return 'no-data';
        return (log.entries[routine.id] as 'pending' | 'done') ?? 'pending';
      });
      const rate = this.calcRate(routine.id, routine.createdAt, recentLogs);
      return { routine, weekHistory, rate };
    });
  }
}
