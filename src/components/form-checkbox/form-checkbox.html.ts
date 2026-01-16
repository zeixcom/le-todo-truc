import { attr, html, type Tokens } from '../../html'

type FormCheckboxRenderProps = {
	classList?: Tokens
	label: string
}

export function FormCheckbox({ classList, label }: FormCheckboxRenderProps) {
	return html`<form-checkbox ${attr('class', classList)}>
		<label>
			<input type="checkbox" class="visually-hidden" />
			<span class="label">${label}</span>
		</label>
	</form-checkbox>`
}
