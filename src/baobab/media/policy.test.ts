import { describe, expect, it } from 'vitest';
import { isMimeTypeAllowed, isSizeAllowed, containsUnsafeSvgMarkup, buildTenantScopedStorageKey } from './policy.js';

describe('media upload policy — ADR-0016 §38-40', () => {
  it('accepts governed mime types and rejects others', () => {
    expect(isMimeTypeAllowed('image/png')).toBe(true);
    expect(isMimeTypeAllowed('application/x-msdownload')).toBe(false);
  });

  it('enforces the size ceiling', () => {
    expect(isSizeAllowed(1024)).toBe(true);
    expect(isSizeAllowed(0)).toBe(false);
    expect(isSizeAllowed(100 * 1024 * 1024)).toBe(false);
  });

  it('flags inline script and event-handler SVG payloads as unsafe', () => {
    expect(containsUnsafeSvgMarkup('<svg><script>alert(1)</script></svg>')).toBe(true);
    expect(containsUnsafeSvgMarkup('<svg onload="alert(1)"></svg>')).toBe(true);
    expect(containsUnsafeSvgMarkup('<svg><circle r="4" /></svg>')).toBe(false);
  });
});

describe('buildTenantScopedStorageKey — ADR-0016 §15', () => {
  it('partitions the key by tenant and sanitises the filename', () => {
    const key = buildTenantScopedStorageKey({
      tenantId: 'tenant-a',
      canonicalMediaId: 'media-1',
      filename: 'my file (final)!.png',
    });
    expect(key).toBe('tenants/tenant-a/media/media-1/my_file__final__.png');
  });

  it('two tenants never collide on an identical filename', () => {
    const keyA = buildTenantScopedStorageKey({ tenantId: 'tenant-a', canonicalMediaId: 'm1', filename: 'logo.png' });
    const keyB = buildTenantScopedStorageKey({ tenantId: 'tenant-b', canonicalMediaId: 'm1', filename: 'logo.png' });
    expect(keyA).not.toBe(keyB);
  });
});
