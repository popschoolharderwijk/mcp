// Processes a SEPA pain.002.001 status report from the bank and updates
// statuses on direct_debit_batch_items (and optionally the batch / mandates).
//
// Body (application/json):
//   {
//     "xml": "<Document...>...</Document>",   // required: raw pain.002 XML
//     "batch_id"?: "uuid"                      // optional: force batch when OrgnlMsgId does not match
//   }
//
// Auth: admin or site_admin.
//
// Mapping pain.002 TxSts -> direct_debit_batch_items.status:
//   ACSC / ACCC / ACSP / ACCP / ACWC  -> 'accepted'
//   RJCT                              -> 'rejected'
//   PDNG / other                      -> 'submitted' (leave as-is)
//
// When the success set is complete (>=1 item, all items accepted or reversed),
// the batch is set to 'closed'. Mandates with sequence_type 'FRST' that succeeded
// are promoted to 'RCUR' and first_used_at is set.

import { handleImportSepaStatusRequest } from './handler.ts';

Deno.serve(handleImportSepaStatusRequest);
