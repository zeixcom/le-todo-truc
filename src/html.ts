type ClassList = (string | string[] | undefined)[]

const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
	String.raw(
		{ raw: strings },
		...values.map(value =>
			typeof value === 'string'
				? value
				: typeof value === 'number'
					? value.toString()
					: Array.isArray(value)
						? value.filter(Boolean).flat().join(' ')
						: '',
		),
	)

const classes = (tokens?: ClassList) => {
	const className = Array.isArray(tokens)
		? tokens.filter(Boolean).flat().join(' ')
		: ''
	return className ? `class="${className}"` : ''
}

export { type ClassList, html, classes }
