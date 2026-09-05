/**
 * Canonical Baobab execution context (ADR-0011 §4.3, ADR-0012 §4-8).
 *
 * A `BaobabContext` is the single source of truth every tenancy, authorization,
 * content-resolution, caching and event module in this package consumes. It is
 * never invented locally from mutable content fields (title, slug, hostname) —
 * see ADR-0012 §35.
 */

export type CapabilityId = string;

interface BaseContext {
  /** Canonical actor identity (ADR-0017 §5) — never a Payload user row ID by itself. */
  actorId: string;
  /** Correlation identifier propagated across engines (ADR-0011 §40, ADR-0018 §22). */
  correlationId: string;
  /** Capabilities bound to this actor/context (ADR-0011 §35, ADR-0017 §36-37). */
  capabilities: CapabilityId[];
  /**
   * Explicit privileged platform-administrator flag. Distinct from ordinary
   * tenant/content-administrator roles (ADR-0012 §21-22, ADR-0017 §24, §47).
   */
  isPlatformAdmin: boolean;
}

/**
 * The ordinary, tenant-owned execution context. Every tenant-scoped
 * collection operation resolves one of these before touching Payload access
 * control or persistence (ADR-0012 §3).
 */
export interface TenantContext extends BaseContext {
  kind: 'tenant';
  tenantId: string;
  legalEntityId?: string;
  digitalEstateId?: string;
  marketId?: string;
  locale?: string;
  /** Which Payload EngineInstance is serving this request (ADR-0012 §59, ADR-0020 §5-6). */
  engineInstanceId?: string;
  /** Reference to the applicable IsolationProfile (ADR-0012 §12, §77). */
  isolationProfile?: string;
}

/**
 * Explicit platform scope for background jobs, migrations, reconciliation and
 * platform-global content (ADR-0012 §33, §10). Never inferred from a null
 * tenant — it must be deliberately constructed.
 */
export interface PlatformContext extends BaseContext {
  kind: 'platform';
}

export type BaobabContext = TenantContext | PlatformContext;

export function isTenantContext(context: BaobabContext): context is TenantContext {
  return context.kind === 'tenant';
}

export function isPlatformContext(context: BaobabContext): context is PlatformContext {
  return context.kind === 'platform';
}
