'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PlaygroundPanel from '@/components/PlaygroundPanel';

export default function PlaygroundPage() {
	const { id } = useParams() as { id: string };
	const [server, setServer] = useState<any>(null);

	useEffect(() => {
		fetch(`/api/servers/${id}`).then((r) => r.json()).then(setServer).catch(() => {});
	}, [id]);

	return (
		<div className="max-w-3xl mx-auto">
			<Link href={`/dashboard/servers/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
				<ArrowLeft className="w-4 h-4" /> Back to server
			</Link>
			<PlaygroundPanel serverId={id} serverName={server?.name} className="h-[70vh]" />
			<p className="text-xs text-slate-400 mt-3">
				Uses your own connected LLM as the brain (set it under Settings → AI). Tool calls hit real upstream APIs.
			</p>
		</div>
	);
}
