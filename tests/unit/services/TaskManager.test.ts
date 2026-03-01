import { describe, it, expect, vi } from 'vitest';
import { TaskManager } from '../../../src/services/TaskManager.js';
import { AppError } from '../../../src/types/index.js';
import type { IStorage, Task } from '../../../src/types/index.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Test task',
    description: '',
    status: 'open',
    priority: 'medium',
    branch: null,
    dueDate: null,
    createdAt: '2026-02-27T00:00:00Z',
    updatedAt: '2026-02-27T00:00:00Z',
    ...overrides,
  };
}

function makeMockStorage(tasks: Task[] = []): IStorage {
  const store = [...tasks];
  return {
    load: vi.fn(() => [...store]),
    save: vi.fn((newTasks: Task[]) => {
      store.length = 0;
      store.push(...newTasks);
    }),
    ensureDirectory: vi.fn(),
  };
}

describe('TaskManager', () => {
  describe('createTask()', () => {
    it('タスクを作成して ID=1 を返す', () => {
      const storage = makeMockStorage([]);
      const manager = new TaskManager(storage);
      const task = manager.createTask({ title: 'New task' });
      expect(task.id).toBe(1);
      expect(task.title).toBe('New task');
      expect(task.status).toBe('open');
      expect(task.priority).toBe('medium');
    });

    it('既存タスクがある場合、次の ID を採番する', () => {
      const storage = makeMockStorage([makeTask({ id: 5 })]);
      const manager = new TaskManager(storage);
      const task = manager.createTask({ title: 'Another task' });
      expect(task.id).toBe(6);
    });

    it('タイトルが空の場合 AppError をスローする', () => {
      const storage = makeMockStorage([]);
      const manager = new TaskManager(storage);
      expect(() => manager.createTask({ title: '' })).toThrow(AppError);
    });

    it('タイトルが 201 文字以上の場合 AppError をスローする', () => {
      const storage = makeMockStorage([]);
      const manager = new TaskManager(storage);
      expect(() => manager.createTask({ title: 'a'.repeat(201) })).toThrow(
        AppError
      );
    });

    it('不正な dueDate フォーマットで AppError をスローする', () => {
      const storage = makeMockStorage([]);
      const manager = new TaskManager(storage);
      expect(() =>
        manager.createTask({ title: 'Task', dueDate: '2026/03/01' })
      ).toThrow(AppError);
    });
  });

  describe('getTask()', () => {
    it('存在するタスクを返す', () => {
      const storage = makeMockStorage([makeTask({ id: 1, title: 'Found' })]);
      const manager = new TaskManager(storage);
      expect(manager.getTask(1).title).toBe('Found');
    });

    it('存在しない ID で AppError をスローする', () => {
      const storage = makeMockStorage([]);
      const manager = new TaskManager(storage);
      expect(() => manager.getTask(99)).toThrow(AppError);
    });
  });

  describe('startTask()', () => {
    it('open のタスクを in_progress に遷移できる', () => {
      const storage = makeMockStorage([makeTask({ id: 1, status: 'open' })]);
      const manager = new TaskManager(storage);
      const result = manager.startTask(1);
      expect(result.status).toBe('in_progress');
    });

    it('completed のタスクは開始できない', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'completed' }),
      ]);
      const manager = new TaskManager(storage);
      expect(() => manager.startTask(1)).toThrow(AppError);
    });

    it('archived のタスクは開始できない', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'archived' }),
      ]);
      const manager = new TaskManager(storage);
      expect(() => manager.startTask(1)).toThrow(AppError);
    });
  });

  describe('completeTask()', () => {
    it('in_progress のタスクを completed に遷移できる', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'in_progress' }),
      ]);
      const manager = new TaskManager(storage);
      expect(manager.completeTask(1).status).toBe('completed');
    });

    it('open のタスクを直接 completed に遷移できる', () => {
      const storage = makeMockStorage([makeTask({ id: 1, status: 'open' })]);
      const manager = new TaskManager(storage);
      expect(manager.completeTask(1).status).toBe('completed');
    });

    it('archived のタスクは完了できない', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'archived' }),
      ]);
      const manager = new TaskManager(storage);
      expect(() => manager.completeTask(1)).toThrow(AppError);
    });
  });

  describe('archiveTask()', () => {
    it('open のタスクをアーカイブできる', () => {
      const storage = makeMockStorage([makeTask({ id: 1, status: 'open' })]);
      const manager = new TaskManager(storage);
      expect(manager.archiveTask(1).status).toBe('archived');
    });

    it('completed のタスクをアーカイブできる', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'completed' }),
      ]);
      const manager = new TaskManager(storage);
      expect(manager.archiveTask(1).status).toBe('archived');
    });

    it('in_progress のタスクは直接アーカイブできない', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'in_progress' }),
      ]);
      const manager = new TaskManager(storage);
      expect(() => manager.archiveTask(1)).toThrow(AppError);
    });
  });

  describe('deleteTask()', () => {
    it('タスクを削除できる', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1 }),
        makeTask({ id: 2, title: 'Keep' }),
      ]);
      const manager = new TaskManager(storage);
      manager.deleteTask(1);
      expect(() => manager.getTask(1)).toThrow(AppError);
    });

    it('存在しない ID で AppError をスローする', () => {
      const storage = makeMockStorage([]);
      const manager = new TaskManager(storage);
      expect(() => manager.deleteTask(99)).toThrow(AppError);
    });
  });

  describe('listTasks()', () => {
    it('全タスクを ID 昇順で返す', () => {
      const storage = makeMockStorage([
        makeTask({ id: 3 }),
        makeTask({ id: 1 }),
        makeTask({ id: 2 }),
      ]);
      const manager = new TaskManager(storage);
      const tasks = manager.listTasks();
      expect(tasks.map((t) => t.id)).toEqual([1, 2, 3]);
    });

    it('単一ステータスでフィルタリングできる', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'open' }),
        makeTask({ id: 2, status: 'in_progress' }),
        makeTask({ id: 3, status: 'completed' }),
      ]);
      const manager = new TaskManager(storage);
      const result = manager.listTasks({ status: 'in_progress' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('配列ステータスでフィルタリングできる（open + in_progress）', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'open' }),
        makeTask({ id: 2, status: 'in_progress' }),
        makeTask({ id: 3, status: 'completed' }),
        makeTask({ id: 4, status: 'archived' }),
      ]);
      const manager = new TaskManager(storage);
      const result = manager.listTasks({ status: ['open', 'in_progress'] });
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });

    it('フィルタなしで全件返す', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, status: 'open' }),
        makeTask({ id: 2, status: 'completed' }),
        makeTask({ id: 3, status: 'archived' }),
      ]);
      const manager = new TaskManager(storage);
      expect(manager.listTasks()).toHaveLength(3);
    });
  });

  describe('searchTasks()', () => {
    it('タイトルで部分一致検索できる', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, title: 'ユーザー認証' }),
        makeTask({ id: 2, title: 'データベース設計' }),
      ]);
      const manager = new TaskManager(storage);
      expect(manager.searchTasks('認証')).toHaveLength(1);
    });

    it('大文字小文字を区別しない', () => {
      const storage = makeMockStorage([
        makeTask({ id: 1, title: 'Auth Feature' }),
      ]);
      const manager = new TaskManager(storage);
      expect(manager.searchTasks('auth')).toHaveLength(1);
    });
  });
});
