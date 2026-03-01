import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer } from '../../../src/cli/Renderer.js';
import { AppError } from '../../../src/types/index.js';
import type { Task } from '../../../src/types/index.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Test task',
    description: '',
    status: 'open',
    priority: 'medium',
    branch: null,
    dueDate: null,
    createdAt: '2026-02-27T00:00:00Z',
    updatedAt: '2026-02-27T00:00:00Z',
    ...overrides,
  };
}

describe('Renderer', () => {
  let renderer: Renderer;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    renderer = new Renderer();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('renderTable()', () => {
    it('タスクがない場合に「タスクがありません」を表示する', () => {
      renderer.renderTable([], '[Project: test]');
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('タスクがありません');
    });

    it('タスク一覧をテーブルで表示する（ローカル ID）', () => {
      renderer.renderTable(
        [makeTask({ id: 1, title: 'My task' })],
        '[Project: test]'
      );
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('My task');
      expect(output).toContain('1');
    });

    it('projectId を渡すと複合 ID を表示する', () => {
      renderer.renderTable(
        [makeTask({ id: 3, title: 'Composite task' })],
        '[Project: my-app]',
        1
      );
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('1-3');
    });

    it('40文字を超えるタイトルを省略する', () => {
      const longTitle = 'a'.repeat(50);
      renderer.renderTable([makeTask({ title: longTitle })], '[Inbox]');
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).not.toContain(longTitle);
      expect(output).toContain('…');
    });

    it('ヘッダーを表示する', () => {
      renderer.renderTable([], '[Project: my-app]');
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('[Project: my-app]');
    });
  });

  describe('renderError()', () => {
    it('AppError の情報を表示する', () => {
      const error = new AppError('テストエラー', '原因です', '対処法です');
      renderer.renderError(error);
      const output = consoleErrorSpy.mock.calls.join('\n');
      expect(output).toContain('テストエラー');
      expect(output).toContain('原因です');
      expect(output).toContain('対処法です');
    });
  });

  describe('renderSuccess()', () => {
    it('成功メッセージを表示する', () => {
      renderer.renderSuccess('完了しました');
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('完了しました');
    });
  });

  describe('renderInfo()', () => {
    it('情報メッセージを表示する', () => {
      renderer.renderInfo('情報です');
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('情報です');
    });
  });

  describe('renderWarning()', () => {
    it('警告メッセージを表示する', () => {
      renderer.renderWarning('警告です');
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('警告です');
    });
  });

  describe('renderDetail()', () => {
    it('タスクの詳細を表示する', () => {
      renderer.renderDetail(
        makeTask({ id: 5, title: 'Detail task', description: '詳細説明' })
      );
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('5');
      expect(output).toContain('Detail task');
      expect(output).toContain('詳細説明');
    });

    it('branch が null の場合は "-" を表示する', () => {
      renderer.renderDetail(makeTask({ branch: null }));
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('-');
    });
  });

  describe('renderGroupedTable()', () => {
    it('groups が空の場合「タスクがありません」を表示する', () => {
      renderer.renderGroupedTable([]);
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('タスクがありません');
    });

    it('各グループのヘッダーとタスクを表示する', () => {
      const groups = [
        {
          header: '[Project: myapp]',
          tasks: [makeTask({ id: 1, title: 'Task A' })],
        },
        {
          header: '[Project: personal]',
          tasks: [makeTask({ id: 2, title: 'Task B' })],
        },
      ];
      renderer.renderGroupedTable(groups);
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('[Project: myapp]');
      expect(output).toContain('Task A');
      expect(output).toContain('[Project: personal]');
      expect(output).toContain('Task B');
    });

    it('activeProject を渡すとそのヘッダーが強調表示される', () => {
      const groups = [
        {
          header: '[Project: my-app]',
          tasks: [makeTask({ id: 1 })],
          projectId: 1,
        },
        {
          header: '[Project: personal]',
          tasks: [makeTask({ id: 2 })],
          projectId: 2,
        },
      ];
      renderer.renderGroupedTable(groups, 'my-app');
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('[Project: my-app]');
      expect(output).toContain('[Project: personal]');
    });

    it('activeProject=null のとき [Inbox] ヘッダーが強調される', () => {
      const groups = [
        {
          header: '[Project: my-app]',
          tasks: [makeTask({ id: 1 })],
          projectId: 1,
        },
        { header: '[Inbox]', tasks: [makeTask({ id: 2 })], projectId: 0 },
      ];
      renderer.renderGroupedTable(groups, null);
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('[Inbox]');
    });

    it('グループ間に空行を挿入する', () => {
      const groups = [
        {
          header: '[Project: myapp]',
          tasks: [makeTask({ id: 1 })],
        },
        {
          header: '[Inbox]',
          tasks: [makeTask({ id: 2 })],
        },
      ];
      renderer.renderGroupedTable(groups);
      // console.log() が空行として呼ばれているか（引数なし呼び出し）
      const emptyLineCalls = consoleSpy.mock.calls.filter(
        (call: unknown[]) => call.length === 0 || call[0] === ''
      );
      expect(emptyLineCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('renderProjectList()', () => {
    it('プロジェクトがない場合に案内メッセージを表示する', () => {
      renderer.renderProjectList([], null, new Map(), 0);
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('プロジェクトがありません');
    });

    it('プロジェクト一覧とアクティブマークを表示する', () => {
      const counts = new Map([
        ['my-app', { total: 3, inProgress: 1 }],
        ['personal', { total: 1, inProgress: 0 }],
      ]);
      renderer.renderProjectList(['my-app', 'personal'], 'my-app', counts, 2);
      const output = consoleSpy.mock.calls.join('\n');
      expect(output).toContain('my-app');
      expect(output).toContain('personal');
      expect(output).toContain('3 tasks');
      expect(output).toContain('[Inbox]');
    });
  });
});
