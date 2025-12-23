export function Json({ children }: { children: unknown }) {
	const safe = (value: unknown) => {
		try {
			const seen = new WeakSet<object>()
			return JSON.stringify(
				value,
				(_k, v) => {
					if (typeof v === 'object' && v !== null) {
						if (seen.has(v as object)) return '[Circular]'
						seen.add(v as object)
					}
					if (typeof v === 'function') return v.toString()
					return v
				},
				2,
			)
		} catch {
			return String(value)
		}
	}
	return <pre>{safe(children)}</pre>
}
