import {
	type Component,
	createEffect,
	createList,
	createMemo,
	createState,
	createTask,
	defineComponent,
	type Memo,
	MissingElementError,
	match,
	on,
	pass,
	setAttribute,
	untrack,
} from '@zeix/le-truc'
import type { BasicButtonProps } from '../basic-button/basic-button'
import type { BasicPluralizeProps } from '../basic-pluralize/basic-pluralize'
import type { FormCheckboxProps } from '../form-checkbox/form-checkbox'
import type { FormRadiogroupProps } from '../form-radiogroup/form-radiogroup'
import type { FormTextboxProps } from '../form-textbox/form-textbox'

type TodoItem = {
	id: string
	title: string
	createdAt: string
	completedAt: string | null
}

type SseEvent =
	| { type: 'created'; todo: TodoItem }
	| { type: 'updated'; todo: TodoItem }
	| { type: 'deleted'; id: string }

type ModuleTodoUI = {
	form: HTMLFormElement
	textbox: Component<FormTextboxProps>
	submit: Component<BasicButtonProps>
	template: HTMLTemplateElement
	list: HTMLOListElement
	items: Memo<HTMLLIElement[]>
	checkboxes: Memo<Component<FormCheckboxProps>[]>
	count: Component<BasicPluralizeProps>
	filter: Component<FormRadiogroupProps>
	clearCompleted: Component<BasicButtonProps>
}

declare global {
	interface HTMLElementTagNameMap {
		'module-todo': Component<Record<string, never>>
	}
}

export default defineComponent<Record<string, never>, ModuleTodoUI>(
	'module-todo',
	{},
	({ all, first }) => ({
		form: first('form', 'Add a form element to enter a new todo item.'),
		textbox: first(
			'form-textbox',
			'Add <form-textbox> component to enter a new todo item.',
		),
		submit: first(
			'basic-button.submit',
			'Add <basic-button.submit> component to submit the form.',
		),
		template: first('template', 'Add a <template> element for new todo items.'),
		list: first('ol', 'Add an <ol> element to as container for todo items.'),
		items: all('li[data-key]'),
		checkboxes: all('form-checkbox'),
		count: first(
			'basic-pluralize',
			'Add <basic-pluralize> component to display the number of todo items.',
		),
		filter: first(
			'form-radiogroup',
			'Add <form-radiogroup> component to filter todo items.',
		),
		clearCompleted: first(
			'basic-button.clear-completed',
			'Add <basic-button.clear-completed> component to clear completed todo items.',
		),
	}),
	({ host, textbox, template, list, items, filter }) => {
		// Single source of truth — stable keys = server IDs
		const todos = createList<TodoItem>([], { keyConfig: item => item.id })
		const activeCount = createMemo(
			() => todos.get().filter(t => !t.completedAt).length,
		)
		const completedKeys = createMemo(() =>
			todos
				.get()
				.filter(t => t.completedAt)
				.map(t => t.id),
		)

		const data = createTask<TodoItem[]>(async (_prev, abort) => {
			const response = await fetch('/api/todos/', { signal: abort })
			if (!response.ok) return
			const json = await response.json()
			if (Array.isArray(json.todos)) return json.todos
			else return new Error('Invalid data format of response.')
		})

		return {
			host: [
				// Seed the List signal from the initial fetch
				() =>
					createEffect(() => {
						match([data], {
							ok: ([fetched]) => todos.set(fetched),
							err: errors => console.error(errors[0]),
						})
					}),

				// Sync List signal → module-list DOM (structural: add/remove items).
				// Each added item gets its own per-item effect tracking only its State signal,
				// so toggling one item does not re-run checks for all other items.
				() =>
					createEffect(() => {
						const keys = [...todos.keys()]
						const itemElements = items.get()
						// Add items not yet in DOM
						for (const key of keys) {
							if (!list.querySelector(`[data-key="${key}"]`)) {
								const itemSignal = todos.byKey(key)
								if (!itemSignal) continue

								const li = (
									template.content.cloneNode(true) as DocumentFragment
								).firstElementChild
								if (li && li instanceof HTMLLIElement) {
									li.dataset.key = key
									const todo = itemSignal.get()
									li.querySelector('slot')?.replaceWith(todo.title)
									list.append(li)
								} else {
									throw new MissingElementError(
										host,
										'li',
										'Template must contain an <li> element.',
									)
								}
							}
						}
						// Remove DOM items no longer in the List
						for (const el of itemElements) {
							const key = el.dataset.key
							if (key && !todos.byKey(key)) el.closest('li')?.remove()
						}
					}),

				// SSE subscription — set up once, never torn down by reactive effects
				() => {
					const es = new EventSource('/api/todos/events')
					es.onmessage = e => {
						const event = JSON.parse(e.data) as SseEvent
						if (event.type === 'created') {
							if (!todos.byKey(event.todo.id)) todos.add(event.todo)
						} else if (event.type === 'updated') {
							todos.byKey(event.todo.id)?.set(event.todo)
						} else if (event.type === 'deleted') {
							if (todos.byKey(event.id)) todos.remove(event.id)
						}
					}
					es.onerror = () => console.warn('SSE connection lost, will reconnect')
					return () => es.close()
				},
			],
			form: on('submit', async e => {
				e.preventDefault()
				const value = textbox.value.trim()
				if (!value) return
				const res = await fetch('/api/todos/', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: value }),
				})
				if (!res.ok) {
					console.error('Failed to create todo', res.status)
					return
				}
				const todo: TodoItem = await res.json()
				if (!todos.byKey(todo.id)) todos.add(todo)
				textbox.clear()
			}),
			submit: pass({ disabled: () => !textbox.length }),
			list: [
				setAttribute('class', () => filter?.value || 'all'),
				on('click', async e => {
					const el = e.target as HTMLElement
					if (!(el instanceof HTMLElement)) return
					if (!el.closest('basic-button.delete')) return
					const li = el.closest<HTMLElement>('[data-key]')
					if (!li) return
					const key = li.dataset.key
					if (!key) return

					todos.remove(key)
					await fetch(`/api/todos/${key}`, { method: 'DELETE' }).catch(err =>
						console.error('Failed to delete todo', err),
					)
				}),
			],
			checkboxes: pass(target => {
				const key = target.closest<HTMLElement>('[data-key]')?.dataset.key
				if (!key) return {}

				const checked = createState(
					untrack(() => todos.byKey(key)?.get().completedAt !== null),
				)

				// Sync server → checkbox: keeps checked in sync with SSE updates from other clients
				createEffect(() => {
					const item = todos.byKey(key)?.get()
					if (!item) return
					checked.set(item.completedAt !== null)
				})

				// Sync checkbox → server: fires PATCH only when user toggles (not on server-driven sync)
				createEffect(() => {
					const isChecked = checked.get()
					const serverChecked = untrack(
						() => todos.byKey(key)?.get().completedAt !== null,
					)
					if (isChecked === serverChecked) return
					const completedAt = isChecked ? new Date().toISOString() : null
					// Optimistic: update signal immediately so all derived state reacts
					todos.byKey(key)?.update(item => ({ ...item, completedAt }))
					fetch(`/api/todos/${key}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ completedAt }),
					}).catch(err => console.error('Failed to update todo', err))
				})

				return { checked }
			}),
			count: pass({ count: activeCount }),
			clearCompleted: [
				pass({
					disabled: () => !completedKeys.get().length,
					badge: () =>
						completedKeys.get().length
							? String(completedKeys.get().length)
							: '',
				}),
				on('click', async () => {
					const keys = completedKeys.get()
					for (const key of keys) todos.remove(key)
					await Promise.all(
						keys.map(key =>
							fetch(`/api/todos/${key}`, { method: 'DELETE' }).catch(err =>
								console.error('Failed to delete todo', err),
							),
						),
					)
				}),
			],
		}
	},
)
