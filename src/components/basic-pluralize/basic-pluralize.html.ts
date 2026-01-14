import { classes, html } from '../../html'

type BasicPluralizeServerProps = {
	classList?: (string | undefined)[]
	count?: number
	lang?: string
	ordinal?: boolean
	content: string
}

export function BasicPluralize({
	classList,
	count,
	lang,
	ordinal,
	content,
}: BasicPluralizeServerProps) {
	return html`<basic-pluralize
		${count && `count=${count}`}
		${lang && `lang="${lang}"`}
		${ordinal && 'ordinal'}
		${classes(classList)}
	>
		${content}
	</basic-pluralize>`
}
