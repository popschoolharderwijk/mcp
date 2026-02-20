import { createClientAs } from '../db';
import type { DatabaseRpcFunction } from '../types';
import { unwrap } from '../utils';
import type { TestUser } from './test-users';

/**
 * Call RPC and return result (unwrapped).
 */
export async function callRpc(user: TestUser, fnName: DatabaseRpcFunction, params: Record<string, unknown>) {
	const db = await createClientAs(user);
	const result = await db.rpc(fnName, params);
	return unwrap(result);
}
