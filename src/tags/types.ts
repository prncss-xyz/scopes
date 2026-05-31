import {
	type OptionalUndefined,
	type Prettify,
	type ValueUnion,
} from '../types'

export const TYPE = 'type'
export type Type = typeof TYPE
export const PAYLOAD = 'payload'
export type Payload = typeof PAYLOAD

export type Tag<Type extends PropertyKey, Payload> = OptionalUndefined<{
	[PAYLOAD]: Payload
	[TYPE]: Type
}>

export type AnyTag = Tag<any, any>

export type TypeIn<T extends AnyTag> = T[Type]
export type TagOf<T extends AnyTag, Type extends TypeIn<T>> = Prettify<
	T & {
		[TYPE]: Type
	}
>

export type PayloadOf<T extends AnyTag, Type extends TypeIn<T>> = (T & {
	[TYPE]: Type
})[Payload]

export type Tags<O> = ValueUnion<{ [K in keyof O]: Tag<K, O[K]> }>

type NonUnderscore<S> = S extends `_${string}` ? never : S
export type PublicTag<E> = E extends { type: string }
	? E & { type: NonUnderscore<E['type']> }
	: E
