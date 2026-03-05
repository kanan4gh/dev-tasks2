import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListTasksUseCase } from '../../../src/usecases/ListTasksUseCase.js';
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
  activeProject: string | null = 'my-project',
  entries = [{ name: 'my-project', id: 1 }]
): GlobalConfigService {
  return {
    getActiveProject: vi.fn(() => activeProject),
    getTaskFilePath: vi.fn((name: string | null) =>
      name ? `/fake/${name}/tasks.json` : '/fake/inbox/tasks.json'
    ),
    getInboxTaskFilePath: vi.fn(() => '/fake/inbox/tasks.json'),
    listProjectEntries: vi.fn(() => entries),
    listProjects: vi.fn(() => entries.map((e) => e.name)),
  } as unknown as GlobalConfigService;
}

describe('ListTasksUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSingle()', () => {
    it('アクティブプロジェクトのタスクを返す', () => {
      const tasks = [makeTask({ id: 1, title: 'タスク1' })];
      vi.mocked(FileStorage).mockImplementation(() => makeMockStorage(tasks));
      const configService = makeMockConfigService('my-project');

      const useCase = new ListTasksUseCase(configService);
      const result = useCase.listSingle();

      expect(result.tasks).toHaveLength(1);
      expect(result.header).toBe('[Project: my-project]');
      expect(result.activeProject).toBe('my-project');
    });

    it('Inbox モード（activeProject=null）の場合 header が [Inbox] になる', () => {
      vi.mocked(FileStorage).mockImplementation(() => makeMockStorage([]));
      const configService = makeMockConfigService(null, []);

      const useCase = new ListTasksUseCase(configService);
      const result = useCase.listSingle();

      expect(result.header).toBe('[Inbox]');
      expect(result.activeProject).toBeNull();
    });

    it('filter を渡すとフィルタリングされる', () => {
      const tasks = [
        makeTask({ id: 1, status: 'open' }),
        makeTask({ id: 2, status: 'completed' }),
      ];
      vi.mocked(FileStorage).mockImplementation(() => makeMockStorage(tasks));
      const configService = makeMockConfigService();

      const useCase = new ListTasksUseCase(configService);
      const result = useCase.listSingle({ status: 'open' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].status).toBe('open');
    });
  });

  describe('listAll()', () => {
    it('複数プロジェクトとInboxのタスクをグループ化して返す', () => {
      const projectTasks = [makeTask({ id: 1 })];
      const inboxTasks = [makeTask({ id: 2 })];

      // FileStorage のモックを呼び出し順で切り替え
      vi.mocked(FileStorage)
        .mockImplementationOnce(() => makeMockStorage(projectTasks)) // project
        .mockImplementationOnce(() => makeMockStorage(inboxTasks)); // inbox

      const configService = makeMockConfigService('my-project', [
        { name: 'my-project', id: 1 },
      ]);

      const useCase = new ListTasksUseCase(configService);
      const { groups, activeProject } = useCase.listAll();

      expect(groups).toHaveLength(2);
      expect(groups[0].header).toBe('[Project: my-project]');
      expect(groups[1].header).toBe('[Inbox]');
      expect(activeProject).toBe('my-project');
    });

    it('タスクが 0 件のプロジェクトは groups に含まれない', () => {
      vi.mocked(FileStorage)
        .mockImplementationOnce(() => makeMockStorage([])) // empty project
        .mockImplementationOnce(() => makeMockStorage([])); // empty inbox

      const configService = makeMockConfigService('my-project');
      const useCase = new ListTasksUseCase(configService);
      const { groups } = useCase.listAll();

      expect(groups).toHaveLength(0);
    });
  });

  describe('listInbox()', () => {
    it('Inbox のタスクを返す', () => {
      const tasks = [makeTask({ id: 1 })];
      vi.mocked(FileStorage).mockImplementation(() => makeMockStorage(tasks));
      const configService = makeMockConfigService(null, []);

      const useCase = new ListTasksUseCase(configService);
      const { tasks: result, header } = useCase.listInbox();

      expect(result).toHaveLength(1);
      expect(header).toBe('[Inbox]');
    });
  });
});
