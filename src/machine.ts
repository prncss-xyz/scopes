// TODO: idle/disable

type Success<Data> = {
	data: Data
	fetching: boolean
	until: number
}

type Fetch<Data> =
	| { type: 'loading' | 'error' }
	| { type: 'succes'; payload: Success<Data> }



