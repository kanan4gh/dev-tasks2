import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { TaskManager } from '../../services/TaskManager.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { AppError } from '../../types/index.js';
import { resolveTaskFilePath, parseId } from '../helpers.js';

export function registerArchiveCommand(program: Command): void {
  program
    .command('archive <id>')
    .description('タスクをアーカイブする（archived に遷移）')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const id = parseId(idStr);
        const filePath = resolveTaskFilePath();
        const storage = new FileStorage(filePath);
        const manager = new TaskManager(storage);

        const task = manager.archiveTask(id);
        renderer.renderSuccess(`タスク #${task.id} をアーカイブしました`);
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
