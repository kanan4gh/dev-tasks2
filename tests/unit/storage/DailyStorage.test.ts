import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DailyStorage } from '../../../src/storage/DailyStorage.js';
import type { Routine, DailyLog } from '../../../src/types/index.js';

describe('DailyStorage', () => {
  let tmpDir: string;
  let storage: DailyStorage;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'taskcli-daily-'));
    storage = new DailyStorage(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  describe('loadRoutines()', () => {
    it('ファイルが存在しない場合は空配列を返す', () => {
      expect(storage.loadRoutines()).toEqual([]);
    });

    it('保存したルーティーンを読み込める', () => {
      const routines: Routine[] = [
        {
          id: 1,
          title: '朝のストレッチ',
          paused: false,
          createdAt: '2026-03-03T00:00:00Z',
        },
      ];
      storage.saveRoutines(routines);
      expect(storage.loadRoutines()).toEqual(routines);
    });
  });

  describe('saveRoutines()', () => {
    it('複数のルーティーンを保存できる', () => {
      const routines: Routine[] = [
        {
          id: 1,
          title: 'ルーティーン1',
          paused: false,
          createdAt: '2026-03-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'ルーティーン2',
          paused: true,
          createdAt: '2026-03-02T00:00:00Z',
        },
      ];
      storage.saveRoutines(routines);
      expect(storage.loadRoutines()).toEqual(routines);
    });
  });

  describe('loadLog()', () => {
    it('ログが存在しない場合は今日の空ログを返す', () => {
      const today = new Date().toISOString().slice(0, 10);
      const log = storage.loadLog();
      expect(log.date).toBe(today);
      expect(log.entries).toEqual({});
    });

    it('最新のログを返す', () => {
      const older: DailyLog = { date: '2026-03-01', entries: { 1: 'done' } };
      const newer: DailyLog = { date: '2026-03-03', entries: { 1: 'pending' } };
      storage.saveLog(older);
      storage.saveLog(newer);
      expect(storage.loadLog().date).toBe('2026-03-03');
    });
  });

  describe('saveLog()', () => {
    it('新しいログを追加できる', () => {
      const log: DailyLog = { date: '2026-03-03', entries: { 1: 'done' } };
      storage.saveLog(log);
      expect(storage.loadLog()).toEqual(log);
    });

    it('同じ日付のログを上書きできる', () => {
      storage.saveLog({ date: '2026-03-03', entries: { 1: 'pending' } });
      storage.saveLog({ date: '2026-03-03', entries: { 1: 'done' } });
      expect(storage.loadLog().entries[1]).toBe('done');
    });

    it('30件を超えた古いログは削除される', () => {
      for (let i = 1; i <= 32; i++) {
        const date = `2026-01-${String(i).padStart(2, '0')}`;
        storage.saveLog({ date, entries: {} });
      }
      const logs = storage.loadRecentLogs(40);
      expect(logs.length).toBe(30);
    });
  });

  describe('loadRecentLogs()', () => {
    it('新しい順で指定件数を返す', () => {
      storage.saveLog({ date: '2026-03-01', entries: { 1: 'done' } });
      storage.saveLog({ date: '2026-03-03', entries: { 1: 'pending' } });
      storage.saveLog({ date: '2026-03-02', entries: { 1: 'done' } });

      const logs = storage.loadRecentLogs(2);
      expect(logs).toHaveLength(2);
      expect(logs[0].date).toBe('2026-03-03');
      expect(logs[1].date).toBe('2026-03-02');
    });
  });

  describe('cleanupRoutineFromLogs()', () => {
    it('全ログから指定 ID のエントリを削除する', () => {
      storage.saveLog({
        date: '2026-03-01',
        entries: { 1: 'done', 2: 'pending' },
      });
      storage.saveLog({
        date: '2026-03-02',
        entries: { 1: 'pending', 2: 'done' },
      });

      storage.cleanupRoutineFromLogs(1);

      const logs = storage.loadRecentLogs(7);
      for (const log of logs) {
        expect(log.entries[1]).toBeUndefined();
        expect(log.entries[2]).toBeDefined();
      }
    });
  });
});
