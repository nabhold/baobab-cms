export type {
  ExternalReference,
  MappingScope,
  CanonicalMapping,
} from './types.js';
export { MappingEngine, MappingLifecycleState, MappingProvenance } from './types.js';
export type { MappingResolver, CreateMappingInput } from './resolver.js';
export { MappingResolverUnavailableError, UnavailableMappingResolver, InMemoryMappingResolver } from './resolver.js';
export {
  isEntityTypeCompatible,
  detectAmbiguousMatch,
  isMappingActiveAt,
  assertMappingTenantCompatible,
  findOverlappingMappings,
} from './validation.js';
export type { OverlapCheckInput } from './validation.js';
