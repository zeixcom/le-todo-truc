type Tokens = string | number | boolean | null | undefined | Tokens[]

const val = (value: Tokens) =>
	typeof value === 'string'
		? value
		: typeof value === 'number'
			? String(value)
			: Array.isArray(value)
				? value.filter(Boolean).flat().join(' ')
				: ''

const html = (strings: TemplateStringsArray, ...values: Tokens[]) =>
	String.raw({ raw: strings }, ...values.map(val))

const attr = (name: string, tokens?: Tokens) => {
	if (tokens == null || tokens === false) return ''

	const value = val(tokens)
	return value === '' ? name : value ? `${name}="${value}"` : ''
}

export { attr, type Tokens, html }
