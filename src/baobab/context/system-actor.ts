import type { ContextActor } from './resolve.js';

/**
 * A synthetic actor for trusted system code (seed scripts, migrations,
 * reconciliation jobs) calling the Payload Local API directly, where no
 * real authenticated `req.user` exists yet.
 *
 * Usage: `payload.create({ collection, data, user: SYSTEM_ACTOR, overrideAccess: true })`.
 * Payload's Local API attaches whatever `user` you pass to `req.user` for
 * that operation — it does not have to be a persisted document — so this
 * flows straight through `resolveContext`/`tryResolveContext` as an
 * explicit platform context (ADR-0012 §33: platform-wide jobs SHALL
 * explicitly declare platform scope; never inferred).
 */
export const SYSTEM_ACTOR: ContextActor = {
  id: 'system',
  canonicalActorId: 'system',
  platformAdministrator: true,
  capabilities: [],
};
