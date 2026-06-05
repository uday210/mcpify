export function Skeleton({ className = '' }: { className?: string }) {
	return <div className={`skeleton ${className}`} />;
}

/** A grid of card-shaped skeletons for list loading states. */
export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
	return (
		<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="bg-white rounded-2xl border border-slate-200/70 p-5">
					<div className="flex items-center gap-3 mb-4">
						<Skeleton className="w-10 h-10 rounded-lg" />
						<div className="flex-1">
							<Skeleton className="h-4 w-2/3 mb-2" />
							<Skeleton className="h-3 w-1/3" />
						</div>
					</div>
					<Skeleton className="h-3 w-full mb-2" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			))}
		</div>
	);
}
