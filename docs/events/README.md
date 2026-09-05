# Canonical Events & the Transactional Outbox

Implements ADR-0018. See `docs/architecture/overview.md` §5 for the
mechanism.

## Emitting a canonical event from a new collection

```ts
import { canonicalAfterChangeHook, canonicalAfterDeleteHook } from '../baobab/events/hook.js';
import { CanonicalEventType } from '../baobab/events/types.js';

const MyCollection: CollectionConfig = {
  // ...
  hooks: {
    afterChange: [
      canonicalAfterChangeHook<{ id: string | number; canonicalEntityId?: string; status?: string }>({
        canonicalEntityType: 'MY_TYPE',
        eventTypeFor: (operation, doc, previousDoc) => {
          if (operation === 'create') return CanonicalEventType.CONTENT_CREATED;
          return CanonicalEventType.CONTENT_UPDATED;
        },
      }),
    ],
    afterDelete: [
      canonicalAfterDeleteHook({ canonicalEntityType: 'MY_TYPE', eventTypeFor: () => CanonicalEventType.CONTENT_RETIRED }),
    ],
  },
};
```

Do **not** call an `EventPublisher` or make any network call from a
collection hook. The hook's only job is deciding *whether* an event
applies and building its payload; `enqueueOutboxEvent` writes it durably
in the same transaction and returns.

## Running the dispatcher

```bash
npm run outbox:dispatch
```

This drains one batch (default 25) of due outbox rows and exits — it is
designed to be invoked on a schedule (cron, a Kubernetes CronJob, a
systemd timer), not run as a long-lived process. See
`docs/operations/runbooks.md`.

## Adding a new event type

Add it to `CanonicalEventType` (`src/baobab/events/types.ts`) using the
`noun.verb` / `noun.noun.verb` past-tense convention already established
(`content.published`, `content.product.updated`). Do not name an event
after a Payload hook or collection slug (ADR-0018 §13-14).

## Swapping the transport

`RabbitMqEventPublisher` (`src/baobab/events/rabbitmq-publisher.ts`) is
the only file in this codebase that imports `amqplib`. A different
transport (Kafka, SQS, a Control-Plane-provided event bus) is a new class
implementing `EventPublisher`'s one method (`publish(envelope)`),
substituted in `scripts/outbox/dispatch.ts`. Nothing else changes.

## Webhooks

`src/baobab/webhooks` provides HMAC signing/verification
(`signWebhookPayload`/`verifyWebhookSignature`) and an SSRF-guarded
delivery helper (`deliverWebhook`/`assertSafeWebhookUrl`) as a documented
transport a future outbound-webhook consumer of canonical events could
use. No tenant-configurable webhook-destination collection exists yet —
see the implementation report for why.
