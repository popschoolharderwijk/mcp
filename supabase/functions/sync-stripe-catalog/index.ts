import { handleSyncStripeCatalogRequest } from './handler.ts';

Deno.serve((req) => handleSyncStripeCatalogRequest(req));
