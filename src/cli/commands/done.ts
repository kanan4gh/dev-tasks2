import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef, parseRoutineRef } from '../helpers.js';
import { TaskCrudUseCase } from '../../usecases/TaskCrudUseCase.js';
import { DailyStorage } from '../../storage/DailyStorage.js';
import { DailyManager } from '../../services/DailyManager.js';

export function registerDoneCommand(program: Command): void {
  program
    .command('done <id>')
    .description(
      'タスクまたはルーティーンを完了する（r<id> でルーティーン指定）'
    )
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const routineId = parseRoutineRef(idStr);
        if (routineId !== null) {
          const manager = new DailyManager(new DailyStorage());
          manager.markDone(routineId);
          renderer.renderSuccess(`ルーティーン r${routineId} を済にしました`);
          return;
        }
        const ref = parseTaskRef(idStr);
        const task = new TaskCrudUseCase().completeTask(ref);
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
