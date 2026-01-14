import { type ClassList, classes, html } from '../../html'

type FormCheckboxServerProps = {
	classList?: ClassList
	label: string
}

export function FormCheckbox({ classList, label }: FormCheckboxServerProps) {
	return html`<form-checkbox ${classes(classList)}>
		<label>
			<input type="checkbox" class="visually-hidden" />
			<span class="label">${label}</span>
		</label>
	</form-checkbox>`
}
