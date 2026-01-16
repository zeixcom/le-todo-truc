import { attr, html, type Tokens } from '../../html'

type FormRadiobuttonRenderProps = {
	name: string
	value: string
	label: string
	checked: boolean
	controlsHidden: boolean
}

type FormRadiogroupRenderProps = {
	classList?: Tokens
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
}: FormRadiobuttonRenderProps) {
	return html`<label ${checked && `class="selected"`}>
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
}: FormRadiogroupRenderProps) {
	return html`<form-radiogroup ${attr('class', classList)}>
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
