import { describe, it, expect, vi, afterEach } from 'vitest';
import { isNewer, checkUpdate } from '../../../src/utils/checkUpdate.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isNewer()', () => {
  it('latest の major が大きい場合 true を返す', () => {
    expect(isNewer('1.0.0', '2.0.0')).toBe(true);
  });

  it('latest の minor が大きい場合 true を返す', () => {
    expect(isNewer('0.1.0', '0.2.0')).toBe(true);
  });

  it('latest の patch が大きい場合 true を返す', () => {
    expect(isNewer('0.1.0', '0.1.1')).toBe(true);
  });

  it('同じバージョンの場合 false を返す', () => {
    expect(isNewer('0.2.0', '0.2.0')).toBe(false);
  });

  it('current の方が大きい場合 false を返す', () => {
    expect(isNewer('1.0.0', '0.9.9')).toBe(false);
  });
});

describe('checkUpdate()', () => {
  function mockFetch(tagName: string, ok = true): void {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok,
        json: () => Promise.resolve({ tag_name: tagName }),
      })
    );
  }

  it('最新バージョンが大きい場合、通知文字列を返す', async () => {
    mockFetch('v0.3.0');
    const result = await checkUpdate('0.2.0');
    expect(result).not.toBeNull();
    expect(result).toContain('0.2.0 → 0.3.0');
    expect(result).toContain(
      'https://github.com/kanan4gh/dev-tasks2/releases/latest'
    );
  });

  it('同じバージョンの場合、null を返す', async () => {
    mockFetch('v0.2.0');
    expect(await checkUpdate('0.2.0')).toBeNull();
  });

  it('現在より古いバージョンの場合、null を返す', async () => {
    mockFetch('v0.1.0');
    expect(await checkUpdate('0.2.0')).toBeNull();
  });

  it('tag_name が v プレフィックス付きの場合、正しく除去して比較する', async () => {
    mockFetch('v1.0.0');
    const result = await checkUpdate('0.2.0');
    expect(result).not.toBeNull();
    expect(result).toContain('0.2.0 → 1.0.0');
  });

  it('fetch が 404 を返す場合、null を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    );
    expect(await checkUpdate('0.2.0')).toBeNull();
  });

  it('fetch がネットワークエラーの場合、null を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error'))
    );
    expect(await checkUpdate('0.2.0')).toBeNull();
  });

  it('fetch がタイムアウト（AbortError）の場合、null を返す', async () => {
    const abortError = new DOMException('aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));
    expect(await checkUpdate('0.2.0')).toBeNull();
  });
});
