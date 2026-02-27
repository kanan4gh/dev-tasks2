import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { TaskManager } from '../../services/TaskManager.js';
import { GlobalConfigService } from '../../services/GlobalConfigService.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { AppError } from '../../types/index.js';
import { parseId } from '../helpers.js';

export function registerStartCommand(program: Command): void {
  program
    .command('start <id>')
    .description('タスクを開始する（in_progress に遷移）')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const id = parseId(idStr);
        const configService = new GlobalConfigService();
        const activeProject = configService.getActiveProject();
        const filePath = configService.getTaskFilePath(activeProject);
        const storage = new FileStorage(filePath);
        const manager = new TaskManager(storage);

        const task = manager.startTask(id);
        renderer.renderSuccess(`タスク #${task.id} を開始しました`);

        // Inbox モードの場合はプロジェクトへの移動を促す
        if (activeProject === null) {
          renderer.renderInfo(
            `タスク #${task.id} を開始しました。プロジェクトに関連付けるには task move ${task.id} <project-name> を実行してください。`
          );
        }
      } catch (error) {
        if (error instanceof AppError) {
          renderer.renderError(error);
        } else {
          console.error(error);
        }
        process.exit(1);
      }
    });
}
