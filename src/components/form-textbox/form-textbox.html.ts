import { type ClassList, classes, html } from '../../html'

type FormTextboxServerProps = {
	classList?: ClassList
	id: string
	name: string
	value?: string
	label: string
	required?: boolean
	autocomplete?: string
	clearable: boolean
	description?: string
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
}: FormTextboxServerProps) {
	return html`<form-textbox ${clearable && 'clearable'} ${classes(classList)}>
		<label for="${id}">${label}</label>
		<div class="input">
			<input
				type="text"
				id="${id}"
				name="${name}"
				${value && `value="${value}"`}
				${autocomplete && `autocomplete= "${autocomplete}"`}
				${required && 'required'}
				${description && `aria-describedby="${id}-description"`}
			/>
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
