import amqp from 'amqplib';
import type { EventPublisher } from './publisher.js';
import type { CanonicalEventEnvelope } from './types.js';

/**
 * Production `EventPublisher` used only by the outbox dispatcher worker
 * (`scripts/outbox/dispatch.ts`) — never called synchronously from a
 * request/hook (ADR-0018 §61-63, §105-106). The broker is an
 * implementation detail; nothing outside this file depends on amqplib.
 */
export class RabbitMqEventPublisher implements EventPublisher {
  private readonly connectionUrl: string;
  private readonly queueName: string;

  constructor(
    connectionUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    queueName = process.env.BAOBAB_EVENTS_QUEUE || 'baobab.canonical-events',
  ) {
    this.connectionUrl = connectionUrl;
    this.queueName = queueName;
  }

  async publish(envelope: CanonicalEventEnvelope): Promise<void> {
    const connection = await amqp.connect(this.connectionUrl);
    try {
      const channel = await connection.createChannel();
      await channel.assertQueue(this.queueName, { durable: true });
      channel.sendToQueue(this.queueName, Buffer.from(JSON.stringify(envelope)), {
        persistent: true,
        messageId: envelope.eventId,
        contentType: 'application/json',
      });
      await channel.close();
    } finally {
      await connection.close();
    }
  }
}
