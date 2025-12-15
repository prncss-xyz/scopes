import { useEffect, useState } from 'react'
import './App.css'
import { useStore } from './stores/store'
import { collection } from './collection'
import { reducer } from './stores/reducer'

const red = collection(
	reducer,
	(n: number) => ({
		init: n,
		reduce: (a: number, b: number) => a + b,
		result: (n: number) => n * 2,
	}),
	Infinity,
)

function selector(n: number) {
	return n
}

function Reducer({ n }: { n: number }) {
	useEffect(() => red(n).onChange(console.log), [n])
	const [value, send] = useStore(red(n).map(selector))
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
