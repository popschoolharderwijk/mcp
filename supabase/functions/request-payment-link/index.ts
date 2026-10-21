// Public: "Stuur me een nieuwe link". Always answers with the same message; never creates
// accounts; only mails when the address belongs to an agreement that waits for a mandate.
import { servePublicJsonPost } from '../_shared/http-serve.ts';
import { handleRequestPaymentLink } from './handler.ts';

servePublicJsonPost(handleRequestPaymentLink);
