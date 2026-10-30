// Create a Stripe billing flow for a lesson_agreement.
// Two modes:
//   - mode: 'checkout'  → Stripe Checkout in `setup` mode (iDEAL → reusable payment method);
//                         the schedule is created by the webhook on completion.
//   - mode: 'direct'    → Build the Subscription Schedule immediately on the
//                         customer's existing default payment method.
//
// Auth required. Allowed initiators: privileged staff/admin or the student themselves.
import { handleCreateSubscriptionCheckoutRequest } from './handler.ts';

Deno.serve((req) => handleCreateSubscriptionCheckoutRequest(req));
