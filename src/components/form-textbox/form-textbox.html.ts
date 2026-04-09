import { attr, html, type Tokens } from '../../html'

type FormTextboxRenderProps = {
	classList?: Tokens
	id: string
	name: string
	value?: string
	label: string
	required?: boolean
	autocomplete?: string
	clearable: boolean
	description?: string
	textarea?: boolean
	rows?: number
}

export function FormTextbox({
	classList,
	id,
	name,
	value,
	label,
	required,
	autocomplete,
	clearable,
	description,
	textarea,
	rows,
}: FormTextboxRenderProps) {
	return html`<form-textbox
		${attr('clearable', clearable)}
		${attr('class', classList)}
	>
		<label for="${id}">${label}</label>
		<div class="input">
			${textarea
			? html`<textarea
				id="${id}"
				name="${name}"
				${attr('rows', rows)}
				${attr('required', required)}
				${attr('aria-describedby', description && `${id}-description`)}
			>${value ?? ''}</textarea>`
			: html`<input
				type="text"
				id="${id}"
				name="${name}"
				${attr('value', value)}
				${attr('autocomplete', autocomplete)}
				${attr('required', required)}
				${attr('aria-describedby', description && `${id}-description`)}
			/>`}
			${clearable
			&& html`<button
				type="button"
				class="clear"
				aria-label="Clear input"
				hidden
			>
				✕
			</button>`}
		</div>
		<p class="error" role="alert" aria-live="assertive" id="${id}-error"></p>
		${description
		&& html`<p class="description" aria-live="polite" id="${id}-description">
			${description}
		</p>`}
	</form-textbox>`
}
