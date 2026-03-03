import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DailyManager } from '../../src/services/DailyManager.js';
import { DailyStorage } from '../../src/storage/DailyStorage.js';

describe('daily-workflow（統合テスト）', () => {
  let tmpDir: string;
  let storage: DailyStorage;
  let manager: DailyManager;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'taskcli-daily-integration-'));
    storage = new DailyStorage(tmpDir);
    manager = new DailyManager(storage);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(tmpDir, { recursive: true });
  });

  it('add → list → done → stats の一連フローが正常に動作する', () => {
    // add
    const r1 = manager.addRoutine('日報を書く');
    const r2 = manager.addRoutine('朝のストレッチ');
    expect(r1.id).toBe(1);
    expect(r2.id).toBe(2);

    // list（全て pending）
    const items = manager.listRoutines();
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.status === 'pending')).toBe(true);

    // done
    manager.markDone(1);
    const items2 = manager.listRoutines();
    const done = items2.find((i) => i.routine.id === 1);
    expect(done?.status).toBe('done');

    // stats（今日のみのデータ）
    const stats = manager.getStats();
    expect(stats).toHaveLength(2);
    const stat1 = stats.find((s) => s.routine.id === 1);
    expect(stat1?.weekHistory[6]).toBe('done'); // markDone で今日のログが保存済み
  });

  it('日付をまたいだ場合に自動リセットされる', () => {
    // 昨日
    vi.setSystemTime(new Date('2026-03-02T09:00:00Z'));
    manager.addRoutine('日報');
    manager.markDone(1);

    const yesterday = storage.loadLog();
    expect(yesterday.date).toBe('2026-03-02');
    expect(yesterday.entries[1]).toBe('done');

    // 今日
    vi.setSystemTime(new Date('2026-03-03T09:00:00Z'));
    const items = manager.listRoutines(); // → checkAndResetIfNewDay が発動

    expect(items[0].status).toBe('pending'); // 新しい日は pending にリセット

    const today = storage.loadLog();
    expect(today.date).toBe('2026-03-03');
    expect(today.entries[1]).toBe('pending');

    // 昨日のログも保持されている
    const recentLogs = storage.loadRecentLogs(7);
    const yesterdayLog = recentLogs.find((l) => l.date === '2026-03-02');
    expect(yesterdayLog?.entries[1]).toBe('done');
  });

  it('pause → list（非表示）→ list --all（表示）→ resume フロー', () => {
    manager.addRoutine('アクティブ');
    manager.addRoutine('一時停止対象');
    manager.pauseRoutine(2);

    // list（デフォルト）: paused は非表示
    const items = manager.listRoutines();
    expect(items).toHaveLength(1);
    expect(items[0].routine.id).toBe(1);

    // list --all: paused も末尾に表示
    const allItems = manager.listRoutines(true);
    expect(allItems).toHaveLength(2);
    expect(allItems[1].status).toBe('paused');
    expect(allItems[1].rate).toBeNull();

    // resume
    manager.resumeRoutine(2);
    const afterResume = manager.listRoutines();
    expect(afterResume).toHaveLength(2);
  });
});
