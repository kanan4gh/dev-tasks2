import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef } from '../helpers.js';
import { TaskCrudUseCase } from '../../usecases/TaskCrudUseCase.js';

export function registerArchiveCommand(program: Command): void {
  program
    .command('archive <id>')
    .description('タスクをアーカイブする（archived に遷移）')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const ref = parseTaskRef(idStr);
        const task = new TaskCrudUseCase().archiveTask(ref);
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
