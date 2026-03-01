import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GlobalConfigService } from '../../../src/services/GlobalConfigService.js';
import { GlobalConfigStorage } from '../../../src/storage/GlobalConfigStorage.js';
import { AppError } from '../../../src/types/index.js';

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

    it('プロジェクト ID が自動採番される', () => {
      service.createProject('first');
      service.createProject('second');
      const entries = service.listProjectEntries();
      expect(entries[0]).toEqual({ name: 'first', id: 1 });
      expect(entries[1]).toEqual({ name: 'second', id: 2 });
    });

    it('同名プロジェクトを作成すると AppError をスローする', () => {
      service.createProject('dup');
      expect(() => service.createProject('dup')).toThrow(AppError);
    });
  });

  describe('listProjectEntries()', () => {
    it('ProjectEntry[] を返す', () => {
      service.createProject('alpha');
      service.createProject('beta');
      const entries = service.listProjectEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].name).toBe('alpha');
      expect(entries[1].name).toBe('beta');
    });
  });

  describe('getProjectById()', () => {
    it('存在する ID のエントリを返す', () => {
      service.createProject('my-app');
      const entry = service.getProjectById(1);
      expect(entry).toEqual({ name: 'my-app', id: 1 });
    });

    it('存在しない ID は undefined を返す', () => {
      expect(service.getProjectById(99)).toBeUndefined();
    });
  });

  describe('getActiveProjectEntry()', () => {
    it('アクティブプロジェクトがある場合は ProjectEntry を返す', () => {
      service.createProject('my-app');
      service.setActiveProject('my-app');
      const entry = service.getActiveProjectEntry();
      expect(entry).toEqual({ name: 'my-app', id: 1 });
    });

    it('Inbox モード（activeProject=null）の場合は { name: null, id: 0 } を返す', () => {
      const entry = service.getActiveProjectEntry();
      expect(entry).toEqual({ name: null, id: 0 });
    });
  });

  describe('renameProject()', () => {
    it('プロジェクト名を変更できる', () => {
      service.createProject('old-name');
      service.renameProject('old-name', 'new-name');
      expect(service.listProjects()).toContain('new-name');
      expect(service.listProjects()).not.toContain('old-name');
    });

    it('リネーム後も ID は変わらない', () => {
      service.createProject('old-name');
      const idBefore = service.getProjectByName('old-name')?.id;
      service.renameProject('old-name', 'new-name');
      const idAfter = service.getProjectByName('new-name')?.id;
      expect(idAfter).toBe(idBefore);
    });

    it('アクティブプロジェクトをリネームすると activeProject も更新される', () => {
      service.createProject('old-name');
      service.setActiveProject('old-name');
      service.renameProject('old-name', 'new-name');
      expect(service.getActiveProject()).toBe('new-name');
    });

    it('存在しないプロジェクトをリネームすると AppError をスローする', () => {
      expect(() => service.renameProject('nonexistent', 'new-name')).toThrow(
        AppError
      );
    });

    it('新名が既存プロジェクトと重複すると AppError をスローする', () => {
      service.createProject('alpha');
      service.createProject('beta');
      expect(() => service.renameProject('alpha', 'beta')).toThrow(AppError);
    });

    it('"inbox" にリネームしようとすると AppError をスローする', () => {
      service.createProject('my-app');
      expect(() => service.renameProject('my-app', 'inbox')).toThrow(AppError);
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
      expect(() => service.removeProject('nonexistent')).toThrow(AppError);
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
