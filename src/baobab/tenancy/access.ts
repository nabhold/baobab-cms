import type { Access, AccessResult } from 'payload';
import type { BaobabContext, CapabilityId } from '../context/types.js';
import { tryResolveContext, type ContextRequest } from '../context/resolve.js';

function asContextRequest(req: unknown): ContextRequest {
  return req as ContextRequest;
}

function hasCapability(context: BaobabContext, capability: CapabilityId | undefined): boolean {
  if (!capability) return true;
  if (context.isPlatformAdmin) return true;
  return context.capabilities.includes(capability);
}

export interface TenantScopedAccessOptions {
  /**
   * Capability required to operate on this collection at all
   * (ADR-0011 §35, ADR-0017 §36-37). Platform admins always pass.
   */
  requiredCapability?: CapabilityId;
  /**
   * Capability required specifically to write (create/update/delete).
   * Falls back to `requiredCapability` when omitted.
   */
  writeCapability?: CapabilityId;
  /**
   * Allow explicitly platform-global records (contentScope === PLATFORM) to
   * be read across tenants. Never applies to write operations, and never
   * triggered merely by a null tenant (ADR-0012 §10, §94).
   */
  allowPlatformGlobalRead?: boolean;
}

/**
 * Builds the four standard CRUD `access` functions for a tenant-owned
 * Payload collection (ADR-0012 §16-20, §637-72 conceptually §637 "defence in
 * depth"). Read/update/delete return a `Where` clause so tenant filtering is
 * centrally enforced rather than left to callers remembering a filter
 * (ADR-0012 §18, §92 Rejected Alternative "Application Filters Only").
 */
export function tenantScopedAccess(options: TenantScopedAccessOptions = {}): {
  create: Access;
  read: Access;
  update: Access;
  delete: Access;
} {
  const readScope = (context: BaobabContext): AccessResult => {
    if (context.kind === 'platform') return true;
    if (!hasCapability(context, options.requiredCapability)) return false;
    if (options.allowPlatformGlobalRead) {
      return {
        or: [{ tenant: { equals: context.tenantId } }, { contentScope: { equals: 'PLATFORM' } }],
      };
    }
    return { tenant: { equals: context.tenantId } };
  };

  const writeScope = (context: BaobabContext): AccessResult => {
    if (context.kind === 'platform') return true;
    const capability = options.writeCapability ?? options.requiredCapability;
    if (!hasCapability(context, capability)) return false;
    return { tenant: { equals: context.tenantId } };
  };

  const guarded =
    (evaluate: (context: BaobabContext) => AccessResult): Access =>
    (args) => {
      const context = tryResolveContext(asContextRequest(args.req));
      if (!context) return false;
      return evaluate(context);
    };

  return {
    create: guarded((context) => {
      if (context.kind === 'platform') return true;
      const capability = options.writeCapability ?? options.requiredCapability;
      return hasCapability(context, capability);
    }),
    read: guarded(readScope),
    update: guarded(writeScope),
    delete: guarded(writeScope),
  };
}

/**
 * Access for platform-administration-only collections (e.g. schema/config
 * projections). Ordinary tenant editors, however privileged within their
 * tenant, are denied (ADR-0012 §21-22, ADR-0017 §24, §46-48).
 */
export function platformAdminOnlyAccess(): { create: Access; read: Access; update: Access; delete: Access } {
  const evaluate: Access = (args) => {
    const context = tryResolveContext(asContextRequest(args.req));
    return context?.isPlatformAdmin === true;
  };
  return { create: evaluate, read: evaluate, update: evaluate, delete: evaluate };
}

/**
 * Access for content that is always readable once authenticated (e.g.
 * non-sensitive platform-global reference content) but only writable by
 * platform administrators. Still requires a resolvable context — never
 * anonymous (ADR-0012 §73, default-deny).
 */
export function platformGlobalReadOnlyAccess(): { create: Access; read: Access; update: Access; delete: Access } {
  const readEvaluate: Access = (args) => tryResolveContext(asContextRequest(args.req)) !== null;
  const writeEvaluate: Access = (args) => tryResolveContext(asContextRequest(args.req))?.isPlatformAdmin === true;
  return { create: writeEvaluate, read: readEvaluate, update: writeEvaluate, delete: writeEvaluate };
}
