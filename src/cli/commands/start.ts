import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef } from '../helpers.js';
import { TaskCrudUseCase } from '../../usecases/TaskCrudUseCase.js';

export function registerStartCommand(program: Command): void {
  program
    .command('start <id>')
    .description('タスクを開始する（in_progress に遷移）')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const ref = parseTaskRef(idStr);
        const { task, projectName } = new TaskCrudUseCase().startTask(ref);
        renderer.renderSuccess(`タスク #${task.id} を開始しました`);

        // Inbox モードの場合はプロジェクトへの移動を促す
        if (projectName === null) {
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
