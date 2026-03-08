import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef } from '../helpers.js';
import { TaskCrudUseCase } from '../../usecases/TaskCrudUseCase.js';

export function registerScheduleCommand(program: Command): void {
  program
    .command('schedule <id> [date]')
    .description(
      '解禁日を設定する (YYYY-MM-DD)。--clear で解禁日を削除する。解禁日以降に task start できる'
    )
    .option('--clear', '解禁日を削除する')
    .action(
      (
        idStr: string,
        date: string | undefined,
        options: { clear?: boolean }
      ) => {
        const renderer = new Renderer();
        try {
          const ref = parseTaskRef(idStr);
          const useCase = new TaskCrudUseCase();

          if (options.clear) {
            const task = useCase.setScheduledDate(ref, null);
            renderer.renderSuccess(`タスク #${task.id} の解禁日を削除しました`);
            return;
          }

          if (!date) {
            throw new AppError(
              '解禁日を指定してください',
              '日付が指定されていません',
              'task schedule <id> <YYYY-MM-DD>  または  task schedule <id> --clear'
            );
          }

          const task = useCase.setScheduledDate(ref, date);
          renderer.renderSuccess(
            `タスク #${task.id} の解禁日を ${date} に設定しました`
          );
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
