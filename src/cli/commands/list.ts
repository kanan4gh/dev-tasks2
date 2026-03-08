import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import type { TaskFilter, TaskStatus } from '../../types/index.js';
import { ListTasksUseCase } from '../../usecases/ListTasksUseCase.js';

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
    .option('--all-status', '全ステータスのタスクを表示する')
    .option(
      '--scheduled',
      '解禁日付きタスク（まだ着手できないもの）のみ表示する'
    )
    .action(
      (options: {
        status?: string;
        inbox?: boolean;
        all?: boolean;
        allStatus?: boolean;
        scheduled?: boolean;
      }) => {
        const renderer = new Renderer();
        try {
          const filter: TaskFilter | undefined = options.scheduled
            ? {
                status: ['open', 'in_progress'] as TaskStatus[],
                onlyScheduled: true,
              }
            : options.allStatus
              ? undefined
              : options.status
                ? {
                    status: options.status as TaskStatus,
                    excludeScheduled: true,
                  }
                : {
                    status: ['open', 'in_progress'] as TaskStatus[],
                    excludeScheduled: true,
                  };

          const useCase = new ListTasksUseCase();

          if (options.all) {
            const { groups, activeProject } = useCase.listAll(filter);
            renderer.renderGroupedTable(groups, activeProject);
            return;
          }

          if (options.inbox) {
            const { tasks, header } = useCase.listInbox(filter);
            renderer.renderTable(tasks, header);
            return;
          }

          const { tasks, header } = useCase.listSingle(filter);
          renderer.renderTable(tasks, header);
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
