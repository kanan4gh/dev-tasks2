import { GlobalConfigService } from '../services/GlobalConfigService.js';
import { TaskManager } from '../services/TaskManager.js';
import { FileStorage } from '../storage/FileStorage.js';
import { AppError } from '../types/index.js';
import type { Task, TaskPriority } from '../types/index.js';
import type { TaskRef } from '../cli/helpers.js';

export class TaskCrudUseCase {
  private readonly configService: GlobalConfigService;

  constructor(configService?: GlobalConfigService) {
    this.configService = configService ?? new GlobalConfigService();
  }

  addTask(
    title: string,
    options: { description?: string; priority?: TaskPriority }
  ): Task {
    const activeProject = this.configService.getActiveProject();
    const filePath = this.configService.getTaskFilePath(activeProject);
    const manager = new TaskManager(new FileStorage(filePath));
    return manager.createTask({
      title,
      description: options.description,
      priority: options.priority ?? 'medium',
    });
  }

  getTask(ref: TaskRef): {
    task: Task;
    localId: number;
    projectName: string | null;
  } {
    const { filePath, localId, projectName } = this._resolve(ref);
    const task = new TaskManager(new FileStorage(filePath)).getTask(localId);
    return { task, localId, projectName };
  }

  startTask(ref: TaskRef): { task: Task; projectName: string | null } {
    const { filePath, localId, projectName } = this._resolve(ref);
    const task = new TaskManager(new FileStorage(filePath)).startTask(localId);
    return { task, projectName };
  }

  completeTask(ref: TaskRef): Task {
    const { filePath, localId } = this._resolve(ref);
    return new TaskManager(new FileStorage(filePath)).completeTask(localId);
  }

  deleteTask(ref: TaskRef): void {
    const { filePath, localId } = this._resolve(ref);
    new TaskManager(new FileStorage(filePath)).deleteTask(localId);
  }

  archiveTask(ref: TaskRef): Task {
    const { filePath, localId } = this._resolve(ref);
    return new TaskManager(new FileStorage(filePath)).archiveTask(localId);
  }

  private _resolve(ref: TaskRef): {
    filePath: string;
    projectName: string | null;
    localId: number;
  } {
    if (ref.type === 'local') {
      const activeProject = this.configService.getActiveProject();
      return {
        filePath: this.configService.getTaskFilePath(activeProject),
        projectName: activeProject,
        localId: ref.taskId,
      };
    }
    if (ref.projectId === 0) {
      return {
        filePath: this.configService.getInboxTaskFilePath(),
        projectName: null,
        localId: ref.taskId,
      };
    }
    const entry = this.configService.getProjectById(ref.projectId);
    if (!entry) {
      throw new AppError(
        `プロジェクト ID "${ref.projectId}" が見つかりません`,
        '指定されたプロジェクト ID は存在しません',
        'task project list でプロジェクト一覧を確認してください'
      );
    }
    return {
      filePath: this.configService.getTaskFilePath(entry.name),
      projectName: entry.name,
      localId: ref.taskId,
    };
  }
}
