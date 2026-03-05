import { GlobalConfigService } from '../services/GlobalConfigService.js';
import { TaskManager } from '../services/TaskManager.js';
import { FileStorage } from '../storage/FileStorage.js';
import { DailyStorage } from '../storage/DailyStorage.js';
import { DailyManager } from '../services/DailyManager.js';
import type { Task, TaskStatus } from '../types/index.js';
import type { RoutineListItem } from '../services/DailyManager.js';

export interface SuggestedTask {
  compositeId: string;
  status: TaskStatus;
  title: string;
  projectName: string;
}

export interface OnboardData {
  activeProject: string | null;
  pendingRoutineItems: RoutineListItem[];
  routineDoneCount: number;
  routineTotalCount: number;
  suggestedTasks: SuggestedTask[];
  allGroups: { header: string; tasks: Task[]; projectId?: number }[];
}

interface TaskGroup {
  tasks: Task[];
  projectName: string;
  projectId: number;
  isActive: boolean;
  isInbox: boolean;
}

export function buildSuggestedTasks(
  groups: TaskGroup[],
  maxCount = 3
): SuggestedTask[] {
  const filter = (status: TaskStatus) =>
    groups.flatMap((g) =>
      g.tasks
        .filter((t) => t.status === status)
        .map((t) => ({
          compositeId: `${g.projectId}-${t.id}`,
          status: t.status,
          title: t.title,
          projectName: g.projectName,
          isActive: g.isActive,
          isInbox: g.isInbox,
        }))
    );

  const activeInProgress = filter('in_progress').filter((t) => t.isActive);
  const activeOpen = filter('open').filter((t) => t.isActive);
  const inboxInProgress = filter('in_progress').filter((t) => t.isInbox);
  const inboxOpen = filter('open').filter((t) => t.isInbox);
  const otherInProgress = filter('in_progress').filter(
    (t) => !t.isActive && !t.isInbox
  );
  const otherOpen = filter('open').filter((t) => !t.isActive && !t.isInbox);

  const ordered = [
    ...activeInProgress,
    ...activeOpen,
    ...inboxInProgress,
    ...inboxOpen,
    ...otherInProgress,
    ...otherOpen,
  ];

  return ordered
    .slice(0, maxCount)
    .map(({ compositeId, status, title, projectName }) => ({
      compositeId,
      status,
      title,
      projectName,
    }));
}

export class OnboardUseCase {
  private readonly configService: GlobalConfigService;

  constructor(configService?: GlobalConfigService) {
    this.configService = configService ?? new GlobalConfigService();
  }

  execute(): OnboardData {
    const activeProject = this.configService.getActiveProject();
    const entries = this.configService.listProjectEntries();
    const statusFilter = { status: ['open', 'in_progress'] as TaskStatus[] };

    // 全プロジェクトのタスクを収集
    const taskGroups: TaskGroup[] = entries.map((entry) => {
      const filePath = this.configService.getTaskFilePath(entry.name);
      const tasks = new TaskManager(new FileStorage(filePath)).listTasks(
        statusFilter
      );
      return {
        tasks,
        projectName: entry.name,
        projectId: entry.id,
        isActive: entry.name === activeProject,
        isInbox: false,
      };
    });

    // Inbox のタスクを収集
    const inboxPath = this.configService.getInboxTaskFilePath();
    const inboxTasks = new TaskManager(new FileStorage(inboxPath)).listTasks(
      statusFilter
    );
    taskGroups.push({
      tasks: inboxTasks,
      projectName: 'Inbox',
      projectId: 0,
      isActive: activeProject === null,
      isInbox: true,
    });

    // 全タスクグループ（タスクがあるもののみ）
    const allGroups = taskGroups
      .filter((g) => g.tasks.length > 0)
      .map((g) => ({
        header: g.isInbox ? '[Inbox]' : `[Project: ${g.projectName}]`,
        tasks: g.tasks,
        projectId: g.projectId,
      }));

    // タスク提案
    const suggestedTasks = buildSuggestedTasks(taskGroups);

    // 毎日やること
    const dailyManager = new DailyManager(new DailyStorage());
    const allRoutineItems = dailyManager.listRoutines(false);
    const pendingRoutineItems = allRoutineItems.filter(
      (item) => item.status === 'pending'
    );
    const routineDoneCount = allRoutineItems.filter(
      (item) => item.status === 'done'
    ).length;
    const routineTotalCount = allRoutineItems.length;

    return {
      activeProject,
      pendingRoutineItems,
      routineDoneCount,
      routineTotalCount,
      suggestedTasks,
      allGroups,
    };
  }
}
