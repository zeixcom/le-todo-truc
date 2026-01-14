import { type ClassList, classes, html } from '../../html'

type FormRadiobuttonServerProps = {
	name: string
	value: string
	label: string
	checked: boolean
	controlsHidden: boolean
}

type FormRadiogroupServerProps = {
	classList?: ClassList
	legend: string
	legendHidden: boolean
	name: string
	options: Record<string, string>
	selected: string
	controlsHidden: boolean
}

function FormRadiobutton({
	name,
	value,
	label,
	checked,
	controlsHidden,
}: FormRadiobuttonServerProps) {
	return html`<label ${checked && `class= "selected"`}>
		<input
			type="radio"
			${controlsHidden && 'class="visually-hidden"'}
			name="${name}"
			value="${value}"
			${checked && 'checked'}
		/>
		<span>${label}</span>
	</label>`
}

export function FormRadiogroup({
	classList,
	legend,
	legendHidden,
	name,
	options,
	selected,
	controlsHidden,
}: FormRadiogroupServerProps) {
	return html`<form-radiogroup ${classes(classList)}>
		<fieldset>
			<legend ${legendHidden && `class="visually-hidden"`}>${legend}</legend>
			${Object.entries(options)
				.map(([value, label]) =>
					FormRadiobutton({
						name,
						value,
						label,
						checked: selected === value,
						controlsHidden,
					}),
				)
				.join('')}
		</fieldset>
	</form-radiogroup>`
}
