// tests/version.test.ts
import { describe, it, expect } from 'vitest';

describe('Version config', () => {
  it('exports VERSION_INFO with required fields', async () => {
    const { VERSION_INFO } = await import('../src/lib/version');
    expect(VERSION_INFO).toBeDefined();
    expect(VERSION_INFO.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(VERSION_INFO.creator).toBe('JaavLex');
    expect(Array.isArray(VERSION_INFO.changelog)).toBe(true);
    expect(VERSION_INFO.changelog.length).toBeGreaterThan(0);
  });

  it('each changelog entry has version, date, and changes', async () => {
    const { VERSION_INFO } = await import('../src/lib/version');
    for (const entry of VERSION_INFO.changelog) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(entry.changes)).toBe(true);
      expect(entry.changes.length).toBeGreaterThan(0);
    }
  });

  it('first changelog entry matches current version', async () => {
    const { VERSION_INFO } = await import('../src/lib/version');
    expect(VERSION_INFO.changelog[0].version).toBe(VERSION_INFO.version);
  });
});
