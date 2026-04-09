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
import type { FormComboboxProps } from '../form-combobox/form-combobox'
import type { FormDateProps } from '../form-date/form-date'
import type { FormListboxProps } from '../form-listbox/form-listbox'
import type { FormRadiogroupProps } from '../form-radiogroup/form-radiogroup'
import type { FormTextboxProps } from '../form-textbox/form-textbox'
import type { ModuleDialogProps } from '../module-dialog/module-dialog'

type TodoStatus = 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'

type TodoItem = {
	id: string
	title: string
	description: string | null
	dueDate: string | null
	authorId: string | null
	assignedToId: string | null
	tags: string[]
	status: TodoStatus
	createdAt: string
	completedAt: string | null
}

type User = {
	id: string
	name: string
	email: string
}

type SseEvent =
	| { type: 'created'; todo: TodoItem }
	| { type: 'updated'; todo: TodoItem }
	| { type: 'deleted'; id: string }
	| { type: 'reordered'; ids: string[] }

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
	dialog: Component<ModuleDialogProps>
	detailForm: HTMLFormElement
	titleField: Component<FormTextboxProps>
	descriptionField: Component<FormTextboxProps>
	statusField: Component<FormListboxProps>
	assignedToField: Component<FormComboboxProps>
	dueDateField: Component<FormDateProps>
	tagsField: Component<FormTextboxProps>
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
		dialog: first(
			'module-dialog',
			'Add <module-dialog> for editing todo items.',
		),
		detailForm: first(
			'form#todo-edit-form',
			'Add <form id="todo-edit-form"> inside the edit dialog.',
		),
		titleField: first(
			'form-textbox.detail-title',
			'Add <form-textbox class="detail-title"> inside the edit dialog.',
		),
		descriptionField: first(
			'form-textbox.detail-description',
			'Add <form-textbox class="detail-description"> inside the edit dialog.',
		),
		statusField: first(
			'form-listbox.detail-status',
			'Add <form-listbox class="detail-status"> inside the edit dialog.',
		),
		assignedToField: first(
			'form-combobox.detail-assigned-to',
			'Add <form-combobox class="detail-assigned-to"> inside the edit dialog.',
		),
		dueDateField: first(
			'form-date.detail-due-date',
			'Add <form-date class="detail-due-date"> inside the edit dialog.',
		),
		tagsField: first(
			'form-textbox.detail-tags',
			'Add <form-textbox class="detail-tags"> inside the edit dialog.',
		),
	}),
	({
		host,
		textbox,
		template,
		list,
		items,
		filter,
		dialog,
		detailForm,
		titleField,
		descriptionField,
		statusField,
		assignedToField,
		dueDateField,
		tagsField,
	}) => {
		// Single source of truth — stable keys = server IDs
		const todos = createList<TodoItem>([], { keyConfig: item => item.id })

		// Drag & drop state — one key being dragged at a time per component instance
		let dragKey: string | null = null

		// Currently edited todo key (empty string = none)
		const editKey = createState<string>('')

		// Known users for the assignedTo combobox lookup
		const users = createState<User[]>([])

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

		const usersData = createTask<User[]>(async (_prev, abort) => {
			const response = await fetch('/api/users/', { signal: abort })
			if (!response.ok) return
			const json = await response.json()
			if (Array.isArray(json.users)) return json.users
			else return new Error('Invalid user data format.')
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

				// Seed the users list for assignedTo lookups
				() =>
					createEffect(() => {
						match([usersData], {
							ok: ([fetched]) => users.set(fetched),
							err: errors => console.error('Failed to load users', errors[0]),
						})
					}),

				// Sync List signal → module-list DOM (structural: add/remove items).
				// Each added item gets its own per-item effect tracking only its State signal,
				// so toggling one item does not re-run checks for all other items.
				() =>
					createEffect(() => {
						const keys = [...todos.keys()]
						// untrack: DOM mutations from reordering must not re-trigger this effect
						const itemElements = untrack(() => items.get())
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
									li.draggable = true
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
						// Reconcile DOM order to match the List signal
						for (let i = 0; i < keys.length; i++) {
							const el = list.querySelector(`li[data-key="${keys[i]}"]`)
							if (!el) continue
							if (list.children[i] !== el)
								list.insertBefore(el, list.children[i] ?? null)
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
							todos.replace(event.todo.id, event.todo)
						} else if (event.type === 'deleted') {
							if (todos.byKey(event.id)) todos.remove(event.id)
						} else if (event.type === 'reordered') {
							// Skip if this client already applied the same order (it was the dragger)
							const current = todos.get()
							const currentIds = current.map(t => t.id)
							if (event.ids.every((id, i) => id === currentIds[i])) return
							const reordered = event.ids
								.map(id => current.find(t => t.id === id))
								.filter((t): t is TodoItem => t !== undefined)
							todos.set(reordered)
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
				on('dragstart', e => {
					const li = (e.target as HTMLElement).closest<HTMLLIElement>(
						'li[data-key]',
					)
					if (!li) return
					dragKey = li.dataset.key ?? null
					li.classList.add('is-dragging')
					if (e.dataTransfer) {
						e.dataTransfer.effectAllowed = 'move'
						e.dataTransfer.setData('text/plain', dragKey ?? '')
					}
				}),
				on('dragover', e => {
					e.preventDefault()
					if (!dragKey) return
					if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
					// Refresh drop-position indicators
					for (const el of list.querySelectorAll('.drag-before, .drag-after')) {
						el.classList.remove('drag-before', 'drag-after')
					}
					const li = (e.target as HTMLElement).closest<HTMLLIElement>(
						'li[data-key]',
					)
					if (!li || li.dataset.key === dragKey) return
					const rect = li.getBoundingClientRect()
					li.classList.add(
						e.clientY < rect.top + rect.height / 2
							? 'drag-before'
							: 'drag-after',
					)
				}),
				on('dragleave', e => {
					// Only clear indicators when the pointer leaves the list entirely
					if (list.contains(e.relatedTarget as Node)) return
					for (const el of list.querySelectorAll('.drag-before, .drag-after')) {
						el.classList.remove('drag-before', 'drag-after')
					}
				}),
				on('drop', async e => {
					e.preventDefault()
					const targetLi = (e.target as HTMLElement).closest<HTMLLIElement>(
						'li[data-key]',
					)
					if (!dragKey || !targetLi) return
					const targetKey = targetLi.dataset.key
					if (!targetKey || targetKey === dragKey) return

					const rect = targetLi.getBoundingClientRect()
					const before = e.clientY < rect.top + rect.height / 2

					const current = todos.get()
					const fromIdx = current.findIndex(t => t.id === dragKey)
					const toIdx = current.findIndex(t => t.id === targetKey)
					if (fromIdx === -1 || toIdx === -1) return

					// Compute new order
					const reordered = [...current]
					// biome-ignore lint/style/noNonNullAssertion: fromIdx is verified !== -1 above
					const moved = reordered.splice(fromIdx, 1)[0]!
					// insertAt is relative to the original indices; adjust for the removed item
					const insertAt = before ? toIdx : toIdx + 1
					const adjustedIdx = fromIdx < insertAt ? insertAt - 1 : insertAt
					reordered.splice(adjustedIdx, 0, moved)

					// Update signal — the structural effect reconciles DOM order reactively
					todos.set(reordered)

					// Clean up visual state before the async persist
					for (const el of list.querySelectorAll('.drag-before, .drag-after')) {
						el.classList.remove('drag-before', 'drag-after')
					}
					dragKey = null

					// Persist new order to the server
					await fetch('/api/todos/', {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ ids: reordered.map(t => t.id) }),
					}).catch(err => console.error('Failed to reorder todos', err))
				}),
				on('dragend', () => {
					for (const el of list.querySelectorAll(
						'.is-dragging, .drag-before, .drag-after',
					)) {
						el.classList.remove('is-dragging', 'drag-before', 'drag-after')
					}
					dragKey = null
				}),
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
				on('dblclick', e => {
					const li = (e.target as HTMLElement).closest<HTMLLIElement>(
						'li[data-key]',
					)
					if (!li) return
					const key = li.dataset.key
					if (!key) return
					const todo = todos.byKey(key)?.get()
					if (!todo) return

					// Populate dialog fields with current todo data
					titleField.value = todo.title
					descriptionField.value = todo.description ?? ''
					statusField.value = todo.status
					const user = users.get().find(u => u.id === todo.assignedToId)
					assignedToField.value = user?.name ?? ''
					dueDateField.value = todo.dueDate ?? ''
					tagsField.value = todo.tags.join(', ')

					editKey.set(key)
					dialog.open = true
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
					const current = untrack(() => todos.byKey(key)?.get())
					if (current) todos.replace(key, { ...current, completedAt })
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
			detailForm: on('submit', async e => {
				e.preventDefault()
				const key = editKey.get()
				if (!key) return

				const fd = new FormData(detailForm)
				const assignedToName = (fd.get('assignedToName') as string | null) ?? ''
				const assignedToId =
					users.get().find(u => u.name === assignedToName)?.id ?? null

				await fetch(`/api/todos/${key}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: ((fd.get('title') as string) ?? '').trim(),
						description:
							((fd.get('description') as string) ?? '').trim() || null,
						status: (fd.get('status') as TodoStatus) || 'BACKLOG',
						assignedToId,
						dueDate: (fd.get('dueDate') as string | null) || null,
						tags: ((fd.get('tags') as string) ?? '')
							.split(',')
							.map(t => t.trim())
							.filter(Boolean),
					}),
				}).catch(err => console.error('Failed to update todo', err))

				dialog.open = false
			}),
		}
	},
)
