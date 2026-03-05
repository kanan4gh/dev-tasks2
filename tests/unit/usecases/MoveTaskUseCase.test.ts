import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoveTaskUseCase } from '../../../src/usecases/MoveTaskUseCase.js';
import { AppError } from '../../../src/types/index.js';
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
  activeProject: string | null = 'src-project'
): GlobalConfigService {
  return {
    getActiveProject: vi.fn(() => activeProject),
    getTaskFilePath: vi.fn(
      (name: string | null) => `/fake/${name ?? 'inbox'}/tasks.json`
    ),
    getInboxTaskFilePath: vi.fn(() => '/fake/inbox/tasks.json'),
    projectExists: vi.fn(() => true),
    getProjectById: vi.fn(() => ({ name: 'src-project', id: 1 })),
  } as unknown as GlobalConfigService;
}

describe('MoveTaskUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute()', () => {
    it('タスクをプロジェクトに移動して新 ID を返す', () => {
      const sourceTask = makeTask({ id: 1, title: '移動するタスク' });
      const sourceMock = makeMockStorage([sourceTask]);
      const targetMock = makeMockStorage([]);

      vi.mocked(FileStorage)
        .mockImplementationOnce(() => sourceMock) // source
        .mockImplementationOnce(() => targetMock); // target

      const configService = makeMockConfigService('src-project');
      const useCase = new MoveTaskUseCase(configService);

      const result = useCase.execute(
        { type: 'local', taskId: 1 },
        'dst-project'
      );

      expect(result.localId).toBe(1);
      expect(result.destLabel).toBe('プロジェクト "dst-project"');
      expect(result.movedTask.title).toBe('移動するタスク');
    });

    it('inbox に移動できる', () => {
      const sourceTask = makeTask({ id: 1 });
      const sourceMock = makeMockStorage([sourceTask]);
      const targetMock = makeMockStorage([]);

      vi.mocked(FileStorage)
        .mockImplementationOnce(() => sourceMock)
        .mockImplementationOnce(() => targetMock);

      const configService = makeMockConfigService('src-project');
      const useCase = new MoveTaskUseCase(configService);

      const result = useCase.execute({ type: 'local', taskId: 1 }, 'inbox');

      expect(result.destLabel).toBe('Inbox');
    });

    it('移動先が存在しない場合 AppError が throw される', () => {
      vi.mocked(FileStorage).mockImplementation(() => makeMockStorage([]));

      const configService = {
        ...makeMockConfigService(),
        projectExists: vi.fn(() => false),
        getTaskFilePath: vi.fn(() => '/fake/src/tasks.json'),
      } as unknown as GlobalConfigService;

      const useCase = new MoveTaskUseCase(configService);
      expect(() =>
        useCase.execute({ type: 'local', taskId: 1 }, 'non-existent')
      ).toThrow(AppError);
    });

    it('移動元と移動先が同じ場合 AppError が throw される', () => {
      vi.mocked(FileStorage).mockImplementation(() => makeMockStorage([]));

      const configService = {
        ...makeMockConfigService('same-project'),
        getTaskFilePath: vi.fn(() => '/fake/same/tasks.json'),
        getInboxTaskFilePath: vi.fn(() => '/fake/inbox/tasks.json'),
        projectExists: vi.fn(() => true),
      } as unknown as GlobalConfigService;

      const useCase = new MoveTaskUseCase(configService);
      expect(() =>
        useCase.execute({ type: 'local', taskId: 1 }, 'same-project')
      ).toThrow(AppError);
    });
  });
});
