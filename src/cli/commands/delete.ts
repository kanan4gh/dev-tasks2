import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef, confirm } from '../helpers.js';
import { TaskCrudUseCase } from '../../usecases/TaskCrudUseCase.js';

export function registerDeleteCommand(program: Command): void {
  program
    .command('delete <id>')
    .description('タスクを削除する（確認プロンプト付き）')
    .action(async (idStr: string) => {
      const renderer = new Renderer();
      try {
        const ref = parseTaskRef(idStr);
        const useCase = new TaskCrudUseCase();

        // 削除対象のタスクを取得してタイトルを確認プロンプトに表示
        const { task, localId } = useCase.getTask(ref);

        const confirmed = await confirm(
          `タスク #${task.id}「${task.title}」を削除しますか？ [y/N] `
        );

        if (!confirmed) {
          console.log('削除をキャンセルしました。');
          return;
        }

        useCase.deleteTask(ref);
        renderer.renderSuccess(`タスク #${localId} を削除しました`);
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
