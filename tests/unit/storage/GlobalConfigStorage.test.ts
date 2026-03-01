import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
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
      expect(config.lastProjectId).toBe(0);
    });

    it('新フォーマットの設定を正しく読み込む', () => {
      storage.save({
        activeProject: 'my-app',
        projects: [
          { name: 'my-app', id: 1 },
          { name: 'personal', id: 2 },
        ],
        lastProjectId: 2,
      });
      const config = storage.load();
      expect(config.activeProject).toBe('my-app');
      expect(config.projects).toEqual([
        { name: 'my-app', id: 1 },
        { name: 'personal', id: 2 },
      ]);
      expect(config.lastProjectId).toBe(2);
    });

    it('旧フォーマット (projects: string[]) を自動マイグレーションする', () => {
      const configPath = join(tmpDir, 'config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          activeProject: 'my-app',
          projects: ['my-app', 'personal'],
        }),
        'utf-8'
      );
      const config = storage.load();
      expect(config.projects).toEqual([
        { name: 'my-app', id: 1 },
        { name: 'personal', id: 2 },
      ]);
      expect(config.lastProjectId).toBe(2);
      expect(config.activeProject).toBe('my-app');
    });

    it('旧フォーマットで projects が空配列の場合もマイグレーションできる', () => {
      const configPath = join(tmpDir, 'config.json');
      writeFileSync(
        configPath,
        JSON.stringify({ activeProject: null, projects: [] }),
        'utf-8'
      );
      const config = storage.load();
      expect(config.projects).toEqual([]);
      expect(config.lastProjectId).toBe(0);
    });
  });

  describe('save()', () => {
    it('設定を保存してから読み込むと同じ値を返す', () => {
      const expected = {
        activeProject: null,
        projects: [{ name: 'proj1', id: 1 }],
        lastProjectId: 1,
      };
      storage.save(expected);
      const config = storage.load();
      expect(config).toEqual(expected);
    });

    it('activeProject を null で保存できる', () => {
      storage.save({ activeProject: null, projects: [], lastProjectId: 0 });
      expect(storage.load().activeProject).toBeNull();
    });
  });

  describe('ensureDirectory()', () => {
    it('ディレクトリが存在しない場合でも設定を読み書きできる', () => {
      const nestedDir = join(tmpDir, 'nested', 'task');
      const nestedStorage = new GlobalConfigStorage(nestedDir);
      nestedStorage.save({
        activeProject: 'test',
        projects: [],
        lastProjectId: 0,
      });
      expect(nestedStorage.load().activeProject).toBe('test');
    });
  });
});
