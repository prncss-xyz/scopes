import { Card, Heading } from '@radix-ui/themes'
import { memoryStorage } from './stores/query/memory'
import { useStoreValue } from './stores/react'
import { Suspense, use } from 'react'

const storage = memoryStorage({
	ttl: Infinity,
	staleTime: Infinity,
	getDefault: () => 'default',
	isDefault: (value) => value === 'default',
	delay: 1000,
})

storage.observe((key, next, last) => console.log(key, next, last))

function Json({ children }: { children: unknown }) {
	return <pre>{JSON.stringify(children, null, 2)}</pre>
}

function Suspended({ prop }: { prop: string }) {
	const pro = useStoreValue(storage.suspend(prop))
	const value = use(pro)
	return (
		<Card>
			<Heading size='3'>{prop}</Heading>
			<Json> {value} </Json>
		</Card>
	)
}

function Item({ prop }: { prop: string }) {
	const value = useStoreValue(storage.get(prop))
	return (
		<Card>
			<Heading size='3'>{prop}</Heading>
			<Json>{value}</Json>
		</Card>
	)
}

function App() {
	return (
		<div>
			<Item prop='hello' />
			<Suspense>
				<Suspended prop='hello' />
			</Suspense>
			<Item prop='world' />
		</div>
	)
}

export default App
