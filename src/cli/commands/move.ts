import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef } from '../helpers.js';
import { MoveTaskUseCase } from '../../usecases/MoveTaskUseCase.js';

export function registerMoveCommand(program: Command): void {
  program
    .command('move <id> <destination>')
    .description('タスクを別プロジェクト（または inbox）に移動する')
    .action((idStr: string, destination: string) => {
      const renderer = new Renderer();
      try {
        const ref = parseTaskRef(idStr);
        const { movedTask, localId, destLabel } = new MoveTaskUseCase().execute(
          ref,
          destination
        );
        renderer.renderSuccess(
          `タスク #${localId} を ${destLabel} に移動しました（新 ID: ${movedTask.id}）`
        );
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
