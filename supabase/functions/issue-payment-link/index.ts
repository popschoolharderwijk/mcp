import { handleIssuePaymentLinkRequest } from './handler.ts';

Deno.serve((req) => handleIssuePaymentLinkRequest(req));
