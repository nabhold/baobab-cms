import type { Field } from 'payload';
import { issueCanonicalEntityId } from './canonical.js';

/**
 * The canonical identity field every canonicalisable collection carries
 * (ADR-0013 §5, §30). Server-assigned once on create, immutable afterwards
 * — a Payload ID, slug or title change never touches this value.
 */
export function canonicalIdField(params: { name?: string; entityType: string }): Field {
  return {
    name: params.name ?? 'canonicalEntityId',
    type: 'text',
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      readOnly: true,
      description: `Canonical ${params.entityType} identity (ADR-0013). Immutable once assigned; independent of the Payload id, slug and title.`,
    },
    access: {
      update: () => false,
    },
    hooks: {
      beforeChange: [
        ({ value, operation, originalDoc }) => {
          if (operation === 'create') {
            return value || issueCanonicalEntityId();
          }
          // Immutable on update — always keep the originally assigned value.
          return originalDoc?.[params.name ?? 'canonicalEntityId'] ?? value ?? issueCanonicalEntityId();
        },
      ],
    },
  };
}
