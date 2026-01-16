import { attr, html, type Tokens } from '../../html'

type BasicButtonVariant =
	| 'primary'
	| 'secondary'
	| 'tertiary'
	| 'constructive'
	| 'destructive'

type BasicButtonRenderProps = {
	classList?: Tokens
	type?: 'button' | 'submit'
	label: string
	ariaLabel?: string
	variant?: BasicButtonVariant | BasicButtonVariant[]
	size?: 'small' | 'medium' | 'large'
	badge?: string | boolean
	disabled?: boolean
}

export function BasicButton({
	classList,
	type,
	label,
	ariaLabel,
	variant,
	size,
	badge,
	disabled,
}: BasicButtonRenderProps) {
	return html`<basic-button ${attr('class', classList)}>
		<button
			type="${type || 'button'}"
			${attr('class', [variant, size])}
			${attr('disabled', disabled)}
			${attr('aria-label', ariaLabel)}
		>
			<span class="label">${label}</span>
			${badge && html`<span class="badge">${badge}</span>`}
		</button>
	</basic-button>`
}
