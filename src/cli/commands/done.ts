import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { TaskManager } from '../../services/TaskManager.js';
import { GlobalConfigService } from '../../services/GlobalConfigService.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef, resolveTaskContext } from '../helpers.js';

export function registerDoneCommand(program: Command): void {
  program
    .command('done <id>')
    .description('タスクを完了する（completed に遷移）')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const ref = parseTaskRef(idStr);
        const configService = new GlobalConfigService();
        const { filePath, localId } = resolveTaskContext(ref, configService);
        const storage = new FileStorage(filePath);
        const manager = new TaskManager(storage);

        const task = manager.completeTask(localId);
        renderer.renderSuccess(`タスク #${task.id} を完了しました`);
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
