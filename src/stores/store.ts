import { useEffect, useSyncExternalStore } from 'react'
import type { OnMount, Unmount } from '../family'

export function noRead(): never {
	throw new Error('Cannot read from a write-only store')
}

export function noWrite(..._: [never]): never {
	throw new Error('Cannot write to a read-only store')
}

interface IStore<Value, Args extends any[], Result> {
	send(...args: Args): Result
	subscribe(cb: () => void): () => void
	peek(): Value
}

export abstract class Store<Value, Args extends any[], Result>
	implements IStore<Value, Args, Result>
{
	private uOnmount
	private uUnmount: Unmount = undefined
	abstract send(...args: Args): Result
	abstract subscribe(cb: () => void): () => void
	abstract peek(): Value
	constructor(onMount?: OnMount) {
		this.uOnmount = onMount
	}
	protected mount(): Unmount {
		this.uUnmount = this.uOnmount?.()
	}
	protected unmount() {
		this.uUnmount?.()
	}
	map<V>(mapper: (value: Value) => V) {
		return new MappedStore(this, mapper)
	}
	chain<V, A extends any[], R>(chainer: (value: Value) => Store<V, A, R>) {
		return new ChainedStore<Value, V, A, R>(this, chainer)
	}
	prop<Key extends keyof Value>(key: Key) {
		return this.map((v) => v[key])
	}
	// TODO: test this type
	typed<
		TargetType extends Value extends { type: infer T; value: unknown }
			? T
			: never,
		TargetValue = Value extends { type: TargetType; value: infer V }
			? { type: TargetType; value: V }
			: never,
	>(
		type: TargetType,
	): Store<
		(
			[Value] extends [TargetValue]
				? [TargetValue] extends [Value]
					? true
					: false
				: false
		) extends true
			? TargetValue extends { value: infer V }
				? V
				: never
			: TargetValue extends { value: infer V }
				? V | undefined
				: never,
		Args,
		Result
	> {
		return this.map<
			(
				[Value] extends [TargetValue]
					? [TargetValue] extends [Value]
						? true
						: false
					: false
			) extends true
				? TargetValue extends { value: infer V }
					? V
					: never
				: TargetValue extends { value: infer V }
					? V | undefined
					: never
		>((s: any) => (s?.type === type ? s.value : undefined))
	}
}

class MappedStore<Value, V, Args extends any[], Result> extends Store<
	V,
	Args,
	Result
> {
	private store
	private mapper
	constructor(store: Store<Value, Args, Result>, mapper: (value: Value) => V) {
		super()
		this.store = store
		this.mapper = mapper
	}
	send(...args: Args): Result {
		return this.store.send(...args)
	}
	subscribe(cb: () => void): () => void {
		return this.store.subscribe(cb)
	}
	peek(): V {
		return this.mapper(this.store.peek())
	}
}

class ChainedStore<Value, V, A extends any[], R> extends Store<V, A, R> {
	private store: Store<Value, any, any>
	private chainer: (value: Value) => Store<V, A, R>
	constructor(
		store: Store<Value, any, any>,
		chainer: (value: Value) => Store<V, A, R>,
	) {
		super()
		this.store = store
		this.chainer = chainer
	}
	private getInnerStore(): Store<V, A, R> {
		return this.chainer(this.store.peek())
	}
	send(...args: A): R {
		return this.getInnerStore().send(...args)
	}
	subscribe(cb: () => void): () => void {
		return this.getInnerStore().subscribe(cb)
	}
	peek(): V {
		return this.getInnerStore().peek()
	}
}

export function useStore<Value, Args extends [any, ...any[]], Result>(
	atom: IStore<Value, Args, Result>,
) {
	const { subscribe, peek, send } = atom
	const value = useSyncExternalStore(subscribe, peek)
	return [value, send] as const
}

export function withOnChange<Value, Args extends any[], Result>(
	atom: IStore<Value, Args, Result>,
	cb: (value: Value) => void,
) {
	const event = () => cb(atom.peek())
	const unsubscribe = atom.subscribe(event)
	event()
	return unsubscribe
}

export function useStoreEvents<Value, Args extends [any, ...any[]], Result>(
	atom: IStore<Value, Args, Result>,
	onChange: (value: Value) => void,
) {
	useEffect(() => withOnChange(atom, onChange), [atom, onChange])
}

export function useStoreValue<Value, Args extends any[], Result>(
	atom: IStore<Value, Args, Result>,
) {
	const { subscribe, peek } = atom
	return useSyncExternalStore(subscribe, peek)
}
