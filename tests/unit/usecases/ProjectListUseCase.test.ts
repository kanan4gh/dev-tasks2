import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectListUseCase } from '../../../src/usecases/ProjectListUseCase.js';
import type { Task, IStorage } from '../../../src/types/index.js';
import type { GlobalConfigService } from '../../../src/services/GlobalConfigService.js';

vi.mock('../../../src/storage/FileStorage.js', () => ({
  FileStorage: vi.fn(),
}));

import { FileStorage } from '../../../src/storage/FileStorage.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'タスク',
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
  return {
    load: vi.fn(() => [...tasks]),
    save: vi.fn(),
    ensureDirectory: vi.fn(),
  };
}

function makeMockConfigService(
  projects = ['proj-a', 'proj-b'],
  activeProject: string | null = 'proj-a'
): GlobalConfigService {
  return {
    getActiveProject: vi.fn(() => activeProject),
    listProjects: vi.fn(() => projects),
    getTaskFilePath: vi.fn((name: string) => `/fake/${name}/tasks.json`),
    getInboxTaskFilePath: vi.fn(() => '/fake/inbox/tasks.json'),
  } as unknown as GlobalConfigService;
}

describe('ProjectListUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute()', () => {
    it('プロジェクト一覧とタスク数を返す', () => {
      // proj-a: 2タスク(1件 in_progress), proj-b: 0タスク, inbox: 1タスク
      vi.mocked(FileStorage)
        .mockImplementationOnce(() =>
          makeMockStorage([
            makeTask({ id: 1, status: 'open' }),
            makeTask({ id: 2, status: 'in_progress' }),
          ])
        )
        .mockImplementationOnce(() => makeMockStorage([]))
        .mockImplementationOnce(() => makeMockStorage([makeTask({ id: 3 })]));

      const configService = makeMockConfigService(['proj-a', 'proj-b']);
      const useCase = new ProjectListUseCase(configService);
      const result = useCase.execute();

      expect(result.projects).toEqual(['proj-a', 'proj-b']);
      expect(result.activeProject).toBe('proj-a');
      expect(result.taskCounts.get('proj-a')).toEqual({
        total: 2,
        inProgress: 1,
      });
      expect(result.taskCounts.get('proj-b')).toEqual({
        total: 0,
        inProgress: 0,
      });
      expect(result.inboxCount).toBe(1);
    });

    it('プロジェクトが 0 件の場合は空の Map を返す', () => {
      vi.mocked(FileStorage).mockImplementation(() => makeMockStorage([]));

      const configService = makeMockConfigService([], null);
      const useCase = new ProjectListUseCase(configService);
      const result = useCase.execute();

      expect(result.projects).toHaveLength(0);
      expect(result.taskCounts.size).toBe(0);
      expect(result.inboxCount).toBe(0);
    });
  });
});
