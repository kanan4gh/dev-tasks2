import chalk from 'chalk';
import Table from 'cli-table3';
import { AppError } from '../types/index.js';
import type { Task, TaskStatus } from '../types/index.js';

const MAX_TITLE_LENGTH = 40;
const MAX_BRANCH_LENGTH = 30;

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

function colorStatus(status: TaskStatus): string {
  switch (status) {
    case 'open':
      return chalk.white(status);
    case 'in_progress':
      return chalk.yellow(status);
    case 'completed':
      return chalk.green(status);
    case 'archived':
      return chalk.gray(status);
  }
}

export class Renderer {
  renderTable(tasks: Task[], header: string, projectId?: number): void {
    console.log(chalk.bold(header));

    if (tasks.length === 0) {
      console.log(chalk.gray('タスクがありません。'));
      return;
    }

    const table = new Table({
      head: [
        chalk.bold('ID'),
        chalk.bold('Status'),
        chalk.bold('Title'),
        chalk.bold('Branch'),
        chalk.bold('Created'),
      ],
      colAligns: ['right', 'left', 'left', 'left', 'left'],
      style: { head: [], border: [] },
    });

    for (const task of tasks) {
      const idStr =
        projectId !== undefined ? `${projectId}-${task.id}` : String(task.id);
      table.push([
        idStr,
        colorStatus(task.status),
        truncate(task.title, MAX_TITLE_LENGTH),
        task.branch
          ? truncate(task.branch, MAX_BRANCH_LENGTH)
          : chalk.gray('-'),
        task.createdAt.slice(0, 10),
      ]);
    }

    console.log(table.toString());
  }

  renderDetail(task: Task): void {
    console.log(chalk.bold(`タスク #${task.id}`));
    console.log(`  タイトル    : ${task.title}`);
    console.log(`  説明        : ${task.description || chalk.gray('(なし)')}`);
    console.log(`  ステータス  : ${colorStatus(task.status)}`);
    console.log(`  優先度      : ${task.priority}`);
    console.log(`  ブランチ    : ${task.branch ?? chalk.gray('-')}`);
    console.log(`  期限        : ${task.dueDate ?? chalk.gray('-')}`);
    console.log(`  作成日時    : ${task.createdAt}`);
    console.log(`  更新日時    : ${task.updatedAt}`);
  }

  renderSuccess(message: string): void {
    console.log(chalk.green(`✓ ${message}`));
  }

  renderInfo(message: string): void {
    console.log(chalk.cyan(`[Info] ${message}`));
  }

  renderWarning(message: string): void {
    console.log(chalk.yellow(`[Warning] ${message}`));
  }

  renderError(error: AppError): void {
    console.error(chalk.red(`[Error] ${error.message}`));
    console.error(`  原因: ${error.cause}`);
    console.error(`  対処: ${error.remedy}`);
  }

  renderGroupedTable(
    groups: { header: string; tasks: Task[]; projectId?: number }[],
    activeProject: string | null = null
  ): void {
    if (groups.length === 0) {
      console.log(chalk.gray('タスクがありません。'));
      return;
    }
    for (const group of groups) {
      const isActive =
        activeProject !== null
          ? group.header === `[Project: ${activeProject}]`
          : group.header === '[Inbox]';
      const displayHeader = isActive
        ? chalk.green(chalk.bold(group.header))
        : group.header;
      this.renderTable(group.tasks, displayHeader, group.projectId);
      console.log();
    }
  }

  renderProjectList(
    projects: string[],
    activeProject: string | null,
    taskCounts: Map<string, { total: number; inProgress: number }>,
    inboxCount: number
  ): void {
    if (projects.length === 0 && inboxCount === 0) {
      console.log(chalk.gray('プロジェクトがありません。'));
      console.log(
        chalk.gray(
          '  task project create <name> でプロジェクトを作成してください。'
        )
      );
      return;
    }

    for (const name of projects) {
      const isActive = name === activeProject;
      const counts = taskCounts.get(name) ?? { total: 0, inProgress: 0 };
      const prefix = isActive ? chalk.green('* ') : '  ';
      const nameStr = isActive ? chalk.green(chalk.bold(name)) : name;
      const countStr = chalk.gray(
        `${counts.total} tasks (${counts.inProgress} in_progress)`
      );
      console.log(`${prefix}${nameStr}  ${countStr}`);
    }

    if (projects.length > 0) {
      console.log(chalk.gray('─'.repeat(40)));
    }

    const inboxPrefix = activeProject === null ? chalk.green('* ') : '  ';
    const inboxLabel =
      activeProject === null ? chalk.green(chalk.bold('[Inbox]')) : '[Inbox]';
    const inboxStr = chalk.gray(
      `${inboxCount} task${inboxCount !== 1 ? 's' : ''}`
    );
    console.log(`${inboxPrefix}${inboxLabel}  ${inboxStr}`);
  }
}
