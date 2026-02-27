import { AppError } from '../types/index.js';
import type {
  CreateTaskInput,
  IStorage,
  Task,
  TaskFilter,
  TaskStatus,
} from '../types/index.js';

export class TaskManager {
  private readonly storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  createTask(input: CreateTaskInput): Task {
    this.validateTitle(input.title);

    if (input.dueDate !== undefined) {
      this.validateDueDate(input.dueDate);
    }

    const tasks = this.storage.load();
    const id = this.nextId(tasks);
    const now = new Date().toISOString();

    const task: Task = {
      id,
      title: input.title,
      description: input.description ?? '',
      status: 'open',
      priority: input.priority ?? 'medium',
      branch: null,
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    tasks.push(task);
    this.storage.save(tasks);
    return task;
  }

  listTasks(filter?: TaskFilter): Task[] {
    const tasks = this.storage.load();
    let result = tasks;

    if (filter?.status !== undefined) {
      result = result.filter((t) => t.status === filter.status);
    }
    if (filter?.priority !== undefined) {
      result = result.filter((t) => t.priority === filter.priority);
    }

    return result.sort((a, b) => a.id - b.id);
  }

  getTask(id: number): Task {
    const tasks = this.storage.load();
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      throw new AppError(
        'タスクが見つかりません',
        `ID=${id} のタスクは存在しません`,
        'task list で有効な ID を確認してください'
      );
    }
    return task;
  }

  updateTask(
    id: number,
    data: Partial<Pick<Task, 'title' | 'description' | 'branch'>>
  ): Task {
    const tasks = this.storage.load();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new AppError(
        'タスクが見つかりません',
        `ID=${id} のタスクは存在しません`,
        'task list で有効な ID を確認してください'
      );
    }
    const updated: Task = {
      ...tasks[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    tasks[index] = updated;
    this.storage.save(tasks);
    return updated;
  }

  deleteTask(id: number): void {
    const tasks = this.storage.load();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new AppError(
        'タスクが見つかりません',
        `ID=${id} のタスクは存在しません`,
        'task list で有効な ID を確認してください'
      );
    }
    // ID は欠番のまま再利用しない（削除するだけで ID を詰めない）
    tasks.splice(index, 1);
    this.storage.save(tasks);
  }

  startTask(id: number): Task {
    const tasks = this.storage.load();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new AppError(
        'タスクが見つかりません',
        `ID=${id} のタスクは存在しません`,
        'task list で有効な ID を確認してください'
      );
    }

    const task = tasks[index];
    if (task.status === 'in_progress') {
      throw new AppError(
        'このタスクはすでに開始済みです',
        'ステータスがすでに in_progress です',
        'task list でステータスを確認してください'
      );
    }
    if (task.status === 'completed' || task.status === 'archived') {
      throw new AppError(
        'このタスクは開始できません',
        `${task.status} のタスクは変更できません`,
        '新しいタスクを作成してください'
      );
    }

    const updated: Task = {
      ...task,
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    };
    tasks[index] = updated;
    this.storage.save(tasks);
    return updated;
  }

  completeTask(id: number): Task {
    const tasks = this.storage.load();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new AppError(
        'タスクが見つかりません',
        `ID=${id} のタスクは存在しません`,
        'task list で有効な ID を確認してください'
      );
    }

    const task = tasks[index];
    if (task.status === 'completed') {
      throw new AppError(
        'このタスクはすでに完了済みです',
        'ステータスがすでに completed です',
        'task list でステータスを確認してください'
      );
    }
    if (task.status === 'archived') {
      throw new AppError(
        'このタスクは完了できません',
        'archived のタスクは変更できません',
        '新しいタスクを作成してください'
      );
    }

    const updated: Task = {
      ...task,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
    tasks[index] = updated;
    this.storage.save(tasks);
    return updated;
  }

  archiveTask(id: number): Task {
    const tasks = this.storage.load();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new AppError(
        'タスクが見つかりません',
        `ID=${id} のタスクは存在しません`,
        'task list で有効な ID を確認してください'
      );
    }

    const task = tasks[index];
    this.validateArchiveTransition(task.status);

    const updated: Task = {
      ...task,
      status: 'archived',
      updatedAt: new Date().toISOString(),
    };
    tasks[index] = updated;
    this.storage.save(tasks);
    return updated;
  }

  searchTasks(keyword: string): Task[] {
    const tasks = this.storage.load();
    const lower = keyword.toLowerCase();
    return tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          t.description.toLowerCase().includes(lower)
      )
      .sort((a, b) => a.id - b.id);
  }

  /**
   * タスクを別のストレージに移動する
   */
  moveTask(id: number, targetStorage: IStorage): Task {
    const tasks = this.storage.load();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new AppError(
        'タスクが見つかりません',
        `ID=${id} のタスクは存在しません`,
        'task list で有効な ID を確認してください'
      );
    }

    const task = { ...tasks[index] };

    // 移動先の既存タスクの最大 ID を取得して ID を再採番
    const targetTasks = targetStorage.load();
    const newId = this.nextId(targetTasks);
    const movedTask: Task = {
      ...task,
      id: newId,
      updatedAt: new Date().toISOString(),
    };

    targetTasks.push(movedTask);
    targetStorage.save(targetTasks);

    tasks.splice(index, 1);
    this.storage.save(tasks);

    return movedTask;
  }

  private nextId(tasks: Task[]): number {
    if (tasks.length === 0) return 1;
    return Math.max(...tasks.map((t) => t.id)) + 1;
  }

  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new AppError(
        'タイトルは必須です',
        'タイトルが空です',
        '1文字以上入力してください'
      );
    }
    if (title.length > 200) {
      throw new AppError(
        'タイトルが長すぎます',
        `${title.length}文字が入力されました`,
        '200文字以内で入力してください'
      );
    }
  }

  private validateDueDate(dueDate: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw new AppError(
        '期限の形式が不正です',
        `"${dueDate}" は有効な日付形式ではありません`,
        'YYYY-MM-DD 形式で入力してください（例: 2026-03-31）'
      );
    }
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      throw new AppError(
        '期限の日付が不正です',
        `"${dueDate}" は存在しない日付です`,
        '有効な日付を入力してください'
      );
    }
  }

  private validateArchiveTransition(status: TaskStatus): void {
    if (status === 'in_progress') {
      throw new AppError(
        'このタスクはアーカイブできません',
        'in_progress のタスクを直接 archived に遷移することはできません',
        'task done でタスクを完了してからアーカイブしてください'
      );
    }
    if (status === 'archived') {
      throw new AppError(
        'このタスクはすでにアーカイブ済みです',
        'ステータスがすでに archived です',
        'task list でステータスを確認してください'
      );
    }
  }
}
