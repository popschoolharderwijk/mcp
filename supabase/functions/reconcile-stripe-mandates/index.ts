import { handleReconcileStripeMandatesRequest } from './handler.ts';

Deno.serve((req) => handleReconcileStripeMandatesRequest(req));
