// Generic transactional email sender. Loads template from `email_templates`
// by event_key, replaces {{variable}} placeholders, and sends via Resend.
//
// Auth: requires JWT (from a logged-in user) OR service-role (for server-side triggers
// from other edge functions). Anonymous calls are rejected.
//
// When template is missing: 404. On Resend error: 502 with message.
//
// Body: { event_key: string, to: string, vars?: Record<string, string> }

import { handleSendTemplateEmailRequest } from './handler.ts';

Deno.serve(handleSendTemplateEmailRequest);
