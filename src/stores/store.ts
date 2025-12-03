import { useEffect, useSyncExternalStore } from 'react'

export function noRead(): never {
	throw new Error('Cannot read from a write-only store')
}

export function noWrite(..._: [never]): never {
	throw new Error('Cannot write to a read-only store')
}

export class Store<Value, Args extends any[], Result> {
	send
	subscribe
	peek
	constructor(
		send: (...args: Args) => Result,
		subscribe: (cb: () => void) => () => void,
		peek: () => Value,
	) {
		this.send = send
		this.subscribe = subscribe
		this.peek = peek
	}
	map<V>(mapper: (value: Value) => V): Store<V, Args, Result> {
		return new Store(this.send, this.subscribe, () => mapper(this.peek()))
	}
	chain<V, A extends any[], R>(
		fn: (value: Value) => Store<V, A, R>,
	): Store<V, A, R> {
		return new Store(
			(...args) => fn(this.peek()).send(...args),
			(cb) => fn(this.peek()).subscribe(cb),
			() => fn(this.peek()).peek(),
		)
	}
	onChange(cb: (value: Value) => void) {
		const event = () => cb(this.peek())
		const unsubscribe = this.subscribe(event)
		event()
		return unsubscribe
	}
	prop<Key extends keyof Value>(key: Key): Store<Value[Key], Args, Result> {
		return this.map((v) => v[key])
	}
	typed<
		Type extends Value extends { type: infer T; value: unknown } ? T : never,
	>(type: Type) {
		return this.map((s: any) =>
			s.type === type ? s.value : undefined,
		) as Store<
			Value extends { type: Type; value: infer V } ? V | undefined : never,
			Args,
			Result
		>
	}
}

export function useStore<Value, Args extends [any, ...any[]], Result>(
	atom: Store<Value, Args, Result>,
) {
	const { subscribe, peek, send } = atom
	const value = useSyncExternalStore(subscribe, peek)
	return [value, send] as const
}

export function useStoreEvents<Value, Args extends [any, ...any[]], Result>(
	atom: Store<Value, Args, Result>,
	onChange: (value: Value) => void,
) {
	useEffect(() => atom.onChange(onChange), [atom, onChange])
}

export function useStoreValue<Value, Args extends any[], Result>(
	atom: Store<Value, Args, Result>,
) {
	const { subscribe, peek } = atom
	return useSyncExternalStore(subscribe, peek)
}
