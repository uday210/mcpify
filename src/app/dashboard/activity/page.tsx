'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Activity as ActivityIcon, AlertTriangle, Percent, Gauge } from 'lucide-react';
import { Stat, CallsBarChart, CallsTable } from '@/components/monitor';

export default function ActivityPage() {
	const [data, setData] = useState<any>(null);
	const [auto, setAuto] = useState(true);
	const [loading, setLoading] = useState(true);

	const load = () =>
		fetch('/api/activity')
			.then((r) => r.json())
			.then((d) => setData(d))
			.catch(() => {})
			.finally(() => setLoading(false));

	useEffect(() => {
		load();
	}, []);

	useEffect(() => {
		if (!auto) return;
		const t = setInterval(load, 5000);
		return () => clearInterval(t);
	}, [auto]);

	const stats = data?.stats || { total: 0, errors: 0, errorRate: 0, avgLatency: 0 };
	const rows = data?.rows || [];

	return (
		<div>
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Activity</h1>
					<p className="text-slate-500 mt-1">Incoming MCP calls across all your servers.</p>
				</div>
				<button
					onClick={() => setAuto((a) => !a)}
					className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition ${
						auto ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
					}`}
				>
					<RefreshCw className={`w-4 h-4 ${auto ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
					{auto ? 'Live' : 'Paused'}
				</button>
			</div>

			{loading ? (
				<div className="text-center py-16">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-600" />
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<Stat label="Calls (recent)" value={stats.total} icon={ActivityIcon} />
						<Stat label="Errors" value={stats.errors} tone={stats.errors ? 'bad' : 'good'} icon={AlertTriangle} />
						<Stat label="Error rate" value={`${stats.errorRate}%`} tone={stats.errorRate > 10 ? 'bad' : 'default'} icon={Percent} />
						<Stat label="Avg latency" value={`${stats.avgLatency}ms`} icon={Gauge} />
					</div>

					<div className="mb-6">
						<CallsBarChart logs={rows} />
					</div>

					<div className="bg-white rounded-xl border border-slate-200 p-5">
						<h3 className="font-semibold text-slate-900 mb-3">Recent calls</h3>
						<CallsTable rows={rows} showServer />
					</div>
				</>
			)}
		</div>
	);
}
