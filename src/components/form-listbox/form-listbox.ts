import {
	asString,
	createElementsMemo,
	createMemo,
	createTask,
	defineComponent,
	each,
	escapeHTML,
	schedule,
} from '@zeix/le-truc'
import { highlightMatch } from '../_common/highlightMatch'
import { html } from '../_common/escapeHTML'

export type FormListboxOption = {
	value: string
	label: string
}

export type FormListboxProps = {
	value: string
	options: HTMLButtonElement[]
	filter: string
	src: string
}

declare global {
	interface HTMLElementTagNameMap {
		'form-listbox': HTMLElement & FormListboxProps
	}
}

/* === Constants === */

const ENTER_KEY = 'Enter'
const DECREMENT_KEYS = ['ArrowUp']
const INCREMENT_KEYS = ['ArrowDown']
const FIRST_KEY = 'Home'
const LAST_KEY = 'End'
const HANDLED_KEYS = [...DECREMENT_KEYS, ...INCREMENT_KEYS, FIRST_KEY, LAST_KEY]

export default defineComponent<FormListboxProps>(
	'form-listbox',
	({ all, expose, first, host, on, watch }) => {
		const input = first(
			'input[type="hidden"]',
			'Needed to store the selected value.',
		)
		const filterEl = first('input.filter')
		const clearBtn = first('button.clear')
		const loading = first('.loading')
		const errorEl = first('.error')
		const listbox = first(
			'[role="listbox"]',
			'Needed to display list of options.',
		)
		const options = all('button[role="option"]')

		const renderOptions = (items: FormListboxOption[]) =>
			items
				.map(
					item =>
						html`<button
							type="button"
							role="option"
							tabindex="-1"
							value="${escapeHTML(item.value)}"
						>
							${escapeHTML(item.label)}
						</button>`,
				)
				.join('')

		const content = createTask<{
			ok: boolean
			value: string
			error: string
			pending: boolean
		}>(
			async (_prev, abort) => {
				const url = host.src
				if (!url) return { ok: false, value: '', error: '', pending: false }
				try {
					const response = await fetch(url, { signal: abort })
					if (!response.ok) throw new Error(`HTTP ${response.status}`)
					const data = await response.json()
					const value = Array.isArray(data) ? renderOptions(data) : ''
					return { ok: true, value, error: '', pending: false }
				} catch (err) {
					return { ok: false, value: '', error: String(err), pending: false }
				}
			},
			{ value: { ok: false, value: '', error: '', pending: true } },
		)

		const lowerFilter = createMemo(() => host.filter.toLowerCase())

		const getVisibleOptions = () =>
			Array.from(
				listbox.querySelectorAll<HTMLButtonElement>(
					'button[role="option"]:not([hidden])',
				),
			)

		let focusIndex = getVisibleOptions().findIndex(
			option => option.ariaSelected === 'true',
		)

		expose({
			value: first('button[role="option"][aria-selected="true"]')?.value ?? '',
			options: createElementsMemo(
				listbox,
				'button[role="option"]:not([hidden])',
			),
			filter: '',
			src: asString(),
		})

		return [
			watch('value', value => {
				host.setAttribute('value', value)
				input.value = value
			}),
			on(filterEl, 'input', (_e, el) => ({ filter: el.value ?? '' })),
			clearBtn && [
				watch(lowerFilter, value => {
					clearBtn.hidden = !value
				}),
				on(clearBtn, 'click', () => ({ filter: '' })),
			],
			host.src && [
				watch(content, ({ ok, error, pending, value }) => {
					if (loading) loading.hidden = !pending
					if (errorEl) {
						errorEl.hidden = !error
						errorEl.textContent = error
					}
					listbox.hidden = !ok
					if (ok)
						schedule(listbox, () => {
							listbox.innerHTML = value
						})
				}),
			],
			on(listbox, 'click', ({ target }) => {
				const option = (target as HTMLElement).closest(
					'[role="option"]',
				) as HTMLButtonElement
				if (option && option.value !== host.value) {
					host.value = option.value
					input.dispatchEvent(new Event('change', { bubbles: true }))
				}
			}),
			on(listbox, 'keydown', e => {
				const { key } = e
				if (!HANDLED_KEYS.includes(key)) return

				const elements = getVisibleOptions()
				e.preventDefault()
				e.stopPropagation()
				if (key === FIRST_KEY) focusIndex = 0
				else if (key === LAST_KEY) focusIndex = elements.length - 1
				else
					focusIndex =
						(focusIndex
							+ (INCREMENT_KEYS.includes(key) ? 1 : -1)
							+ elements.length)
						% elements.length
				elements[focusIndex]?.focus()
			}),
			on(listbox, 'keyup', ({ key }) => {
				if (key !== ENTER_KEY) return
				getVisibleOptions()[focusIndex]?.click()
			}),
			each(options, option => {
				const textContent = option.textContent ?? ''
				const lowerText = textContent.trim().toLowerCase()
				return [
					watch(lowerFilter, filterText => {
						option.hidden = !lowerText.includes(filterText)
						option.innerHTML = highlightMatch(textContent, filterText)
					}),
					watch('value', () => {
						const isSelected = host.value === option.value
						option.tabIndex = isSelected ? 0 : -1
						option.ariaSelected = String(isSelected)
					}),
				]
			}),
		]
	},
)
