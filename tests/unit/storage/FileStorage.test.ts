import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileStorage } from '../../../src/storage/FileStorage.js';
import type { Task } from '../../../src/types/index.js';

function makeTask(id: number, title: string): Task {
  return {
    id,
    title,
    description: '',
    status: 'open',
    priority: 'medium',
    branch: null,
    dueDate: null,
    createdAt: '2026-02-27T00:00:00Z',
    updatedAt: '2026-02-27T00:00:00Z',
  };
}

describe('FileStorage', () => {
  let tmpDir: string;
  let filePath: string;
  let storage: FileStorage;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'taskcli-test-'));
    filePath = join(tmpDir, 'tasks.json');
    storage = new FileStorage(filePath);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  describe('load()', () => {
    it('ファイルが存在しない場合は空配列を返す', () => {
      expect(storage.load()).toEqual([]);
    });

    it('保存したタスクを読み込む', () => {
      const tasks = [makeTask(1, 'Test task')];
      storage.save(tasks);
      expect(storage.load()).toEqual(tasks);
    });

    it('破損した JSON の場合は空配列を返す', () => {
      writeFileSync(filePath, '{invalid json', 'utf-8');
      expect(storage.load()).toEqual([]);
    });
  });

  describe('save()', () => {
    it('タスクを保存してから読み込むと同じ値を返す', () => {
      const tasks = [makeTask(1, 'Task 1'), makeTask(2, 'Task 2')];
      storage.save(tasks);
      expect(storage.load()).toEqual(tasks);
    });

    it('空配列を保存できる', () => {
      storage.save([makeTask(1, 'temp')]);
      storage.save([]);
      expect(storage.load()).toEqual([]);
    });

    it('書き込み成功後に .bak ファイルが残らない', () => {
      storage.save([makeTask(1, 'Task')]);
      storage.save([makeTask(2, 'Task 2')]);
      expect(existsSync(`${filePath}.bak`)).toBe(false);
    });

    it('ネストしたディレクトリが存在しない場合でも保存できる', () => {
      const nestedPath = join(tmpDir, 'deep', 'nested', 'tasks.json');
      const nestedStorage = new FileStorage(nestedPath);
      const tasks = [makeTask(1, 'Nested')];
      nestedStorage.save(tasks);
      expect(nestedStorage.load()).toEqual(tasks);
    });
  });
});
