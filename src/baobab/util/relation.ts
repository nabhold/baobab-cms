/**
 * Payload relationship fields resolve to either a bare id or a populated
 * document depending on `depth`. This normalises both shapes.
 */
export function extractRelationId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    const id = (value as Record<string, unknown>).id;
    return id === undefined || id === null ? undefined : String(id);
  }
  return undefined;
}
