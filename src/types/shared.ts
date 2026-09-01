export type RegionCode = 'GLOBAL' | 'US' | 'EU' | 'ZA' | 'APAC' | string;

export interface SharedEventEnvelope<TPayload = Record<string, unknown>> {
  eventName: string;
  eventVersion: number;
  occurredAt: string;
  tenantID: string;
  organisationID: string;
  region: RegionCode;
  source: {
    service: string;
    entity: string;
    action: 'create' | 'update' | 'delete';
  };
  payload: TPayload;
}

export interface TenantScope {
  tenantID: string;
  organisationID: string;
  region?: RegionCode;
}
