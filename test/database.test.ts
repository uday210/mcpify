import { describe, it, expect } from 'vitest';
import { isReadOnly } from '@/lib/connectors/database';

describe('isReadOnly (DB query guard)', () => {
	it('allows single SELECT / WITH / EXPLAIN', () => {
		expect(isReadOnly('SELECT * FROM users')).toBe(true);
		expect(isReadOnly('  with t as (select 1) select * from t  ')).toBe(true);
		expect(isReadOnly('EXPLAIN SELECT 1')).toBe(true);
		expect(isReadOnly('SELECT 1;')).toBe(true); // single trailing semicolon ok
	});

	it('blocks writes and DDL', () => {
		expect(isReadOnly('UPDATE users SET x=1')).toBe(false);
		expect(isReadOnly('DELETE FROM users')).toBe(false);
		expect(isReadOnly('INSERT INTO t VALUES (1)')).toBe(false);
		expect(isReadOnly('DROP TABLE users')).toBe(false);
		expect(isReadOnly('TRUNCATE t')).toBe(false);
	});

	it('blocks stacked statements (injection)', () => {
		expect(isReadOnly('SELECT 1; DROP TABLE users')).toBe(false);
		expect(isReadOnly('select * from t; delete from t')).toBe(false);
	});
});
