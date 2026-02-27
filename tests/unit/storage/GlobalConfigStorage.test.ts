import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GlobalConfigStorage } from '../../../src/storage/GlobalConfigStorage.js';

describe('GlobalConfigStorage', () => {
  let tmpDir: string;
  let storage: GlobalConfigStorage;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'taskcli-test-'));
    storage = new GlobalConfigStorage(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  describe('load()', () => {
    it('設定ファイルが存在しない場合はデフォルト値を返す', () => {
      const config = storage.load();
      expect(config.activeProject).toBeNull();
      expect(config.projects).toEqual([]);
    });

    it('保存した設定を正しく読み込む', () => {
      storage.save({
        activeProject: 'my-app',
        projects: ['my-app', 'personal'],
      });
      const config = storage.load();
      expect(config.activeProject).toBe('my-app');
      expect(config.projects).toEqual(['my-app', 'personal']);
    });
  });

  describe('save()', () => {
    it('設定を保存してから読み込むと同じ値を返す', () => {
      const expected = { activeProject: null, projects: ['proj1'] };
      storage.save(expected);
      const config = storage.load();
      expect(config).toEqual(expected);
    });

    it('activeProject を null で保存できる', () => {
      storage.save({ activeProject: null, projects: [] });
      expect(storage.load().activeProject).toBeNull();
    });
  });

  describe('ensureDirectory()', () => {
    it('ディレクトリが存在しない場合でも設定を読み書きできる', () => {
      const nestedDir = join(tmpDir, 'nested', 'task');
      const nestedStorage = new GlobalConfigStorage(nestedDir);
      nestedStorage.save({ activeProject: 'test', projects: [] });
      expect(nestedStorage.load().activeProject).toBe('test');
    });
  });
});
