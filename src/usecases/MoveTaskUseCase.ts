import { GlobalConfigService } from '../services/GlobalConfigService.js';
import { TaskManager } from '../services/TaskManager.js';
import { FileStorage } from '../storage/FileStorage.js';
import { AppError } from '../types/index.js';
import type { Task } from '../types/index.js';
import type { TaskRef } from '../cli/helpers.js';

export class MoveTaskUseCase {
  private readonly configService: GlobalConfigService;

  constructor(configService?: GlobalConfigService) {
    this.configService = configService ?? new GlobalConfigService();
  }

  execute(
    ref: TaskRef,
    destination: string
  ): { movedTask: Task; localId: number; destLabel: string } {
    const { filePath: sourceFilePath, localId } = this._resolve(ref);

    let targetFilePath: string;
    let destLabel: string;

    if (destination === 'inbox') {
      targetFilePath = this.configService.getInboxTaskFilePath();
      destLabel = 'Inbox';
    } else {
      if (!this.configService.projectExists(destination)) {
        throw new AppError(
          `プロジェクト "${destination}" が見つかりません`,
          '指定された移動先プロジェクトは登録されていません',
          'task project create でプロジェクトを作成してください'
        );
      }
      targetFilePath = this.configService.getTaskFilePath(destination);
      destLabel = `プロジェクト "${destination}"`;
    }

    if (sourceFilePath === targetFilePath) {
      throw new AppError(
        '移動元と移動先が同じです',
        '同じプロジェクト内への移動はできません',
        '別のプロジェクト名を指定してください'
      );
    }

    const sourceStorage = new FileStorage(sourceFilePath);
    const targetStorage = new FileStorage(targetFilePath);
    const manager = new TaskManager(sourceStorage);
    const movedTask = manager.moveTask(localId, targetStorage);

    return { movedTask, localId, destLabel };
  }

  private _resolve(ref: TaskRef): { filePath: string; localId: number } {
    if (ref.type === 'local') {
      const activeProject = this.configService.getActiveProject();
      return {
        filePath: this.configService.getTaskFilePath(activeProject),
        localId: ref.taskId,
      };
    }
    if (ref.projectId === 0) {
      return {
        filePath: this.configService.getInboxTaskFilePath(),
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
      localId: ref.taskId,
    };
  }
}
