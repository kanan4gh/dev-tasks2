import { GlobalConfigService } from '../services/GlobalConfigService.js';
import { TaskManager } from '../services/TaskManager.js';
import { FileStorage } from '../storage/FileStorage.js';
import type { Task, TaskFilter } from '../types/index.js';

export interface TaskGroup {
  header: string;
  tasks: Task[];
  projectId: number;
}

export class ListTasksUseCase {
  private readonly configService: GlobalConfigService;

  constructor(configService?: GlobalConfigService) {
    this.configService = configService ?? new GlobalConfigService();
  }

  listSingle(filter?: TaskFilter): {
    tasks: Task[];
    header: string;
    activeProject: string | null;
  } {
    const activeProject = this.configService.getActiveProject();
    const filePath = this.configService.getTaskFilePath(activeProject);
    const tasks = new TaskManager(new FileStorage(filePath)).listTasks(filter);
    const header =
      activeProject === null ? '[Inbox]' : `[Project: ${activeProject}]`;
    return { tasks, header, activeProject };
  }

  listAll(filter?: TaskFilter): {
    groups: TaskGroup[];
    activeProject: string | null;
  } {
    const activeProject = this.configService.getActiveProject();
    const entries = this.configService.listProjectEntries();
    const groups: TaskGroup[] = [];

    for (const entry of entries) {
      const filePath = this.configService.getTaskFilePath(entry.name);
      const tasks = new TaskManager(new FileStorage(filePath)).listTasks(
        filter
      );
      if (tasks.length > 0) {
        groups.push({
          header: `[Project: ${entry.name}]`,
          tasks,
          projectId: entry.id,
        });
      }
    }

    const inboxPath = this.configService.getInboxTaskFilePath();
    const inboxTasks = new TaskManager(new FileStorage(inboxPath)).listTasks(
      filter
    );
    if (inboxTasks.length > 0) {
      groups.push({ header: '[Inbox]', tasks: inboxTasks, projectId: 0 });
    }

    return { groups, activeProject };
  }

  listInbox(filter?: TaskFilter): { tasks: Task[]; header: string } {
    const filePath = this.configService.getInboxTaskFilePath();
    const tasks = new TaskManager(new FileStorage(filePath)).listTasks(filter);
    return { tasks, header: '[Inbox]' };
  }
}
