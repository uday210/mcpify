import type { Config } from 'tailwindcss'

const config: Config = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				primary: {
					50: '#f0f9ff',
					100: '#e0f2fe',
					200: '#bae6fd',
					300: '#7dd3fc',
					400: '#38bdf8',
					500: '#0ea5e9',
					600: '#0284c7',
					700: '#0369a1',
					800: '#075985',
					900: '#0c3d66',
				},
			},
			boxShadow: {
				card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.04)',
				lift: '0 10px 30px -12px rgb(2 132 199 / 0.18)',
			},
			animation: {
				'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'fade-in': 'fadeIn 0.18s ease-out',
				'slide-up': 'slideUp 0.22s ease-out',
				shimmer: 'shimmer 1.5s infinite',
			},
			keyframes: {
				fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
				slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
				shimmer: { '100%': { transform: 'translateX(100%)' } },
			},
		},
	},
	plugins: [],
}

export default config
