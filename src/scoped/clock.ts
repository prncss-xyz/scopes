import { useEffect, useSyncExternalStore } from 'react'

export function clock(period: number) {
	const subscribers = new Set<() => void>()
	let timer: number
	let time = 0
	function subscribe(cb: () => void) {
		if (subscribers.size === 0) {
			timer = setInterval(() => {
				time = Date.now()
				subscribers.forEach((cb) => cb())
			}, period)
		}
		subscribers.add(cb)
		return () => {
			subscribers.delete(cb)
			if (subscribers.size === 0) {
				clearInterval(timer)
			}
		}
	}
	function useClock() {
		useSyncExternalStore(subscribe, () => {
			if (time === 0) throw new Error('Clock not initialized yet')
			return time
		})
	}
	function useOnClock(onClock: (now: number) => void) {
		useEffect(() => subscribe(() => onClock(time)), [onClock])
	}
	return { useClock, useOnClock }
}
