// Composite tools: a single MCP tool that runs several existing tools in
// sequence, piping earlier outputs into later inputs via {{...}} templates.
//
// Token grammar inside step args:
//   {{input.NAME}}       -> the composite tool's own argument NAME
//   {{stepN}}            -> step N's result (parsed JSON if possible, else text)
//   {{stepN.a.b}}        -> dot-path into step N's parsed JSON result
// A value that is exactly one token yields the raw resolved value (so you can
// pipe a whole object); otherwise tokens are string-interpolated.

export interface CompositeStep {
	tool: string;
	args: Record<string, any>;
}

export interface CompositeCtx {
	input: Record<string, any>;
	steps: Array<{ text: string; json: any }>;
}

export function resolvePath(obj: any, path: string): any {
	if (obj == null) return undefined;
	return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function resolveToken(expr: string, ctx: CompositeCtx): any {
	const e = expr.trim();
	if (e.startsWith('input.')) return resolvePath(ctx.input, e.slice('input.'.length));
	const m = e.match(/^step(\d+)(?:\.(.+))?$/);
	if (m) {
		const idx = parseInt(m[1], 10) - 1;
		const step = ctx.steps[idx];
		if (!step) return undefined;
		const base = step.json !== undefined && step.json !== null ? step.json : step.text;
		return m[2] ? resolvePath(step.json, m[2]) : base;
	}
	return undefined;
}

const SINGLE_TOKEN = /^\{\{\s*([^}]+?)\s*\}\}$/;
const ANY_TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;

export function renderValue(value: any, ctx: CompositeCtx): any {
	if (typeof value !== 'string') return value;
	const single = value.match(SINGLE_TOKEN);
	if (single) {
		const resolved = resolveToken(single[1], ctx);
		return resolved === undefined ? '' : resolved;
	}
	return value.replace(ANY_TOKEN, (_, expr) => {
		const r = resolveToken(expr, ctx);
		if (r === undefined || r === null) return '';
		return typeof r === 'object' ? JSON.stringify(r) : String(r);
	});
}

export function buildStepArgs(stepArgs: Record<string, any>, ctx: CompositeCtx): Record<string, any> {
	const out: Record<string, any> = {};
	for (const [k, v] of Object.entries(stepArgs || {})) out[k] = renderValue(v, ctx);
	return out;
}
