'use client';

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang="en">
			<body style={{ fontFamily: 'system-ui, sans-serif' }}>
				<div
					style={{
						minHeight: '100vh',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: '#f8fafc',
					}}
				>
					<div style={{ textAlign: 'center' }}>
						<h1 style={{ fontSize: 24, fontWeight: 600, color: '#0f172a' }}>
							Something went wrong
						</h1>
						<p style={{ color: '#64748b', marginTop: 8 }}>An unexpected error occurred.</p>
						<button
							onClick={() => reset()}
							style={{
								marginTop: 24,
								padding: '10px 20px',
								background: '#0891b2',
								color: 'white',
								border: 'none',
								borderRadius: 8,
								cursor: 'pointer',
							}}
						>
							Try again
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}
