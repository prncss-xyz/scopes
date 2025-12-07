import { useSyncExternalStore } from 'react'
import type { Store } from './store'

export function useStoreValue<Value, Args extends any[], Result>(
	store: Store<Value, Args, Result>,
) {
	return useSyncExternalStore(
		store.subscribe.bind(store),
		store.peek.bind(store),
	)
}

export function useStore<Value, Args extends any[], Result>(
	store: Store<Value, Args, Result>,
) {
	return [useStoreValue(store), store.send.bind(store)] as const
}
