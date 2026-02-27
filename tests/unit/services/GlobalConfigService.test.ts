import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GlobalConfigService } from '../../../src/services/GlobalConfigService.js';
import { GlobalConfigStorage } from '../../../src/storage/GlobalConfigStorage.js';

describe('GlobalConfigService', () => {
  let tmpDir: string;
  let service: GlobalConfigService;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'taskcli-test-'));
    const storage = new GlobalConfigStorage(tmpDir);
    service = new GlobalConfigService(storage, tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  describe('getActiveProject()', () => {
    it('初期状態は null を返す', () => {
      expect(service.getActiveProject()).toBeNull();
    });

    it('設定後はプロジェクト名を返す', () => {
      service.setActiveProject('my-app');
      expect(service.getActiveProject()).toBe('my-app');
    });
  });

  describe('setActiveProject()', () => {
    it('null を設定すると Inbox モードになる', () => {
      service.setActiveProject('my-app');
      service.setActiveProject(null);
      expect(service.getActiveProject()).toBeNull();
    });
  });

  describe('createProject()', () => {
    it('プロジェクトを作成して listProjects に追加される', () => {
      service.createProject('my-project');
      expect(service.listProjects()).toContain('my-project');
    });

    it('同名プロジェクトを作成すると AppError をスローする', () => {
      service.createProject('dup');
      expect(() => service.createProject('dup')).toThrow();
    });
  });

  describe('removeProject()', () => {
    it('登録済みプロジェクトを削除できる', () => {
      service.createProject('to-remove');
      service.removeProject('to-remove');
      expect(service.listProjects()).not.toContain('to-remove');
    });

    it('アクティブプロジェクトを削除すると activeProject が null になる', () => {
      service.createProject('active');
      service.setActiveProject('active');
      service.removeProject('active');
      expect(service.getActiveProject()).toBeNull();
    });

    it('存在しないプロジェクトを削除しようとすると AppError をスローする', () => {
      expect(() => service.removeProject('nonexistent')).toThrow();
    });
  });

  describe('getTaskFilePath()', () => {
    it('null の場合は inbox パスを返す', () => {
      const path = service.getTaskFilePath(null);
      expect(path).toContain('inbox');
    });

    it('プロジェクト名の場合は projects/<name> パスを返す', () => {
      const path = service.getTaskFilePath('my-app');
      expect(path).toContain('projects/my-app');
    });
  });
});
