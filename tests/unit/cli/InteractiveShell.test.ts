import { describe, it, expect, vi } from 'vitest';
import { Command } from 'commander';
import {
  parseInput,
  buildCompleter,
  getPrompt,
} from '../../../src/cli/shell/InteractiveShell.js';
import type { GlobalConfigService } from '../../../src/services/GlobalConfigService.js';

// ---------------------------------------------------------------------------
// parseInput()
// ---------------------------------------------------------------------------

describe('parseInput()', () => {
  it('スペース区切りで分割する', () => {
    expect(parseInput('add タイトル')).toEqual(['add', 'タイトル']);
  });

  it('ダブルクォート内のスペースは分割しない', () => {
    expect(parseInput('add "foo bar"')).toEqual(['add', 'foo bar']);
  });

  it('シングルクォート内のスペースは分割しない', () => {
    expect(parseInput("add 'foo bar'")).toEqual(['add', 'foo bar']);
  });

  it('空文字列は空配列を返す', () => {
    expect(parseInput('')).toEqual([]);
  });

  it('空白のみは空配列を返す', () => {
    expect(parseInput('   ')).toEqual([]);
  });

  it('未閉じシングルクォートは null を返す', () => {
    expect(parseInput("add 'foo")).toBeNull();
  });

  it('未閉じダブルクォートは null を返す', () => {
    expect(parseInput('add "foo')).toBeNull();
  });

  it('タブ文字を区切り文字として扱う', () => {
    expect(parseInput('list\t--all')).toEqual(['list', '--all']);
  });

  it('複数スペースを正しく処理する', () => {
    expect(parseInput('list  --all')).toEqual(['list', '--all']);
  });

  it('クォートなしの単一トークン', () => {
    expect(parseInput('list')).toEqual(['list']);
  });

  it('オプションフラグを含む入力', () => {
    expect(parseInput('list --status open')).toEqual([
      'list',
      '--status',
      'open',
    ]);
  });
});

// ---------------------------------------------------------------------------
// buildCompleter()
// ---------------------------------------------------------------------------

function makeProgram(...subcommandNames: string[]): Command {
  const program = new Command();
  for (const name of subcommandNames) {
    const sub = program.command(name);
    sub.option('-f, --foo', 'foo flag');
    sub.option('--bar <value>', 'bar option');
  }
  return program;
}

describe('buildCompleter()', () => {
  it('空入力でサブコマンド一覧を返す', () => {
    const program = makeProgram('add', 'list', 'done');
    const completer = buildCompleter(program);
    const [completions, partial] = completer('');
    expect(completions).toContain('add');
    expect(completions).toContain('list');
    expect(completions).toContain('done');
    expect(partial).toBe('');
  });

  it('部分一致でサブコマンドを絞り込む', () => {
    const program = makeProgram('add', 'archive', 'list');
    const completer = buildCompleter(program);
    const [completions, partial] = completer('a');
    expect(completions).toContain('add');
    expect(completions).toContain('archive');
    expect(completions).not.toContain('list');
    expect(partial).toBe('a');
  });

  it('完全一致のサブコマンドのみ返す', () => {
    const program = makeProgram('add', 'archive');
    const completer = buildCompleter(program);
    const [completions] = completer('add');
    expect(completions).toEqual(['add']);
  });

  it('サブコマンド後のスペースではオプション補完しない（フラグなし入力）', () => {
    const program = makeProgram('list');
    const completer = buildCompleter(program);
    const [completions] = completer('list ');
    expect(completions).toEqual([]);
  });

  it('"-" 始まりのフラグを補完する', () => {
    const program = makeProgram('list');
    const completer = buildCompleter(program);
    const [completions, partial] = completer('list -');
    expect(completions).toContain('-f');
    expect(completions).toContain('--foo');
    expect(completions).toContain('--bar');
    expect(partial).toBe('-');
  });

  it('"--" 始まりのフラグで長形式のみ絞り込む', () => {
    const program = makeProgram('list');
    const completer = buildCompleter(program);
    const [completions] = completer('list --');
    expect(completions).toContain('--foo');
    expect(completions).toContain('--bar');
    expect(completions).not.toContain('-f');
  });

  it('存在しないサブコマンドのオプション補完は空を返す', () => {
    const program = makeProgram('list');
    const completer = buildCompleter(program);
    const [completions] = completer('unknown -');
    expect(completions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPrompt()
// ---------------------------------------------------------------------------

function makeConfigService(activeProject: string | null): GlobalConfigService {
  return {
    getActiveProject: vi.fn(() => activeProject),
  } as unknown as GlobalConfigService;
}

describe('getPrompt()', () => {
  it('アクティブプロジェクトがある場合はプロジェクト名を表示する', () => {
    const service = makeConfigService('my-app');
    expect(getPrompt(service)).toBe('task [my-app]> ');
  });

  it('アクティブプロジェクトが未設定の場合は inbox を表示する', () => {
    const service = makeConfigService(null);
    expect(getPrompt(service)).toBe('task [inbox]> ');
  });
});
