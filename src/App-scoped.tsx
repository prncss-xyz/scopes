import './App.css'
import { createScopedValue } from './scoped/recursive'
import { useStoreValue } from './scoped/store'

const toto = createScopedValue(() => Math.random() * 10000)
const rando = createScopedValue(
	(readScope, _r: number, _s: number) => Math.random() + readScope(toto),
)

function Elem({ r, s }: { r: number; s: number }) {
	const v = useStoreValue(rando(r, s))
	return <div>{v}</div>
}

function App() {
	return (
		<>
			<Elem r={1} s={1} />
			<Elem r={1} s={2} />
			<Elem r={1} s={1} />
		</>
	)
}

export default App
