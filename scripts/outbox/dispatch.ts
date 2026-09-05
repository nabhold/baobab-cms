#!/usr/bin/env tsx
/**
 * Drains due outbox entries once. Intended to be run on a schedule
 * (cron/systemd timer/k8s CronJob) — see `docs/operations/runbooks.md`.
 *
 * Usage: npm run outbox:dispatch
 */
import { getPayload } from 'payload';
import config from '../../payload.config.js';
import { runOutboxDispatchCycle } from '../../src/baobab/outbox/dispatcher.js';
import { RabbitMqEventPublisher } from '../../src/baobab/events/rabbitmq-publisher.js';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const publisher = new RabbitMqEventPublisher();

  const result = await runOutboxDispatchCycle({ payload, publisher });
  payload.logger.info(result, 'Outbox dispatch cycle complete');

  if (result.deadLettered > 0) {
    payload.logger.warn(`${result.deadLettered} outbox entr${result.deadLettered === 1 ? 'y' : 'ies'} moved to FAILED_TERMINAL`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Outbox dispatch cycle failed', error);
  process.exit(1);
});
