import { inspect } from 'node:util';

const SAFE_FIELDS = ['date', 'candidateID', 'offerID', 'position', 'internalPositionName', 'details', 'source', 'test'];

/**
 * Describes a webhook payload for error reports without personal data.
 * Name, e-mail, phone, motivation text and CV links are left out on purpose: error reports go to a Slack channel.
 * The `details` link leads to the StartupJobs admin, which requires login.
 */
export const describePayload = (body: any): string => {
  if (!body || typeof body !== 'object') {
    return `(${body === null ? 'null' : typeof body} payload)`;
  }
  const safe: Record<string, unknown> = {};
  for (const field of SAFE_FIELDS) {
    if (body[field] !== undefined) {
      safe[field] = body[field];
    }
  }
  const omitted = Object.keys(body).filter((k) => !SAFE_FIELDS.includes(k));
  return `${inspect(safe)}\n(omitted: ${omitted.join(', ') || 'nothing'})`;
};
