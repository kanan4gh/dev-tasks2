import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskCrudUseCase } from '../../../src/usecases/TaskCrudUseCase.js';
import { AppError } from '../../../src/types/index.js';
import type { Task, IStorage } from '../../../src/types/index.js';
import type { GlobalConfigService } from '../../../src/services/GlobalConfigService.js';

// FileStorage をモック化（ファイルシステムアクセスなし）
vi.mock('../../../src/storage/FileStorage.js', () => ({
  FileStorage: vi.fn(),
}));

import { FileStorage } from '../../../src/storage/FileStorage.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'テストタスク',
    description: '',
    status: 'open',
    priority: 'medium',
    branch: null,
    dueDate: null,
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-03-05T00:00:00Z',
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

function makeMockConfigService(
  activeProject: string | null = 'test-project'
): GlobalConfigService {
  return {
    getActiveProject: vi.fn(() => activeProject),
    getTaskFilePath: vi.fn(() => '/fake/tasks.json'),
    getInboxTaskFilePath: vi.fn(() => '/fake/inbox/tasks.json'),
    getProjectById: vi.fn(() => ({ name: 'test-project', id: 1 })),
    listProjects: vi.fn(() => ['test-project']),
    listProjectEntries: vi.fn(() => [{ name: 'test-project', id: 1 }]),
    projectExists: vi.fn(() => true),
  } as unknown as GlobalConfigService;
}

describe('TaskCrudUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addTask()', () => {
    it('タスクを作成して返す', () => {
      const mockStorage = makeMockStorage([]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService();

      const useCase = new TaskCrudUseCase(configService);
      const task = useCase.addTask('新しいタスク', { priority: 'high' });

      expect(task.title).toBe('新しいタスク');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('open');
    });

    it('priority 省略時は medium になる', () => {
      const mockStorage = makeMockStorage([]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService();

      const useCase = new TaskCrudUseCase(configService);
      const task = useCase.addTask('タスク', {});

      expect(task.priority).toBe('medium');
    });
  });

  describe('getTask()', () => {
    it('ローカル ref でタスクを取得する', () => {
      const existing = makeTask({ id: 1, title: '既存タスク' });
      const mockStorage = makeMockStorage([existing]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService();

      const useCase = new TaskCrudUseCase(configService);
      const { task, localId, projectName } = useCase.getTask({
        type: 'local',
        taskId: 1,
      });

      expect(task.title).toBe('既存タスク');
      expect(localId).toBe(1);
      expect(projectName).toBe('test-project');
    });

    it('複合 ref (inbox) でタスクを取得する', () => {
      const existing = makeTask({ id: 2, title: 'Inbox タスク' });
      const mockStorage = makeMockStorage([existing]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService(null);

      const useCase = new TaskCrudUseCase(configService);
      const { task, projectName } = useCase.getTask({
        type: 'composite',
        projectId: 0,
        taskId: 2,
      });

      expect(task.title).toBe('Inbox タスク');
      expect(projectName).toBeNull();
    });

    it('存在しないタスクIDで AppError が throw される', () => {
      const mockStorage = makeMockStorage([]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService();

      const useCase = new TaskCrudUseCase(configService);
      expect(() => useCase.getTask({ type: 'local', taskId: 999 })).toThrow(
        AppError
      );
    });
  });

  describe('startTask()', () => {
    it('タスクを in_progress に遷移して projectName を返す', () => {
      const existing = makeTask({ id: 1, status: 'open' });
      const mockStorage = makeMockStorage([existing]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService('my-project');

      const useCase = new TaskCrudUseCase(configService);
      const { task, projectName } = useCase.startTask({
        type: 'local',
        taskId: 1,
      });

      expect(task.status).toBe('in_progress');
      expect(projectName).toBe('my-project');
    });

    it('inbox モードの場合 projectName が null になる', () => {
      const existing = makeTask({ id: 1, status: 'open' });
      const mockStorage = makeMockStorage([existing]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService(null);

      const useCase = new TaskCrudUseCase(configService);
      const { projectName } = useCase.startTask({ type: 'local', taskId: 1 });

      expect(projectName).toBeNull();
    });
  });

  describe('completeTask()', () => {
    it('タスクを completed に遷移する', () => {
      const existing = makeTask({ id: 1, status: 'in_progress' });
      const mockStorage = makeMockStorage([existing]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService();

      const useCase = new TaskCrudUseCase(configService);
      const task = useCase.completeTask({ type: 'local', taskId: 1 });

      expect(task.status).toBe('completed');
    });
  });

  describe('deleteTask()', () => {
    it('タスクを削除する（void を返す）', () => {
      const existing = makeTask({ id: 1 });
      const mockStorage = makeMockStorage([existing]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService();

      const useCase = new TaskCrudUseCase(configService);
      expect(() =>
        useCase.deleteTask({ type: 'local', taskId: 1 })
      ).not.toThrow();
      expect(mockStorage.save).toHaveBeenCalledWith([]);
    });
  });

  describe('archiveTask()', () => {
    it('タスクを archived に遷移する', () => {
      const existing = makeTask({ id: 1, status: 'open' });
      const mockStorage = makeMockStorage([existing]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = makeMockConfigService();

      const useCase = new TaskCrudUseCase(configService);
      const task = useCase.archiveTask({ type: 'local', taskId: 1 });

      expect(task.status).toBe('archived');
    });
  });

  describe('_resolve() エラーケース', () => {
    it('存在しない projectId の複合 ref で AppError が throw される', () => {
      const mockStorage = makeMockStorage([]);
      vi.mocked(FileStorage).mockImplementation(() => mockStorage);
      const configService = {
        ...makeMockConfigService(),
        getProjectById: vi.fn(() => undefined),
      } as unknown as GlobalConfigService;

      const useCase = new TaskCrudUseCase(configService);
      expect(() =>
        useCase.getTask({ type: 'composite', projectId: 99, taskId: 1 })
      ).toThrow(AppError);
    });
  });
});
