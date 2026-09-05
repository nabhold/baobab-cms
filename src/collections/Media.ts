import type { CollectionConfig } from 'payload';
import { tenantOwnedField, sameTenantRelationshipField } from '../baobab/tenancy/fields.js';
import { tenantScopedAccess } from '../baobab/tenancy/access.js';
import { canonicalIdField } from '../baobab/identity/field.js';
import { canonicalAfterChangeHook, canonicalAfterDeleteHook } from '../baobab/events/hook.js';
import { CanonicalEventType } from '../baobab/events/types.js';
import { MediaAccessClass, MediaLifecycleState, DEFAULT_MEDIA_UPLOAD_POLICY } from '../baobab/media/policy.js';

/**
 * Governed media resource (ADR-0016). Payload owns editorial metadata;
 * the binary itself lives in external object storage via the S3-compatible
 * storage adapter configured in `payload.config.ts` (MinIO in development,
 * an S3-compatible bucket in production — see `.env.example`).
 *
 * `accessClass` defaults to PRIVATE: null/missing never means public
 * (ADR-0016 §20).
 */
const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    // The actual disk/S3 adapter is registered via the storage-s3 plugin
    // in payload.config.ts; this collection only declares upload
    // semantics and validation.
    mimeTypes: DEFAULT_MEDIA_UPLOAD_POLICY.allowedMimeTypes,
  },
  access: tenantScopedAccess({ writeCapability: 'content.media' }),
  hooks: {
    beforeValidate: [
      ({ req, data }) => {
        const size = req.file?.size;
        if (size !== undefined && size > DEFAULT_MEDIA_UPLOAD_POLICY.maxSizeBytes) {
          throw new Error(
            `File exceeds the maximum allowed size of ${DEFAULT_MEDIA_UPLOAD_POLICY.maxSizeBytes} bytes (ADR-0016 §38).`,
          );
        }
        return data;
      },
    ],
    afterChange: [
      canonicalAfterChangeHook<{
        id: string | number;
        canonicalEntityId?: string;
        lifecycleState?: string;
      }>({
        canonicalEntityType: 'MEDIA_ASSET',
        eventTypeFor: (operation, doc, previousDoc) => {
          if (operation === 'create') return CanonicalEventType.MEDIA_CREATED;
          if (doc.lifecycleState === 'PUBLISHED' && previousDoc?.lifecycleState !== 'PUBLISHED') {
            return CanonicalEventType.MEDIA_PUBLISHED;
          }
          if (doc.lifecycleState === 'QUARANTINED' && previousDoc?.lifecycleState !== 'QUARANTINED') {
            return CanonicalEventType.MEDIA_QUARANTINED;
          }
          return CanonicalEventType.MEDIA_UPDATED;
        },
      }),
    ],
    afterDelete: [
      canonicalAfterDeleteHook({
        canonicalEntityType: 'MEDIA_ASSET',
        eventTypeFor: () => CanonicalEventType.MEDIA_RETIRED,
      }),
    ],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'accessClass', 'lifecycleState', 'tenant'],
  },
  fields: [
    canonicalIdField({ name: 'canonicalMediaId', entityType: 'MEDIA_ASSET' }),
    tenantOwnedField(),
    sameTenantRelationshipField({ name: 'digitalEstate', relationTo: 'digital-estates', label: 'Digital estate' }),
    { name: 'title', type: 'text' },
    { name: 'altText', type: 'text', admin: { description: 'Accessibility metadata (ADR-0016 §45-46).' } },
    { name: 'caption', type: 'text' },
    { name: 'attribution', type: 'text' },
    {
      name: 'accessClass',
      type: 'select',
      required: true,
      defaultValue: MediaAccessClass.PRIVATE,
      options: Object.values(MediaAccessClass).map((value) => ({ label: value, value })),
      admin: { description: 'Explicit access policy (ADR-0016 §20). Never inferred from URL reachability.' },
    },
    {
      name: 'lifecycleState',
      type: 'select',
      required: true,
      defaultValue: MediaLifecycleState.UPLOADING,
      options: Object.values(MediaLifecycleState).map((value) => ({ label: value, value })),
      access: {
        // Only a privileged actor may move media out of quarantine.
        update: ({ req, siblingData }) => {
          const requested = (siblingData as { lifecycleState?: string } | undefined)?.lifecycleState;
          if (requested !== MediaLifecycleState.PUBLISHED) return true;
          return req.user?.platformAdministrator === true || (req.user?.editorialRoles ?? []).includes('PUBLISHER');
        },
      },
    },
    { name: 'rightsExpiry', type: 'date', admin: { description: 'ADR-0016 §48 — rights expiry.' } },
    {
      name: 'checksum',
      type: 'text',
      admin: { readOnly: true, description: 'Integrity checksum of the stored object (ADR-0016 §54).' },
    },
  ],
};

export default Media;
