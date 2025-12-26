import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	test: {
		includeSource: ['src/**/*.{js,ts}'],
	},
	define: {
		'import.meta.vitest': 'undefined',
	},
	plugins: [
		react({
			babel: {
				plugins: [['babel-plugin-react-compiler']],
			},
		}),
	],
})
