import { useEffect, useState } from 'react'
import './App.css'
import { createScopedStore } from './scoped/reducer'
import { useStore } from './scoped/store'

const reducer = createScopedStore(
	(n: number) => ({
		init: n,
		reduce: (a: number, b) => a + b,
		result: (n) => n * 2,
	}),
	Infinity,
)

function selector(n: number) {
	return n % 2
}

function Reducer({ n }: { n: number }) {
	useEffect(() => reducer(n).onChange(console.log), [n])
	const [value, send] = useStore(reducer(n).map(selector))
	return <button onClick={() => send(3)}>{value}</button>
}

function App() {
	const [n, setN] = useState(0)
	return (
		<>
			<div style={{ display: 'flex' }}>
				<button onClick={() => setN(n - 1)}>{'-'}</button>
				<div>{n}</div>
				<button onClick={() => setN(n + 1)}>{'+'}</button>
			</div>
			<Reducer n={n} />
		</>
	)
}

export default App
