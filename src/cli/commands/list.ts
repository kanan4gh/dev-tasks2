import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { TaskManager } from '../../services/TaskManager.js';
import { GlobalConfigService } from '../../services/GlobalConfigService.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { AppError } from '../../types/index.js';
import type { Task, TaskStatus } from '../../types/index.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('タスク一覧を表示する')
    .option(
      '-s, --status <status>',
      'ステータスで絞り込む (open|in_progress|completed|archived)'
    )
    .option('--inbox', 'Inbox のタスクを表示する')
    .option('--all', '全プロジェクトのタスクを表示する')
    .action((options: { status?: string; inbox?: boolean; all?: boolean }) => {
      const renderer = new Renderer();
      try {
        const configService = new GlobalConfigService();
        const filter = options.status
          ? { status: options.status as TaskStatus }
          : undefined;

        if (options.all) {
          // --all: 全プロジェクト + Inbox を横断表示
          const projects = configService.listProjects();
          const groups: { header: string; tasks: Task[] }[] = [];

          for (const name of projects) {
            const filePath = configService.getTaskFilePath(name);
            const tasks = new TaskManager(new FileStorage(filePath)).listTasks(
              filter
            );
            if (tasks.length > 0) {
              groups.push({ header: `[Project: ${name}]`, tasks });
            }
          }

          const inboxPath = configService.getInboxTaskFilePath();
          const inboxTasks = new TaskManager(
            new FileStorage(inboxPath)
          ).listTasks(filter);
          if (inboxTasks.length > 0) {
            groups.push({ header: '[Inbox]', tasks: inboxTasks });
          }

          renderer.renderGroupedTable(groups);
          return;
        }

        // 単一プロジェクト / Inbox 表示（既存の動作）
        let activeProject: string | null;
        let filePath: string;

        if (options.inbox) {
          activeProject = null;
          filePath = configService.getInboxTaskFilePath();
        } else {
          activeProject = configService.getActiveProject();
          filePath = configService.getTaskFilePath(activeProject);
        }

        const storage = new FileStorage(filePath);
        const manager = new TaskManager(storage);
        const tasks = manager.listTasks(filter);
        const header =
          activeProject === null ? '[Inbox]' : `[Project: ${activeProject}]`;

        renderer.renderTable(tasks, header);
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
