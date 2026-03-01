import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { TaskManager } from '../../services/TaskManager.js';
import { GlobalConfigService } from '../../services/GlobalConfigService.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef, resolveTaskContext, confirm } from '../helpers.js';

export function registerDeleteCommand(program: Command): void {
  program
    .command('delete <id>')
    .description('タスクを削除する（確認プロンプト付き）')
    .action(async (idStr: string) => {
      const renderer = new Renderer();
      try {
        const ref = parseTaskRef(idStr);
        const configService = new GlobalConfigService();
        const { filePath, localId } = resolveTaskContext(ref, configService);
        const storage = new FileStorage(filePath);
        const manager = new TaskManager(storage);

        // 削除対象のタスクを取得してタイトルを確認プロンプトに表示
        const task = manager.getTask(localId);

        const confirmed = await confirm(
          `タスク #${task.id}「${task.title}」を削除しますか？ [y/N] `
        );

        if (!confirmed) {
          console.log('削除をキャンセルしました。');
          return;
        }

        manager.deleteTask(localId);
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
