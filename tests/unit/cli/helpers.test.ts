import { describe, it, expect, vi } from 'vitest';
import {
  parseId,
  parseTaskRef,
  resolveTaskContext,
} from '../../../src/cli/helpers.js';
import { AppError } from '../../../src/types/index.js';
import type { GlobalConfigService } from '../../../src/services/GlobalConfigService.js';

describe('parseId()', () => {
  it('有効な正の整数を返す', () => {
    expect(parseId('1')).toBe(1);
    expect(parseId('42')).toBe(42);
    expect(parseId('999')).toBe(999);
  });

  it('0 は AppError をスローする', () => {
    expect(() => parseId('0')).toThrow(AppError);
  });

  it('負数は AppError をスローする', () => {
    expect(() => parseId('-1')).toThrow(AppError);
  });

  it('文字列は AppError をスローする', () => {
    expect(() => parseId('abc')).toThrow(AppError);
  });

  it('小数は切り捨てて整数として扱う', () => {
    expect(parseId('3.7')).toBe(3);
  });
});

describe('parseTaskRef()', () => {
  it('"3" → { type: local, taskId: 3 }', () => {
    expect(parseTaskRef('3')).toEqual({ type: 'local', taskId: 3 });
  });

  it('"1-3" → { type: composite, projectId: 1, taskId: 3 }', () => {
    expect(parseTaskRef('1-3')).toEqual({
      type: 'composite',
      projectId: 1,
      taskId: 3,
    });
  });

  it('"0-2" → { type: composite, projectId: 0, taskId: 2 }（Inbox）', () => {
    expect(parseTaskRef('0-2')).toEqual({
      type: 'composite',
      projectId: 0,
      taskId: 2,
    });
  });

  it('"abc" は AppError をスローする', () => {
    expect(() => parseTaskRef('abc')).toThrow(AppError);
  });

  it('"0" は AppError をスローする（ローカル ID は正の整数）', () => {
    expect(() => parseTaskRef('0')).toThrow(AppError);
  });

  it('"-1" は AppError をスローする', () => {
    expect(() => parseTaskRef('-1')).toThrow(AppError);
  });
});

describe('resolveTaskContext()', () => {
  function makeConfigService(
    overrides: Partial<{
      activeProject: string | null;
      projectById: { name: string; id: number } | undefined;
      taskFilePath: string;
      inboxFilePath: string;
    }> = {}
  ): GlobalConfigService {
    const opts = {
      activeProject: 'my-app' as string | null,
      projectById: { name: 'my-app', id: 1 } as
        | { name: string; id: number }
        | undefined,
      taskFilePath: '/tmp/projects/my-app/tasks.json',
      inboxFilePath: '/tmp/inbox/tasks.json',
      ...overrides,
    };
    return {
      getActiveProject: vi.fn(() => opts.activeProject),
      getTaskFilePath: vi.fn((name: string | null) =>
        name === null ? opts.inboxFilePath : opts.taskFilePath
      ),
      getInboxTaskFilePath: vi.fn(() => opts.inboxFilePath),
      getProjectById: vi.fn(() => opts.projectById),
    } as unknown as GlobalConfigService;
  }

  it('local 型: アクティブプロジェクトのパスを返す', () => {
    const service = makeConfigService({ activeProject: 'my-app' });
    const result = resolveTaskContext({ type: 'local', taskId: 3 }, service);
    expect(result.projectName).toBe('my-app');
    expect(result.localId).toBe(3);
    expect(result.filePath).toContain('my-app');
  });

  it('local 型: Inbox モード（activeProject=null）', () => {
    const service = makeConfigService({ activeProject: null });
    const result = resolveTaskContext({ type: 'local', taskId: 2 }, service);
    expect(result.projectName).toBeNull();
    expect(result.localId).toBe(2);
    expect(result.filePath).toContain('inbox');
  });

  it('composite 型 (projectId=0): Inbox パスを返す', () => {
    const service = makeConfigService();
    const result = resolveTaskContext(
      { type: 'composite', projectId: 0, taskId: 5 },
      service
    );
    expect(result.projectName).toBeNull();
    expect(result.localId).toBe(5);
    expect(result.filePath).toContain('inbox');
  });

  it('composite 型 (projectId>0): getProjectById でプロジェクトを解決する', () => {
    const service = makeConfigService({
      projectById: { name: 'my-app', id: 1 },
    });
    const result = resolveTaskContext(
      { type: 'composite', projectId: 1, taskId: 3 },
      service
    );
    expect(result.projectName).toBe('my-app');
    expect(result.localId).toBe(3);
  });

  it('composite 型: 存在しない projectId は AppError をスローする', () => {
    const service = makeConfigService({ projectById: undefined });
    expect(() =>
      resolveTaskContext(
        { type: 'composite', projectId: 99, taskId: 1 },
        service
      )
    ).toThrow(AppError);
  });
});
