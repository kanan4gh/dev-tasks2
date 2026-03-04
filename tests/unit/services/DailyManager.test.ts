import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DailyManager } from '../../../src/services/DailyManager.js';
import { DailyStorage } from '../../../src/storage/DailyStorage.js';
import { AppError } from '../../../src/types/index.js';

describe('DailyManager', () => {
  let tmpDir: string;
  let storage: DailyStorage;
  let manager: DailyManager;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'taskcli-daily-manager-'));
    storage = new DailyStorage(tmpDir);
    manager = new DailyManager(storage);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(tmpDir, { recursive: true });
  });

  describe('addRoutine()', () => {
    it('ID=1 から採番してルーティーンを登録する', () => {
      const routine = manager.addRoutine('朝のストレッチ');
      expect(routine.id).toBe(1);
      expect(routine.title).toBe('朝のストレッチ');
      expect(routine.paused).toBe(false);
    });

    it('既存のルーティーンがある場合、次の ID を採番する', () => {
      manager.addRoutine('ルーティーン1');
      const r2 = manager.addRoutine('ルーティーン2');
      expect(r2.id).toBe(2);
    });
  });

  describe('checkAndResetIfNewDay() (listRoutines 経由)', () => {
    it('日付が変わった場合、今日の空ログを作成する', () => {
      // 昨日のログを作成
      storage.saveLog({ date: '2026-03-02', entries: { 1: 'done' } });
      manager.addRoutine('ストレッチ');

      // 今日 list を実行 → checkAndResetIfNewDay が発動
      manager.listRoutines();

      const log = storage.loadLog();
      expect(log.date).toBe('2026-03-03');
      // 今日のエントリは pending で初期化
      expect(log.entries[1]).toBe('pending');
    });

    it('同じ日の場合はリセットしない', () => {
      manager.addRoutine('ストレッチ');
      manager.markDone(1);

      manager.listRoutines(); // 同日の再実行

      const log = storage.loadLog();
      expect(log.entries[1]).toBe('done'); // done が保持されている
    });
  });

  describe('markDone()', () => {
    it('正常に done に更新できる', () => {
      manager.addRoutine('日報');
      manager.markDone(1);

      const log = storage.loadLog();
      expect(log.entries[1]).toBe('done');
    });

    it('存在しない ID の場合 AppError をスローする', () => {
      expect(() => manager.markDone(99)).toThrow(AppError);
    });

    it('一時停止中のルーティーンは AppError をスローする', () => {
      manager.addRoutine('読書');
      manager.pauseRoutine(1);
      expect(() => manager.markDone(1)).toThrow(AppError);
    });

    it('すでに done のルーティーンを再度 done にしてもエラーにならない', () => {
      manager.addRoutine('日報');
      manager.markDone(1);
      expect(() => manager.markDone(1)).not.toThrow();
    });
  });

  describe('pauseRoutine() / resumeRoutine()', () => {
    it('pauseRoutine() でルーティーンを一時停止できる', () => {
      manager.addRoutine('読書');
      manager.pauseRoutine(1);

      const routines = storage.loadRoutines();
      expect(routines[0].paused).toBe(true);
    });

    it('resumeRoutine() で一時停止を解除できる', () => {
      manager.addRoutine('読書');
      manager.pauseRoutine(1);
      manager.resumeRoutine(1);

      const routines = storage.loadRoutines();
      expect(routines[0].paused).toBe(false);
    });

    it('存在しない ID で pauseRoutine は AppError をスローする', () => {
      expect(() => manager.pauseRoutine(99)).toThrow(AppError);
    });

    it('存在しない ID で resumeRoutine は AppError をスローする', () => {
      expect(() => manager.resumeRoutine(99)).toThrow(AppError);
    });
  });

  describe('resumeAllRoutines()', () => {
    it('pause 中の全ルーティーンを resume し件数を返す', () => {
      manager.addRoutine('読書');
      manager.addRoutine('運動');
      manager.addRoutine('料理');
      manager.pauseRoutine(1);
      manager.pauseRoutine(3);

      const count = manager.resumeAllRoutines();

      expect(count).toBe(2);
      const routines = storage.loadRoutines();
      expect(routines.every((r) => !r.paused)).toBe(true);
    });

    it('pause 中が 0 件の場合は 0 を返す', () => {
      manager.addRoutine('読書');
      manager.addRoutine('運動');

      const count = manager.resumeAllRoutines();

      expect(count).toBe(0);
    });
  });

  describe('deleteRoutine()', () => {
    it('ルーティーンを削除できる', () => {
      manager.addRoutine('削除対象');
      manager.deleteRoutine(1);
      expect(storage.loadRoutines()).toHaveLength(0);
    });

    it('ログの entries からも削除される', () => {
      manager.addRoutine('削除対象');
      storage.saveLog({ date: '2026-03-01', entries: { 1: 'done' } });
      storage.saveLog({ date: '2026-03-02', entries: { 1: 'pending' } });

      manager.deleteRoutine(1);

      const logs = storage.loadRecentLogs(7);
      for (const log of logs) {
        expect(log.entries[1]).toBeUndefined();
      }
    });

    it('存在しない ID で AppError をスローする', () => {
      expect(() => manager.deleteRoutine(99)).toThrow(AppError);
    });
  });

  describe('reset()', () => {
    it('今日の全エントリを pending に戻す', () => {
      manager.addRoutine('日報');
      manager.addRoutine('ストレッチ');
      manager.markDone(1);
      manager.markDone(2);

      manager.reset();

      const log = storage.loadLog();
      expect(log.entries[1]).toBe('pending');
      expect(log.entries[2]).toBe('pending');
    });
  });

  describe('listRoutines()', () => {
    it('達成率の高い順にソートされる', () => {
      // ルーティーン1: 登録日が古い（昨日）→ 昨日 done で達成率 100%
      vi.setSystemTime(new Date('2026-03-02T09:00:00Z'));
      manager.addRoutine('高達成率');
      storage.saveLog({ date: '2026-03-02', entries: { 1: 'done' } });

      // ルーティーン2: 今日登録 → 実績なし 0%
      vi.setSystemTime(new Date('2026-03-03T09:00:00Z'));
      manager.addRoutine('低達成率');

      const items = manager.listRoutines();
      expect(items[0].routine.id).toBe(1);
      expect(items[1].routine.id).toBe(2);
    });

    it('paused なルーティーンは返らない（all=false デフォルト）', () => {
      manager.addRoutine('アクティブ');
      manager.addRoutine('一時停止');
      manager.pauseRoutine(2);

      const items = manager.listRoutines();
      expect(items).toHaveLength(1);
      expect(items[0].routine.id).toBe(1);
    });

    it('all=true で paused も末尾に表示される', () => {
      manager.addRoutine('アクティブ');
      manager.addRoutine('一時停止');
      manager.pauseRoutine(2);

      const items = manager.listRoutines(true);
      expect(items).toHaveLength(2);
      expect(items[0].status).not.toBe('paused');
      expect(items[1].status).toBe('paused');
      expect(items[1].rate).toBeNull();
    });
  });

  describe('getStats()', () => {
    it('直近7日の履歴と達成率が正しく計算される', () => {
      vi.setSystemTime(new Date('2026-02-25T09:00:00Z'));
      manager.addRoutine('日報');

      // 2/25 〜 3/3 の 7日間、5日 done
      const doneDates = [
        '2026-02-25',
        '2026-02-26',
        '2026-02-27',
        '2026-02-28',
        '2026-03-01',
      ];
      for (const date of doneDates) {
        storage.saveLog({ date, entries: { 1: 'done' } });
      }
      storage.saveLog({ date: '2026-03-02', entries: { 1: 'pending' } });

      vi.setSystemTime(new Date('2026-03-03T09:00:00Z'));
      const stats = manager.getStats();

      expect(stats).toHaveLength(1);
      expect(stats[0].routine.id).toBe(1);
      expect(stats[0].weekHistory).toHaveLength(7);
      // 今日(3/3)のログは存在しないので no-data
      expect(stats[0].weekHistory[6]).toBe('no-data');
      // 3/1 は done
      expect(stats[0].weekHistory[4]).toBe('done');
      // 3/2 は pending
      expect(stats[0].weekHistory[5]).toBe('pending');
    });

    it('ルーティーン登録前の日は no-data になる', () => {
      // 今日登録
      manager.addRoutine('日報');

      const stats = manager.getStats();
      // 今日以外は全て no-data（登録前）
      expect(
        stats[0].weekHistory.slice(0, 6).every((h) => h === 'no-data')
      ).toBe(true);
    });

    it('paused なルーティーンは stats に含まれない', () => {
      manager.addRoutine('アクティブ');
      manager.addRoutine('一時停止');
      manager.pauseRoutine(2);

      const stats = manager.getStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].routine.id).toBe(1);
    });
  });
});
