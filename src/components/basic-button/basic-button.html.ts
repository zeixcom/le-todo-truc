import { classes, html } from '../../html'

type BasicButtonServerVariant =
	| 'primary'
	| 'secondary'
	| 'tertiary'
	| 'constructive'
	| 'destructive'

type BasicButtonServerProps = {
	classList?: (string | undefined)[]
	type?: 'button' | 'submit'
	label: string
	ariaLabel?: string
	variant?: BasicButtonServerVariant | BasicButtonServerVariant[]
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
}: BasicButtonServerProps) {
	return html`<basic-button ${classes(classList)}>
		<button
			type="${type || 'button'}"
			${classes([variant, size])}
			${disabled && 'disabled'}
			${ariaLabel && `aria-label="${ariaLabel}"`}
		>
			<span class="label">${label}</span>
			${badge && html`<span class="badge">${badge}</span>`}
		</button>
	</basic-button>`
}
