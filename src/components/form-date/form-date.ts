import { bindText, defineComponent } from '@zeix/le-truc'

export type FormDateProps = {
	value: string
	error: string
}

declare global {
	interface HTMLElementTagNameMap {
		'form-date': HTMLElement & FormDateProps
	}
}

export default defineComponent<FormDateProps>(
	'form-date',
	({ expose, first, on, watch }) => {
		const input = first(
			'input[type="date"]',
			'Add a native date input as descendant element.',
		)
		const errorEl = first('.error')

		const errorId = errorEl?.id

		expose({
			value: input.value,
			error: '',
		})

		return [
			on(input, 'change', () => {
				input.checkValidity()
				return {
					value: input.value,
					error: input.validationMessage,
				}
			}),
			watch('value', value => {
				input.value = value
			}),
			watch('error', error => {
				input.ariaInvalid = String(!!error)
				if (error && errorId) input.setAttribute('aria-errormessage', errorId)
				else input.removeAttribute('aria-errormessage')
			}),
			errorEl && watch('error', bindText(errorEl)),
		]
	},
)
