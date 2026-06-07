import { Client } from 'pg';
import { decryptCredentials } from '@/lib/encryption';
import type { GeneratedTool } from '@/lib/connectors/openapi-to-mcp';

// Postgres database connector. Tools are executed directly against the DB (not
// via the HTTP proxy). All access is read-only and bounded.

const MAX_ROWS = 200;
const STATEMENT_TIMEOUT_MS = 15000;

export const DATABASE_TOOLS: GeneratedTool[] = [
	{
		name: 'list_tables',
		description: 'List tables (and views) in the database with their schema.',
		input_schema: { type: 'object', properties: {} },
		http_method: 'GET',
		path_template: '/',
		param_map: [],
	},
	{
		name: 'describe_table',
		description: 'List a table’s columns, types and nullability.',
		input_schema: {
			type: 'object',
			properties: {
				table: { type: 'string', description: 'Table name' },
				schema: { type: 'string', description: 'Schema (default: public)' },
			},
			required: ['table'],
		},
		http_method: 'GET',
		path_template: '/',
		param_map: [],
	},
	{
		name: 'run_query',
		description: `Run a READ-ONLY SQL query (SELECT/WITH/EXPLAIN only). Returns up to ${MAX_ROWS} rows.`,
		input_schema: {
			type: 'object',
			properties: { sql: { type: 'string', description: 'A single read-only SQL statement' } },
			required: ['sql'],
		},
		http_method: 'POST',
		path_template: '/',
		param_map: [],
	},
];

export interface DbResult {
	content: Array<{ type: 'text'; text: string }>;
	isError: boolean;
}

function connString(connection: any): string {
	const creds = connection.credentials ? decryptCredentials(connection.credentials) : {};
	return creds.value || creds.connection_string || '';
}

function makeClient(cs: string): Client {
	const local = /@(localhost|127\.0\.0\.1)/.test(cs);
	return new Client({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
}

export function isReadOnly(sql: string): boolean {
	const s = sql.trim().replace(/;+\s*$/, ''); // allow a single trailing semicolon
	if (s.includes(';')) return false; // no multiple statements
	return /^(select|with|explain|show|table|values)\b/i.test(s);
}

/** Verify a database connection (SELECT 1). */
export async function pingDatabase(connection: any): Promise<{ ok: boolean; warn?: boolean; status: number; message: string }> {
	const cs = connString(connection);
	if (!cs) return { ok: false, status: 0, message: 'No connection string configured' };
	const client = makeClient(cs);
	try {
		await client.connect();
		await client.query('SELECT 1');
		return { ok: true, status: 200, message: 'Verified — database reachable' };
	} catch (err: any) {
		return { ok: false, status: 0, message: err?.message || 'Could not connect' };
	} finally {
		await client.end().catch(() => {});
	}
}

/** Execute a database tool. */
export async function executeDbTool(connection: any, tool: { name: string }, args: Record<string, any>): Promise<DbResult> {
	const cs = connString(connection);
	if (!cs) return errResult('Connection has no database connection string.');

	const client = makeClient(cs);
	try {
		await client.connect();
		await client.query(`SET statement_timeout = ${STATEMENT_TIMEOUT_MS}`);

		if (tool.name === 'list_tables') {
			const r = await client.query(
				`SELECT table_schema, table_name, table_type FROM information_schema.tables
				 WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2`
			);
			return ok(r.rows);
		}

		if (tool.name === 'describe_table') {
			if (!args.table) return errResult('Missing required argument: table');
			const r = await client.query(
				`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
				 WHERE table_name = $1 AND table_schema = $2 ORDER BY ordinal_position`,
				[args.table, args.schema || 'public']
			);
			if (!r.rows.length) return errResult(`Table not found: ${args.schema || 'public'}.${args.table}`);
			return ok(r.rows);
		}

		if (tool.name === 'run_query') {
			const sql = String(args.sql || '');
			if (!sql.trim()) return errResult('Missing required argument: sql');
			if (!isReadOnly(sql)) return errResult('Only a single read-only statement (SELECT/WITH/EXPLAIN) is allowed.');
			await client.query('BEGIN TRANSACTION READ ONLY');
			try {
				const r = await client.query(sql);
				const rows = r.rows.slice(0, MAX_ROWS);
				const note = r.rows.length > MAX_ROWS ? `\n\n(${r.rows.length} rows; showing first ${MAX_ROWS})` : '';
				return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) + note }], isError: false };
			} finally {
				await client.query('ROLLBACK').catch(() => {});
			}
		}

		return errResult(`Unknown database tool: ${tool.name}`);
	} catch (err: any) {
		return errResult(err?.message || 'Query failed');
	} finally {
		await client.end().catch(() => {});
	}
}

function ok(rows: any[]): DbResult {
	return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }], isError: false };
}
function errResult(message: string): DbResult {
	return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}
