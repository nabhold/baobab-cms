/**
 * Suggested editorial role vocabulary (ADR-0017 §17-23). These are
 * Content-Engine roles, distinct from Platform Administration, which
 * belongs to the Control Plane (ADR-0017 §24, §16).
 */
export const EditorialRole = {
  VIEWER: 'VIEWER',
  AUTHOR: 'AUTHOR',
  EDITOR: 'EDITOR',
  REVIEWER: 'REVIEWER',
  PUBLISHER: 'PUBLISHER',
  CONTENT_ADMINISTRATOR: 'CONTENT_ADMINISTRATOR',
} as const;

export type EditorialRole = (typeof EditorialRole)[keyof typeof EditorialRole];

/** ADR-0017 §26 — governed permission vocabulary. */
export const Permission = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  REVIEW: 'review',
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish',
  ARCHIVE: 'archive',
  MANAGE_MEDIA: 'manage_media',
  MANAGE_NAVIGATION: 'manage_navigation',
  MANAGE_SCHEMA: 'manage_schema',
  ADMINISTER_CONTENT: 'administer_content',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Default role → permission mapping. This is policy, not an architectural
 * invariant — tenants MAY reconfigure it (ADR-0017 §69-71 workflow is
 * policy-driven), but publishing SHALL always remain distinct from editing
 * (ADR-0017 §72) and the default keeps that separation.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<EditorialRole, Permission[]> = {
  VIEWER: [Permission.READ],
  AUTHOR: [Permission.READ, Permission.CREATE, Permission.UPDATE],
  EDITOR: [
    Permission.READ,
    Permission.CREATE,
    Permission.UPDATE,
    Permission.DELETE,
    Permission.MANAGE_MEDIA,
    Permission.MANAGE_NAVIGATION,
  ],
  REVIEWER: [Permission.READ, Permission.REVIEW],
  PUBLISHER: [Permission.READ, Permission.PUBLISH, Permission.UNPUBLISH],
  CONTENT_ADMINISTRATOR: [
    Permission.READ,
    Permission.CREATE,
    Permission.UPDATE,
    Permission.DELETE,
    Permission.PUBLISH,
    Permission.UNPUBLISH,
    Permission.ARCHIVE,
    Permission.MANAGE_MEDIA,
    Permission.MANAGE_NAVIGATION,
    Permission.ADMINISTER_CONTENT,
  ],
};

/** ADR-0011 §35 — Baobab capability vocabulary the Content Engine registers. */
export const Capability = {
  CONTENT_MANAGEMENT: 'content.management',
  CONTENT_DELIVERY: 'content.delivery',
  CONTENT_LOCALISATION: 'content.localisation',
  CONTENT_MEDIA: 'content.media',
  CONTENT_SEO: 'content.seo',
  CONTENT_NAVIGATION: 'content.navigation',
  CONTENT_EDITORIAL_PRODUCT: 'content.editorial-product',
  CONTENT_PUBLISH: 'content.publish',
} as const;

export type Capability = (typeof Capability)[keyof typeof Capability];
