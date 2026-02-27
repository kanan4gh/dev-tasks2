import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { GlobalConfigService } from '../../services/GlobalConfigService.js';
import { AppError } from '../../types/index.js';

export function registerInboxCommand(program: Command): void {
  program
    .command('inbox')
    .description('アクティブプロジェクトを解除し Inbox モードに切り替える')
    .action(() => {
      const renderer = new Renderer();
      try {
        const configService = new GlobalConfigService();
        const currentProject = configService.getActiveProject();

        configService.setActiveProject(null);

        if (currentProject !== null) {
          renderer.renderSuccess(
            `プロジェクト "${currentProject}" から Inbox モードに切り替えました`
          );
        } else {
          renderer.renderInfo('すでに Inbox モードです。');
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
