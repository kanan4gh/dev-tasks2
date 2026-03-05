import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import type { TaskPriority } from '../../types/index.js';
import { TaskCrudUseCase } from '../../usecases/TaskCrudUseCase.js';

export function registerAddCommand(program: Command): void {
  program
    .command('add <title>')
    .description('タスクを作成する')
    .option('-d, --description <text>', 'タスクの説明')
    .action(
      (title: string, options: { description?: string; priority?: string }) => {
        const renderer = new Renderer();
        try {
          const task = new TaskCrudUseCase().addTask(title, {
            description: options.description,
            priority: options.priority as TaskPriority | undefined,
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
