import type { OnMount, UnMount } from '../family'
import { exhaustive } from '../functions'
import { Store } from './store'

export function clock(period: number, onMount?: OnMount) {
	const subscribers = new Set<() => void>()
	let timer: number
	let time = 0
	let unmount: UnMount
	return new Store(
		exhaustive,
		(cb: () => void) => {
			if (subscribers.size === 0) {
				timer = setInterval(() => {
					time = Date.now()
					subscribers.forEach((cb) => cb())
				}, period)
				unmount = onMount?.()
			}
			subscribers.add(cb)
			return () => {
				subscribers.delete(cb)
				if (subscribers.size === 0) {
					unmount?.()
					clearInterval(timer)
				}
			}
		},
		() => time,
	)
}
