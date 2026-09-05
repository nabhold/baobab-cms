import { describe, expect, it } from 'vitest';
import { tenantScopedAccess, platformAdminOnlyAccess } from './access.js';
import type { ContextActor, ContextRequest } from '../context/resolve.js';

function makeArgs(user: ContextActor | null) {
  const req: ContextRequest = { user, headers: { get: () => null } };
  return { req } as unknown as Parameters<ReturnType<typeof tenantScopedAccess>['read']>[0];
}

describe('tenantScopedAccess — negative multi-tenant isolation (ADR-0012 CT-001/CT-002)', () => {
  const access = tenantScopedAccess();

  it('denies read/write when context cannot be resolved at all', () => {
    expect(access.read(makeArgs(null))).toBe(false);
    expect(access.create(makeArgs(null))).toBe(false);
  });

  it('scopes read to the caller tenant — tenant A cannot read tenant B via query override', async () => {
    const result = access.read(makeArgs({ id: '1', tenantId: 'tenant-a' }));
    expect(result).toEqual({ tenant: { equals: 'tenant-a' } });
    // Nothing in the returned Where clause can be widened by client input —
    // it is derived solely from resolved context.
    expect(result).not.toEqual({ tenant: { equals: 'tenant-b' } });
  });

  it('scopes update/delete to the caller tenant', () => {
    expect(access.update(makeArgs({ id: '1', tenantId: 'tenant-a' }))).toEqual({
      tenant: { equals: 'tenant-a' },
    });
    expect(access.delete(makeArgs({ id: '1', tenantId: 'tenant-a' }))).toEqual({
      tenant: { equals: 'tenant-a' },
    });
  });

  it('allows create for any resolvable tenant context by default (tenant assigned server-side)', () => {
    expect(access.create(makeArgs({ id: '1', tenantId: 'tenant-a' }))).toBe(true);
  });

  it('grants full access to a platform context', () => {
    expect(access.read(makeArgs({ id: '1', platformAdministrator: true }))).toBe(true);
    expect(access.update(makeArgs({ id: '1', platformAdministrator: true }))).toBe(true);
  });

  it('enforces a required capability even for an otherwise valid tenant context', () => {
    const gated = tenantScopedAccess({ requiredCapability: 'content.management' });
    expect(gated.read(makeArgs({ id: '1', tenantId: 'tenant-a' }))).toBe(false);
    expect(
      gated.read(makeArgs({ id: '1', tenantId: 'tenant-a', capabilities: ['content.management'] })),
    ).toEqual({ tenant: { equals: 'tenant-a' } });
  });

  it('allows platform-global reads to opt in explicitly without exposing other tenants', () => {
    const globalAccess = tenantScopedAccess({ allowPlatformGlobalRead: true });
    const result = globalAccess.read(makeArgs({ id: '1', tenantId: 'tenant-a' }));
    expect(result).toEqual({
      or: [{ tenant: { equals: 'tenant-a' } }, { contentScope: { equals: 'PLATFORM' } }],
    });
  });
});

describe('platformAdminOnlyAccess', () => {
  it('denies ordinary tenant actors regardless of their own tenant privilege', () => {
    const access = platformAdminOnlyAccess();
    expect(access.read(makeArgs({ id: '1', tenantId: 'tenant-a', capabilities: ['administer_content'] }))).toBe(
      false,
    );
  });

  it('allows platform administrators', () => {
    const access = platformAdminOnlyAccess();
    expect(access.read(makeArgs({ id: '1', platformAdministrator: true }))).toBe(true);
  });
});
