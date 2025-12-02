import { useSyncExternalStore } from 'react'

export function noRead(): never {
	throw new Error('Cannot read from a write-only store')
}

export function noWrite(..._: any[]): never {
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
	map<Result>(mapper: (value: Value) => Result) {
		return new Store(this.send, this.subscribe, () => mapper(this.peek()))
	}
  // TODO: flatten
	onChange(cb: (value: Value) => void) {
		return this.subscribe(() => cb(this.peek()))
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

export function useStoreValue<Value, Args extends any[], Result>(
	atom: Store<Value, Args, Result>,
) {
	const { subscribe, peek } = atom
	return useSyncExternalStore(subscribe, peek)
}
