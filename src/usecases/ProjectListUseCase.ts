import { GlobalConfigService } from '../services/GlobalConfigService.js';
import { TaskManager } from '../services/TaskManager.js';
import { FileStorage } from '../storage/FileStorage.js';

export class ProjectListUseCase {
  private readonly configService: GlobalConfigService;

  constructor(configService?: GlobalConfigService) {
    this.configService = configService ?? new GlobalConfigService();
  }

  execute(): {
    projects: string[];
    activeProject: string | null;
    taskCounts: Map<string, { total: number; inProgress: number }>;
    inboxCount: number;
  } {
    const projects = this.configService.listProjects();
    const activeProject = this.configService.getActiveProject();

    const taskCounts = new Map<string, { total: number; inProgress: number }>();
    for (const name of projects) {
      const filePath = this.configService.getTaskFilePath(name);
      const tasks = new TaskManager(new FileStorage(filePath)).listTasks();
      taskCounts.set(name, {
        total: tasks.length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      });
    }

    const inboxPath = this.configService.getInboxTaskFilePath();
    const inboxCount = new TaskManager(new FileStorage(inboxPath)).listTasks()
      .length;

    return { projects, activeProject, taskCounts, inboxCount };
  }
}
