import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { TaskManager } from '../../services/TaskManager.js';
import { GlobalConfigService } from '../../services/GlobalConfigService.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { AppError } from '../../types/index.js';
import { parseTaskRef, resolveTaskContext } from '../helpers.js';

export function registerMoveCommand(program: Command): void {
  program
    .command('move <id> <destination>')
    .description('タスクを別プロジェクト（または inbox）に移動する')
    .action((idStr: string, destination: string) => {
      const renderer = new Renderer();
      try {
        const ref = parseTaskRef(idStr);
        const configService = new GlobalConfigService();
        const { filePath: sourceFilePath, localId } = resolveTaskContext(
          ref,
          configService
        );

        let targetFilePath: string;
        if (destination === 'inbox') {
          targetFilePath = configService.getInboxTaskFilePath();
        } else {
          if (!configService.projectExists(destination)) {
            throw new AppError(
              `プロジェクト "${destination}" が見つかりません`,
              '指定された移動先プロジェクトは登録されていません',
              'task project create でプロジェクトを作成してください'
            );
          }
          targetFilePath = configService.getTaskFilePath(destination);
        }

        if (sourceFilePath === targetFilePath) {
          throw new AppError(
            '移動元と移動先が同じです',
            '同じプロジェクト内への移動はできません',
            '別のプロジェクト名を指定してください'
          );
        }

        const sourceStorage = new FileStorage(sourceFilePath);
        const targetStorage = new FileStorage(targetFilePath);
        const manager = new TaskManager(sourceStorage);

        const movedTask = manager.moveTask(localId, targetStorage);
        const destLabel =
          destination === 'inbox' ? 'Inbox' : `プロジェクト "${destination}"`;
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
