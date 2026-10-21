// Public: details for the fixed payment link page (/direct-debit/start?agreement=&t=).
// Only lesson data and amounts are returned; no other personal data.
import { servePublicJsonPost } from '../_shared/http-serve.ts';
import { handlePaymentLinkInfo } from './handler.ts';

servePublicJsonPost(handlePaymentLinkInfo);
