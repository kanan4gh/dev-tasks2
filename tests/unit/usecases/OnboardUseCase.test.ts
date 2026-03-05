import { describe, it, expect } from 'vitest';
import { buildSuggestedTasks } from '../../../src/usecases/OnboardUseCase.js';
import type { Task } from '../../../src/types/index.js';

function makeTask(id: number, status: 'open' | 'in_progress'): Task {
  return {
    id,
    title: `タスク${id}`,
    description: '',
    status,
    priority: 'medium',
    branch: null,
    dueDate: null,
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-03-05T00:00:00Z',
  };
}

describe('buildSuggestedTasks()', () => {
  it('タスクが 0 件の場合に空配列を返す', () => {
    const result = buildSuggestedTasks([
      {
        tasks: [],
        projectName: 'my-app',
        projectId: 1,
        isActive: true,
        isInbox: false,
      },
    ]);
    expect(result).toEqual([]);
  });

  it('最大3件に絞られる', () => {
    const tasks = [1, 2, 3, 4, 5].map((i) => makeTask(i, 'open'));
    const result = buildSuggestedTasks([
      {
        tasks,
        projectName: 'my-app',
        projectId: 1,
        isActive: true,
        isInbox: false,
      },
    ]);
    expect(result).toHaveLength(3);
  });

  it('アクティブプロジェクトの in_progress が先頭に来る', () => {
    const result = buildSuggestedTasks([
      {
        tasks: [makeTask(1, 'open'), makeTask(2, 'in_progress')],
        projectName: 'my-app',
        projectId: 1,
        isActive: true,
        isInbox: false,
      },
    ]);
    expect(result[0].compositeId).toBe('1-2');
    expect(result[0].status).toBe('in_progress');
  });

  it('アクティブプロジェクトの open > 他プロジェクトの in_progress', () => {
    const result = buildSuggestedTasks([
      {
        tasks: [makeTask(1, 'open')],
        projectName: 'my-app',
        projectId: 1,
        isActive: true,
        isInbox: false,
      },
      {
        tasks: [makeTask(2, 'in_progress')],
        projectName: 'other',
        projectId: 2,
        isActive: false,
        isInbox: false,
      },
    ]);
    expect(result[0].projectName).toBe('my-app');
    expect(result[1].projectName).toBe('other');
  });

  it('Inbox の in_progress はアクティブの open より後', () => {
    const result = buildSuggestedTasks([
      {
        tasks: [makeTask(1, 'open')],
        projectName: 'my-app',
        projectId: 1,
        isActive: true,
        isInbox: false,
      },
      {
        tasks: [makeTask(2, 'in_progress')],
        projectName: 'Inbox',
        projectId: 0,
        isActive: false,
        isInbox: true,
      },
    ]);
    expect(result[0].projectName).toBe('my-app');
    expect(result[1].projectName).toBe('Inbox');
  });

  it('compositeId が projectId-taskId 形式になる', () => {
    const result = buildSuggestedTasks([
      {
        tasks: [makeTask(3, 'open')],
        projectName: 'my-app',
        projectId: 2,
        isActive: true,
        isInbox: false,
      },
    ]);
    expect(result[0].compositeId).toBe('2-3');
  });
});
