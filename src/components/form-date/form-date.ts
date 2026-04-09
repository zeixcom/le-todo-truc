import {
	type Component,
	defineComponent,
	on,
	read,
	setAttribute,
	setProperty,
	setText,
} from '@zeix/le-truc'

export type FormDateProps = {
	value: string
	error: string
}

type FormDateUI = {
	input: HTMLInputElement
	error?: HTMLElement
}

declare global {
	interface HTMLElementTagNameMap {
		'form-date': Component<FormDateProps>
	}
}

export default defineComponent<FormDateProps, FormDateUI>(
	'form-date',
	{
		value: read(ui => ui.input.value, ''),
		error: '',
	},
	({ first }) => ({
		input: first(
			'input[type="date"]',
			'Add a native date input as descendant element.',
		),
		error: first('.error'),
	}),
	ui => {
		const { host, error } = ui
		const errorId = error?.id

		return {
			input: [
				on('change', () => {
					ui.input.checkValidity()
					return {
						value: ui.input.value,
						error: ui.input.validationMessage,
					}
				}),
				setProperty('value'),
				setProperty('ariaInvalid', () => String(!!host.error)),
				setAttribute('aria-errormessage', () =>
					host.error && errorId ? errorId : null,
				),
			],
			error: setText('error'),
		}
	},
)
