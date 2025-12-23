import { Button, Card, Heading } from '@radix-ui/themes'
import { memoryStorage } from './stores/query/memory'
import { useStore } from './stores/react'
import { Suspense } from 'react'
import { query } from './stores/query'

const storage = query({
	ttl: Infinity,
	staleTime: Infinity,
	api: memoryStorage({
		getDefault: () => 'default',
		isDefault: (value) => value === 'default',
	}),
	suspend: true,
})

storage.observe((key, next, last) => console.log(key, next, last))

function Json({ children }: { children: unknown }) {
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

function Item({ prop }: { prop: string }) {
	const [raw, send] = useStore(storage.get(prop))
	// const value = raw.type === 'success' ? raw.payload.data : 'loading'
  const value = raw
	return (
		<Card>
			<Heading size='3'>{prop}</Heading>
			<Json>{value}</Json>
			<Button
				onClick={() =>
					send({
						type: 'update',
						payload: (value) => value + 'a',
					})
				}
			>
				+
			</Button>
		</Card>
	)
}

function App() {
	return (
		<Suspense>
			<Item prop='hello' />
			<Item prop='hello' />
			<Item prop='world' />
		</Suspense>
	)
}

export default App
