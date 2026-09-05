import type { CollectionSlug, Field } from 'payload';
import { tryResolveContext, type ContextRequest } from '../context/resolve.js';
import { ContentScope } from './scope.js';

function asContextRequest(req: unknown): ContextRequest {
  return req as ContextRequest;
}

/**
 * The canonical `tenant` field every tenant-owned collection SHALL carry
 * (ADR-0012 §7, §9). Server-assigned on create from trusted context; a
 * client-supplied `tenant` in the request body is ignored on create and
 * rejected as an ordinary edit on update (ADR-0012 §17, §19, §52).
 */
export function tenantOwnedField(options: { relationTo?: CollectionSlug } = {}): Field {
  return {
    name: 'tenant',
    type: 'relationship',
    relationTo: options.relationTo ?? ('tenants' as CollectionSlug),
    required: true,
    index: true,
    admin: {
      position: 'sidebar',
      description: 'Canonical tenant owner. Server-assigned from context; not directly editable.',
      readOnly: true,
    },
    access: {
      // Defence in depth: strip any client-submitted value before the
      // beforeChange hook even runs (ADR-0012 §15).
      update: () => false,
    },
    hooks: {
      beforeChange: [
        ({ req, operation, originalDoc, value }) => {
          const context = tryResolveContext(asContextRequest(req));
          if (!context) {
            throw new Error('Baobab context could not be resolved; tenant ownership cannot be assigned.');
          }

          if (context.kind === 'platform') {
            // Trusted system/migration context: an explicit tenant value is
            // still required — platform scope never implies a default tenant.
            const platformValue = value ?? originalDoc?.tenant;
            if (!platformValue) {
              throw new Error('System operations must supply an explicit tenant id.');
            }
            return platformValue;
          }

          if (operation === 'create') {
            return context.tenantId;
          }

          // update: tenant re-assignment is a governed transfer workflow,
          // never an ordinary field edit (ADR-0012 §19, §52).
          const existingTenant = originalDoc?.tenant;
          if (existingTenant && existingTenant !== context.tenantId) {
            throw new Error('Cross-tenant update rejected: record does not belong to the request tenant.');
          }
          return existingTenant ?? context.tenantId;
        },
      ],
    },
  };
}

/**
 * Explicit content-scope classification (ADR-0012 §11, §67, ADR-0014 §92).
 * Defaults to TENANT — platform-global scope is never the default, it is
 * an explicit, auditable choice.
 */
export function contentScopeField(options: { defaultValue?: ContentScope } = {}): Field {
  return {
    name: 'contentScope',
    type: 'select',
    required: true,
    defaultValue: options.defaultValue ?? ContentScope.TENANT,
    index: true,
    options: Object.values(ContentScope).map((value) => ({ label: value, value })),
    admin: {
      position: 'sidebar',
      description: 'Explicit applicability scope. PLATFORM must never be inferred from a missing tenant.',
    },
    access: {
      // Only platform administrators may declare a record PLATFORM-scoped.
      update: ({ req, siblingData }) => {
        const context = tryResolveContext(asContextRequest(req));
        if (!context) return false;
        if (context.isPlatformAdmin) return true;
        const requested = (siblingData as { contentScope?: ContentScope } | undefined)?.contentScope;
        return requested !== ContentScope.PLATFORM;
      },
    },
  };
}

/**
 * Reusable validator for optional scoping relationships (digital estate,
 * market) that must belong to the same tenant as the owning record
 * (ADR-0012 §36 — cross-tenant relationships prohibited by default).
 */
export function sameTenantRelationshipField(params: {
  name: string;
  relationTo: CollectionSlug;
  label: string;
  required?: boolean;
}): Field {
  return {
    name: params.name,
    type: 'relationship',
    relationTo: params.relationTo,
    required: params.required ?? false,
    index: true,
    admin: { description: `${params.label} — must belong to the same tenant as this record.` },
    hooks: {
      beforeChange: [
        async ({ req, value, data }) => {
          if (!value) return value;
          const context = tryResolveContext(asContextRequest(req));
          if (!context || context.kind === 'platform') return value;

          const relatedId = typeof value === 'object' && value !== null ? (value as { id: string }).id : value;
          const related = (await req.payload.findByID({
            collection: params.relationTo,
            id: relatedId as string,
            depth: 0,
            req,
          })) as unknown as { tenant?: unknown } | null;
          const relatedTenant =
            typeof related?.tenant === 'object' && related?.tenant !== null
              ? (related.tenant as { id: string }).id
              : related?.tenant;
          const recordTenant = (data as { tenant?: unknown } | undefined)?.tenant ?? context.tenantId;
          const recordTenantId =
            typeof recordTenant === 'object' && recordTenant !== null ? (recordTenant as { id: string }).id : recordTenant;

          if (relatedTenant && recordTenantId && relatedTenant !== recordTenantId) {
            throw new Error(
              `${params.label} "${String(relatedId)}" belongs to a different tenant and cannot be referenced.`,
            );
          }
          return value;
        },
      ],
    },
  };
}
