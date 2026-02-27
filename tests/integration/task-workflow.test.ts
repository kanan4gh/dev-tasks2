import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TaskManager } from '../../src/services/TaskManager.js';
import { FileStorage } from '../../src/storage/FileStorage.js';
import { AppError } from '../../src/types/index.js';

describe('task-workflow（統合テスト）', () => {
  let tmpDir: string;
  let storage: FileStorage;
  let manager: TaskManager;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'taskcli-integration-'));
    storage = new FileStorage(join(tmpDir, 'tasks.json'));
    manager = new TaskManager(storage);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('add → start → done の一連フローが正常に動作する', () => {
    // add
    const task = manager.createTask({ title: 'Integration test task' });
    expect(task.id).toBe(1);
    expect(task.status).toBe('open');

    // start
    const started = manager.startTask(task.id);
    expect(started.status).toBe('in_progress');

    // done
    const done = manager.completeTask(task.id);
    expect(done.status).toBe('completed');
  });

  it('add → archive フローが正常に動作する', () => {
    const task = manager.createTask({ title: 'Archive test' });
    const archived = manager.archiveTask(task.id);
    expect(archived.status).toBe('archived');
  });

  it('削除後に同じ ID は採番されない', () => {
    const t1 = manager.createTask({ title: 'Task 1' });
    const t2 = manager.createTask({ title: 'Task 2' });
    manager.deleteTask(t1.id);
    const t3 = manager.createTask({ title: 'Task 3' });
    expect(t3.id).toBe(t2.id + 1);
  });

  it('複数タスクを作成して ID が連番になる', () => {
    const tasks = [];
    for (let i = 0; i < 5; i++) {
      tasks.push(manager.createTask({ title: `Task ${i + 1}` }));
    }
    expect(tasks.map((t) => t.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('ファイルへの永続化が正しく機能する', () => {
    manager.createTask({ title: 'Persistent task' });
    manager.createTask({ title: 'Another task' });

    // 新しいストレージ・マネージャーインスタンスで読み込んでも同じデータが得られる
    const storage2 = new FileStorage(join(tmpDir, 'tasks.json'));
    const manager2 = new TaskManager(storage2);
    const tasks = manager2.listTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('Persistent task');
  });

  it('in_progress → archived の不正遷移は AppError をスローする', () => {
    const task = manager.createTask({ title: 'Transition test' });
    manager.startTask(task.id);
    expect(() => manager.archiveTask(task.id)).toThrow(AppError);
  });
});
