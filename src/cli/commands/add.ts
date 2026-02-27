import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { TaskManager } from '../../services/TaskManager.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { AppError } from '../../types/index.js';
import type { TaskPriority } from '../../types/index.js';
import { resolveTaskFilePath } from '../helpers.js';

export function registerAddCommand(program: Command): void {
  program
    .command('add <title>')
    .description('タスクを作成する')
    .option('-d, --description <text>', 'タスクの説明')
    .action(
      (title: string, options: { description?: string; priority?: string }) => {
        const renderer = new Renderer();
        try {
          const filePath = resolveTaskFilePath();
          const storage = new FileStorage(filePath);
          const manager = new TaskManager(storage);

          const task = manager.createTask({
            title,
            description: options.description,
            priority: (options.priority as TaskPriority) ?? 'medium',
          });

          renderer.renderSuccess(`タスクを作成しました (ID: ${task.id})`);
        } catch (error) {
          if (error instanceof AppError) {
            renderer.renderError(error);
          } else {
            console.error(error);
          }
          process.exit(1);
        }
      }
    );
}
