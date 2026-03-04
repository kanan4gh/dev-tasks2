import { describe, it, expect } from 'vitest';
import { parseDuration } from '../../../src/cli/commands/time.js';
import { AppError } from '../../../src/types/index.js';

describe('parseDuration()', () => {
  describe('正常系', () => {
    it('"20min" → 1200000ms', () => {
      expect(parseDuration('20min')).toBe(1200000);
    });

    it('"20m" → 1200000ms', () => {
      expect(parseDuration('20m')).toBe(1200000);
    });

    it('"1h" → 3600000ms', () => {
      expect(parseDuration('1h')).toBe(3600000);
    });

    it('"30s" → 30000ms', () => {
      expect(parseDuration('30s')).toBe(30000);
    });

    it('"20"（単位なし）→ 1200000ms（分として解釈）', () => {
      expect(parseDuration('20')).toBe(1200000);
    });

    it('"2h" → 7200000ms', () => {
      expect(parseDuration('2h')).toBe(7200000);
    });

    it('"90s" → 90000ms', () => {
      expect(parseDuration('90s')).toBe(90000);
    });

    it('"1min" → 60000ms', () => {
      expect(parseDuration('1min')).toBe(60000);
    });
  });

  describe('異常系', () => {
    it('"0" で AppError が throw される', () => {
      expect(() => parseDuration('0')).toThrow(AppError);
    });

    it('"0min" で AppError が throw される', () => {
      expect(() => parseDuration('0min')).toThrow(AppError);
    });

    it('"0h" で AppError が throw される', () => {
      expect(() => parseDuration('0h')).toThrow(AppError);
    });

    it('"0s" で AppError が throw される', () => {
      expect(() => parseDuration('0s')).toThrow(AppError);
    });

    it('"abc" で AppError が throw される', () => {
      expect(() => parseDuration('abc')).toThrow(AppError);
    });

    it('"20x" で AppError が throw される', () => {
      expect(() => parseDuration('20x')).toThrow(AppError);
    });

    it('空文字で AppError が throw される', () => {
      expect(() => parseDuration('')).toThrow(AppError);
    });
  });
});
