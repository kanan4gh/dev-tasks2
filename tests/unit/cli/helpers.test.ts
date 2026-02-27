import { describe, it, expect } from 'vitest';
import { parseId } from '../../../src/cli/helpers.js';
import { AppError } from '../../../src/types/index.js';

describe('parseId()', () => {
  it('有効な正の整数を返す', () => {
    expect(parseId('1')).toBe(1);
    expect(parseId('42')).toBe(42);
    expect(parseId('999')).toBe(999);
  });

  it('0 は AppError をスローする', () => {
    expect(() => parseId('0')).toThrow(AppError);
  });

  it('負数は AppError をスローする', () => {
    expect(() => parseId('-1')).toThrow(AppError);
  });

  it('文字列は AppError をスローする', () => {
    expect(() => parseId('abc')).toThrow(AppError);
  });

  it('小数は切り捨てて整数として扱う', () => {
    expect(parseId('3.7')).toBe(3);
  });
});
