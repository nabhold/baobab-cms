import { RabbitMqEventDispatcher } from '../events/dispatcher.js';

const dispatcher = new RabbitMqEventDispatcher();

export const publishEntityEvent = async ({
  collection,
  doc,
  operation,
  req,
}: any) => {
  const user = req.user as { tenantID?: string; organisationID?: string; region?: string } | undefined;
  const payloadContext = req.payload as { tenantID?: string; organisationID?: string; region?: string } | undefined;

  const tenantID = user?.tenantID || payloadContext?.tenantID || doc?.tenantID || 'tenant-root';
  const organisationID = user?.organisationID || payloadContext?.organisationID || doc?.organisationID || 'org-root';
  const region = (doc?.region || user?.region || payloadContext?.region || 'GLOBAL') as string;

  const eventName = `payload.${collection?.slug || 'unknown'}.${operation}`;

  try {
    await dispatcher.publish(
      eventName,
      {
        id: doc?.id,
        slug: doc?.slug,
        title: doc?.title,
        ...doc,
      },
      {
        tenantID,
        organisationID,
        region,
      },
      {
        sourceService: 'payload-cms',
        sourceEntity: collection?.slug || 'unknown',
        action: operation === 'delete' ? 'delete' : operation === 'update' ? 'update' : 'create',
      },
    );
  } catch (error) {
    console.warn('Failed to publish Payload event', error);
  }

  return doc;
};
