import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import type { TaskPriority } from '../../types/index.js';
import { parseTaskRef } from '../helpers.js';
import { TaskCrudUseCase } from '../../usecases/TaskCrudUseCase.js';

export function registerEditCommand(program: Command): void {
  program
    .command('edit <id>')
    .description('タスクを編集する')
    .option('-t, --title <text>', 'タイトルを変更する')
    .option('-d, --description <text>', '説明を変更する')
    .option('-p, --priority <high|medium|low>', '優先度を変更する')
    .option('--due <YYYY-MM-DD>', '期限を設定する')
    .option('--due-clear', '期限を削除する')
    .option('--scheduled <YYYY-MM-DD>', '解禁日を設定する')
    .option('--scheduled-clear', '解禁日を削除する')
    .action(
      (
        idStr: string,
        options: {
          title?: string;
          description?: string;
          priority?: string;
          due?: string;
          dueClear?: boolean;
          scheduled?: string;
          scheduledClear?: boolean;
        }
      ) => {
        const renderer = new Renderer();
        try {
          const hasAnyOption =
            options.title !== undefined ||
            options.description !== undefined ||
            options.priority !== undefined ||
            options.due !== undefined ||
            options.dueClear === true ||
            options.scheduled !== undefined ||
            options.scheduledClear === true;

          if (!hasAnyOption) {
            throw new AppError(
              '変更するフィールドを指定してください',
              'オプションが何も指定されていません',
              '--title / --description / --priority / --due / --due-clear / --scheduled / --scheduled-clear のいずれかを指定してください'
            );
          }

          const ref = parseTaskRef(idStr);
          const task = new TaskCrudUseCase().editTask(ref, {
            title: options.title,
            description: options.description,
            priority: options.priority as TaskPriority | undefined,
            dueDate: options.dueClear ? null : options.due,
            scheduledDate: options.scheduledClear ? null : options.scheduled,
          });

          renderer.renderSuccess(`タスク #${task.id} を更新しました`);
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
