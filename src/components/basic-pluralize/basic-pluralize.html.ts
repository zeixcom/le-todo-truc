import { attr, html, type Tokens } from '../../html'

type BasicPluralizeRenderProps = {
	classList?: Tokens
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
}: BasicPluralizeRenderProps) {
	return html`<basic-pluralize
		${attr('count', count)}
		${attr('lang', lang)}
		${attr('ordinal', ordinal)}
		${attr('class', classList)}
	>
		${content}
	</basic-pluralize>`
}
