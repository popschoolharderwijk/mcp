// Create a Stripe billing flow for a lesson_agreement.
// Modes:
//   - checkout → Stripe Checkout `setup` (iDEAL → reusable PM); webhook creates the schedule.
//   - complete → status-only after return; poll until webhook wrote stripe_schedule_id.
//   - direct   → build the Subscription Schedule on the customer's default payment method.
//
// Auth required. Allowed initiators: privileged staff/admin or the student themselves.
import { handleCreateSubscriptionCheckoutRequest } from './handler.ts';

Deno.serve((req) => handleCreateSubscriptionCheckoutRequest(req));
