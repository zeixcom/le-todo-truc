import {
	type Component,
	createCollection,
	createComputed,
	createEffect,
	defineComponent,
	match,
	on,
	pass,
	resolve,
	setAttribute,
} from '@zeix/le-truc'
import type { BasicButtonProps } from '../basic-button/basic-button'
import type { BasicPluralizeProps } from '../basic-pluralize/basic-pluralize'
import type { FormRadiogroupProps } from '../form-radiogroup/form-radiogroup'
import type { FormTextboxProps } from '../form-textbox/form-textbox'
import type { ModuleListProps } from '../module-list/module-list'

type TodoItem = {
	id: string
	title: string
	createdAt: string
	completedAt: string | null
}

type ModuleTodoUI = {
	form: HTMLFormElement
	textbox: Component<FormTextboxProps>
	submit: Component<BasicButtonProps>
	list: Component<ModuleListProps>
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
	({ first }) => ({
		form: first('form', 'Add a form element to enter a new todo item.'),
		textbox: first(
			'form-textbox',
			'Add <form-textbox> component to enter a new todo item.',
		),
		submit: first(
			'basic-button.submit',
			'Add <basic-button.submit> component to submit the form.',
		),
		list: first(
			'module-list',
			'Add <module-list> component to display a list of todo items.',
		),
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
	({ textbox, list, filter }) => {
		const active = createCollection(list, 'form-checkbox:not([checked])')
		const completed = createCollection(list, 'form-checkbox[checked]')

		const data = createComputed<TodoItem[]>(async (_prev, abort) => {
			const response = await fetch('http://localhost:3000/api/todos/', {
				signal: abort,
			})
			if (!response.ok) return
			const json = await response.json()
			if (Array.isArray(json.todos)) return json.todos
			else return new Error('Invalid data format of response.')
		})

		return {
			host: () =>
				createEffect(() => {
					match(resolve({ data }), {
						ok: ({ data: todos }) => {
							for (const todo of todos) {
								list.add(item => {
									item.querySelector('slot')?.replaceWith(todo.title)
									if (todo.completedAt) {
										const checkbox = item.querySelector('input')
										if (checkbox) checkbox.checked = true
									}
								})
							}
						},
						err: errors => console.error(errors[0]),
					})
				}),
			form: on('submit', e => {
				e.preventDefault()
				const value = textbox.value.trim()
				if (!value) return
				list.add(item => {
					item.querySelector('slot')?.replaceWith(value)
				})
				textbox.clear()
			}),
			submit: pass({ disabled: () => !textbox.length }),
			list: setAttribute('filter', () => filter?.value || 'all'),
			count: pass({ count: () => active.length }),
			clearCompleted: [
				pass({
					disabled: () => !completed.length,
					badge: () => (completed.length ? String(completed.length) : ''),
				}),
				on('click', () => {
					const items = completed.get()
					for (let i = items.length - 1; i >= 0; i--)
						items[i]?.closest('li')?.remove()
				}),
			],
		}
	},
)
