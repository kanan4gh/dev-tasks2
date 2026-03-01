import { createInterface } from 'readline';
import { GlobalConfigService } from '../services/GlobalConfigService.js';
import { AppError } from '../types/index.js';

export type TaskRef =
  | { type: 'local'; taskId: number }
  | { type: 'composite'; projectId: number; taskId: number };

/**
 * タスク ID 文字列を TaskRef に解析する
 * "3" → { type: 'local', taskId: 3 }
 * "1-3" → { type: 'composite', projectId: 1, taskId: 3 }
 */
export function parseTaskRef(input: string): TaskRef {
  const compositeMatch = input.match(/^(\d+)-(\d+)$/);
  if (compositeMatch) {
    return {
      type: 'composite',
      projectId: Number(compositeMatch[1]),
      taskId: Number(compositeMatch[2]),
    };
  }
  const taskId = Number(input);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new AppError(
      `"${input}" は有効なタスク ID ではありません`,
      'タスク ID は正の整数または "プロジェクトID-タスクID" 形式で指定してください',
      '例: task show 3  または  task show 1-3'
    );
  }
  return { type: 'local', taskId };
}

/**
 * TaskRef からタスクファイルパス・プロジェクト名・ローカル ID を解決する
 */
export function resolveTaskContext(
  ref: TaskRef,
  configService: GlobalConfigService
): { filePath: string; projectName: string | null; localId: number } {
  if (ref.type === 'local') {
    const activeProject = configService.getActiveProject();
    return {
      filePath: configService.getTaskFilePath(activeProject),
      projectName: activeProject,
      localId: ref.taskId,
    };
  }
  if (ref.projectId === 0) {
    return {
      filePath: configService.getInboxTaskFilePath(),
      projectName: null,
      localId: ref.taskId,
    };
  }
  const entry = configService.getProjectById(ref.projectId);
  if (!entry) {
    throw new AppError(
      `プロジェクト ID "${ref.projectId}" が見つかりません`,
      '指定されたプロジェクト ID は存在しません',
      'task project list でプロジェクト一覧を確認してください'
    );
  }
  return {
    filePath: configService.getTaskFilePath(entry.name),
    projectName: entry.name,
    localId: ref.taskId,
  };
}

/**
 * アクティブプロジェクトに基づいてタスクファイルのパスを解決する
 */
export function resolveTaskFilePath(): string {
  const configService = new GlobalConfigService();
  const activeProject = configService.getActiveProject();
  return configService.getTaskFilePath(activeProject);
}

/**
 * アクティブプロジェクト名を返す（null = inbox モード）
 */
export function getActiveProject(): string | null {
  const configService = new GlobalConfigService();
  return configService.getActiveProject();
}

/**
 * task list 表示用のヘッダー文字列を返す
 */
export function resolveListHeader(): string {
  const activeProject = getActiveProject();
  if (activeProject === null) {
    return '[Inbox]';
  }
  return `[Project: ${activeProject}]`;
}

/**
 * タスク ID 文字列を正の整数として解析する
 */
export function parseId(idStr: string): number {
  const id = parseInt(idStr, 10);
  if (isNaN(id) || id <= 0) {
    throw new AppError(
      '無効な ID です',
      `"${idStr}" は有効なタスク ID ではありません`,
      '正の整数を指定してください'
    );
  }
  return id;
}

/**
 * ユーザーへの確認プロンプトを表示する（y で true）
 */
export function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}
