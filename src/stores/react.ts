import { useEffect, useSyncExternalStore } from 'react'
import type { Store } from './store'

export function useStoreValue<
	Value,
	Args extends any[],
	Result,
	Select = Value,
>(store: Store<Value, Args, Result>, select?: (value: Value) => Select) {
	const peek = select
		? () => select(store.peek())
		: (store.peek.bind(store) as never)
	return useSyncExternalStore(store.subscribe.bind(store), peek)
}

export function useStoreOnChange<Value, Args extends any[], Result>(
	store: Store<Value, Args, Result>,
	onChange: (value: Value) => void,
) {
	useEffect(() => store.subscribe(() => onChange(store.peek())), [onChange])
}

export function useStore<Value, Args extends any[], Result>(
	store: Store<Value, Args, Result>,
) {
	return [useStoreValue(store), store.send.bind(store)] as const
}
