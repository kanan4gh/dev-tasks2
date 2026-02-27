import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { TaskManager } from '../../services/TaskManager.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { AppError } from '../../types/index.js';
import { resolveTaskFilePath, parseId } from '../helpers.js';

export function registerShowCommand(program: Command): void {
  program
    .command('show <id>')
    .description('タスクの詳細を表示する')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const id = parseId(idStr);
        const filePath = resolveTaskFilePath();
        const storage = new FileStorage(filePath);
        const manager = new TaskManager(storage);
        const task = manager.getTask(id);
        renderer.renderDetail(task);
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
