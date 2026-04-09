import {
	asString,
	type Component,
	createEffect,
	createElementsMemo,
	createMemo,
	createTask,
	dangerouslySetInnerHTML,
	defineComponent,
	type Memo,
	on,
	read,
	setAttribute,
	setProperty,
	setText,
	show,
} from '@zeix/le-truc'
import { escapeHTML, html } from '../_common/escapeHTML'
import { highlightMatch } from '../_common/highlightMatch'
import { manageFocus } from '../_common/focus'

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

type FormListboxUI = {
	input: HTMLInputElement
	listbox: HTMLElement
	options: Memo<HTMLButtonElement[]>
	filter?: HTMLInputElement | undefined
	clear?: HTMLButtonElement | undefined
	loading?: HTMLElement | undefined
	error?: HTMLElement | undefined
}

declare global {
	interface HTMLElementTagNameMap {
		'form-listbox': Component<FormListboxProps>
	}
}

export default defineComponent<FormListboxProps, FormListboxUI>(
	'form-listbox',
	{
		value: read(
			({ listbox }: FormListboxUI) =>
				listbox.querySelector<HTMLButtonElement>(
					'button[role="option"][aria-selected="true"]',
				)?.value,
			'',
		),
		options: ({ listbox }: FormListboxUI) =>
			createElementsMemo(listbox, 'button[role="option"]:not([hidden])'),
		filter: '',
		src: asString(),
	},
	({ first, all }) => ({
		input: first('input[type="hidden"]', 'Needed to store the selected value.'),
		filter: first('input.filter'),
		clear: first('button.clear'),
		loading: first('.loading'),
		error: first('.error'),
		listbox: first('[role="listbox"]', 'Needed to display list of options.'),
		options: all('button[role="option"]'),
	}),
	ui => {
		const { host, input } = ui

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

		const maybeRender = () =>
			host.src
				? [
						show(() => content.get().ok),
						dangerouslySetInnerHTML(() => content.get().value),
					]
				: []

		const lowerFilter = createMemo(() => host.filter.toLowerCase())

		return {
			host: setAttribute('value'),
			input: setProperty('value'),
			filter: on('input', () => {
				host.filter = ui.filter?.value ?? ''
			}),
			clear: [
				show(() => !!lowerFilter.get()),
				on('click', () => {
					host.filter = ''
				}),
			],
			loading: show(() => (host.src ? content.get().pending : false)),
			error: [
				show(() => !!(host.src && content.get().error)),
				setText(() => (host.src ? content.get().error : '')),
			],
			listbox: [
				...manageFocus(
					() =>
						Array.from(
							ui.listbox.querySelectorAll<HTMLButtonElement>(
								'button[role="option"]:not([hidden])',
							),
						),
					options =>
						options.findIndex(option => option.ariaSelected === 'true'),
				),
				on('click', ({ target }) => {
					const option = (target as HTMLElement).closest(
						'[role="option"]',
					) as HTMLButtonElement
					if (option && option.value !== host.value) {
						host.value = option.value
						input.dispatchEvent(new Event('change', { bubbles: true }))
					}
				}),
				...maybeRender(),
			],
			options: [
				(_host, target) => {
					const textContent = target.textContent ?? ''
					const lowerText = textContent.trim().toLowerCase()
					return createEffect(() => {
						const filterText = lowerFilter.get()
						target.hidden = !lowerText.includes(filterText)
						target.innerHTML = highlightMatch(textContent, filterText)
					})
				},
				(_host, target) =>
					createEffect(() => {
						const isSelected = host.value === target.value
						target.tabIndex = isSelected ? 0 : -1
						target.ariaSelected = String(isSelected)
					}),
			],
		}
	},
)
