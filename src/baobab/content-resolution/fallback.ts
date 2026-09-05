import type { ResolutionPolicy } from './types.js';

/**
 * Flattens the configured locale-fallback graph into a deterministic,
 * cycle-safe visitation order (ADR-0014 §25-27). Fallback is never
 * inferred from language similarity — only from `policy.localeFallback`.
 */
export function resolveLocaleChain(locale: string, policy: ResolutionPolicy): string[] {
  const chain: string[] = [locale];
  const visited = new Set<string>([locale]);
  const queue = [...(policy.localeFallback?.[locale] ?? [])];

  while (queue.length > 0) {
    const next = queue.shift() as string;
    if (visited.has(next)) continue;
    visited.add(next);
    chain.push(next);
    queue.push(...(policy.localeFallback?.[next] ?? []));
  }

  return chain;
}
