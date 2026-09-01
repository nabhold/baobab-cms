import amqp from 'amqplib';
import type { SharedEventEnvelope, TenantScope } from '../types/shared.js';

export interface EventDispatcher {
  publish<TPayload = Record<string, unknown>>(
    eventName: string,
    payload: TPayload,
    context: TenantScope,
    options?: { sourceService?: string; sourceEntity?: string; action?: 'create' | 'update' | 'delete' },
  ): Promise<void>;
}

export class RabbitMqEventDispatcher implements EventDispatcher {
  private readonly connectionUrl: string;
  private readonly queueName: string;

  constructor(connectionUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672', queueName = 'baobab.events') {
    this.connectionUrl = connectionUrl;
    this.queueName = queueName;
  }

  async publish<TPayload = Record<string, unknown>>(
    eventName: string,
    payload: TPayload,
    context: TenantScope,
    options: { sourceService?: string; sourceEntity?: string; action?: 'create' | 'update' | 'delete' } = {},
  ): Promise<void> {
    const envelope: SharedEventEnvelope<TPayload> = {
      eventName,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      tenantID: context.tenantID,
      organisationID: context.organisationID,
      region: context.region || 'GLOBAL',
      source: {
        service: options.sourceService || 'payload-cms',
        entity: options.sourceEntity || 'unknown',
        action: options.action || 'create',
      },
      payload,
    };

    const connection = await amqp.connect(this.connectionUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(this.queueName, { durable: true });
    await channel.sendToQueue(this.queueName, Buffer.from(JSON.stringify(envelope)), {
      persistent: true,
    });

    await channel.close();
    await connection.close();
  }
}

export class KafkaCompatibleEventDispatcher implements EventDispatcher {
  async publish<TPayload = Record<string, unknown>>(
    eventName: string,
    payload: TPayload,
    context: TenantScope,
    options: { sourceService?: string; sourceEntity?: string; action?: 'create' | 'update' | 'delete' } = {},
  ): Promise<void> {
    const envelope: SharedEventEnvelope<TPayload> = {
      eventName,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      tenantID: context.tenantID,
      organisationID: context.organisationID,
      region: context.region || 'GLOBAL',
      source: {
        service: options.sourceService || 'payload-cms',
        entity: options.sourceEntity || 'unknown',
        action: options.action || 'create',
      },
      payload,
    };

    await Promise.resolve(envelope);
    throw new Error('Kafka adapter is not implemented yet. Swap in a Kafka producer client behind this interface without changing hook code.');
  }
}
