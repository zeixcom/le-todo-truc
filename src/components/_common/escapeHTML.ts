export const html = (strings: TemplateStringsArray, ...values: string[]): string =>
	String.raw({ raw: strings }, ...values)
