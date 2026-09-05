export type JsonSerializable =
  | string
  | number
  | boolean
  | null
  | JsonSerializable[]
  | { [key: string]: JsonSerializable };

export interface AuditEntry {
  actorId: string;
  tenantId?: string;
  legalEntityId?: string;
  digitalEstateId?: string;
  marketId?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  outcome: 'ALLOWED' | 'DENIED';
  correlationId?: string;
  previousState?: JsonSerializable;
  resultingState?: JsonSerializable;
}
