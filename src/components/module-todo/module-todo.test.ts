import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { BasicButton } from '../basic-button/basic-button.html'
import '../basic-button/basic-button'
import { BasicPluralize } from '../basic-pluralize/basic-pluralize.html'
import '../basic-pluralize/basic-pluralize'
import { FormCheckbox } from '../form-checkbox/form-checkbox.html'
import '../form-checkbox/form-checkbox'
import { FormRadiogroup } from '../form-radiogroup/form-radiogroup.html'
import '../form-radiogroup/form-radiogroup'
import { FormTextbox } from '../form-textbox/form-textbox.html'
import '../form-textbox/form-textbox'
import './module-todo'

/* === Helpers === */

// Wait for microtasks and scheduled tasks to settle
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

type TodoItem = {
	id: string
	title: string
	createdAt: string
	completedAt: string | null
}

const TODOS: TodoItem[] = [
	{
		id: '1',
		title: 'Buy milk',
		createdAt: '2024-01-01T00:00:00Z',
		completedAt: null,
	},
	{
		id: '2',
		title: 'Walk dog',
		createdAt: '2024-01-02T00:00:00Z',
		completedAt: '2024-01-02T10:00:00Z',
	},
]

// Build the full module-todo HTML using the same generators as the app
const MODULE_TODO_HTML = `<module-todo>
	<form action="#">
		${FormTextbox({ id: 'add-todo', name: 'add-todo', label: 'What needs to be done?', clearable: true, autocomplete: 'off' })}
		${BasicButton({ classList: ['submit'], label: 'Add Todo', type: 'submit', variant: 'constructive', disabled: true })}
	</form>
	<template>
		<li>
			${FormCheckbox({ classList: ['todo'], label: '<slot></slot>' })}
			${BasicButton({ classList: ['delete'], label: '✕', ariaLabel: 'Delete', variant: ['tertiary', 'destructive'], size: 'small' })}
		</li>
	</template>
	<ol class="all"></ol>
	<footer>
		${BasicPluralize({ content: '<p class="none">All done!</p><p class="some"><span class="count"></span> tasks remaining</p>' })}
		${FormRadiogroup({ legend: 'Filter', legendHidden: true, name: 'filter', options: { all: 'All', active: 'Active', completed: 'Completed' }, selected: 'all', controlsHidden: true })}
		${BasicButton({ classList: ['clear-completed'], label: 'Clear completed', variant: ['tertiary', 'destructive'], badge: true })}
	</footer>
</module-todo>`

/* === Mocks === */

// EventSource is not available in happy-dom — mock it before component connects
class MockEventSource {
	onmessage: ((e: MessageEvent) => void) | null = null
	onerror: (() => void) | null = null
	close() {}
}

// Mock fetch to serve the todos list
const mockFetch =
	(todos: TodoItem[] = TODOS, patchResponse: Partial<TodoItem> = {}) =>
	async (
		url: string | URL | Request,
		init?: RequestInit,
	): Promise<Response> => {
		const urlStr = String(url)
		if (
			urlStr === '/api/todos/'
			&& (!init || init.method === 'GET' || !init.method)
		) {
			return new Response(JSON.stringify({ todos }), {
				headers: { 'Content-Type': 'application/json' },
			})
		}
		if (urlStr.startsWith('/api/todos/') && init?.method === 'PATCH') {
			// biome-ignore lint/style/noNonNullAssertion: test mock — URL structure is known
			const id = urlStr.split('/').pop()!
			// biome-ignore lint/style/noNonNullAssertion: test mock — todo always exists in test data
			const todo = todos.find(t => t.id === id)!
			return new Response(JSON.stringify({ ...todo, ...patchResponse }), {
				headers: { 'Content-Type': 'application/json' },
			})
		}
		return new Response('{}')
	}

let originalFetch: typeof globalThis.fetch
let originalEventSource: typeof globalThis.EventSource

beforeEach(() => {
	originalFetch = globalThis.fetch
	originalEventSource = globalThis.EventSource
	// @ts-expect-error — happy-dom does not include EventSource
	globalThis.EventSource = MockEventSource
})

afterEach(() => {
	document.body.innerHTML = ''
	globalThis.fetch = originalFetch
	globalThis.EventSource = originalEventSource
})

/* === Test helpers === */

// Extract the inner HTML (without <module-todo> wrapper tags) for imperative mounting.
// happy-dom fires connectedCallback at parseEndOfStartTag — before children are parsed —
// so we set innerHTML on the disconnected element first, then append to document.
const MODULE_TODO_INNER_HTML = MODULE_TODO_HTML.replace(
	/^\s*<module-todo[^>]*>\s*/,
	'',
).replace(/\s*<\/module-todo>\s*$/, '')

async function mountWithTodos(todos: TodoItem[] = TODOS) {
	globalThis.fetch = mockFetch(todos) as typeof globalThis.fetch
	// Build DOM: set inner children while element is disconnected, then connect
	const el = document.createElement('module-todo')
	el.innerHTML = MODULE_TODO_INNER_HTML
	document.body.appendChild(el) // connectedCallback fires with children already present
	// Wait for: fetch → task resolve → todos.set → DOM update → MutationObserver → pass()
	await tick()
	await tick()
	await tick()
}

function getCheckboxes() {
	return Array.from(document.querySelectorAll<HTMLElement>('form-checkbox'))
}

function getInput(fc: HTMLElement) {
	// biome-ignore lint/style/noNonNullAssertion: test helper — input always present in form-checkbox
	return fc.querySelector<HTMLInputElement>('input[type="checkbox"]')!
}

/* === Tests === */

describe('module-todo — initial render', () => {
	test('renders a form-checkbox for each todo', async () => {
		await mountWithTodos()
		expect(getCheckboxes()).toHaveLength(TODOS.length)
	})

	test('active todo has input.checked = false', async () => {
		await mountWithTodos()
		// todo id=1 is active (completedAt = null)
		// biome-ignore lint/style/noNonNullAssertion: test — element always present after mount
		const li = document.querySelector<HTMLElement>('[data-key="1"]')!
		// biome-ignore lint/style/noNonNullAssertion: test — element always present after mount
		const input = getInput(li.querySelector('form-checkbox')!)
		expect(input.checked).toBe(false)
	})

	test('completed todo has input.checked = true', async () => {
		await mountWithTodos()
		// todo id=2 is completed (completedAt set)
		// biome-ignore lint/style/noNonNullAssertion: test — element always present after mount
		const li = document.querySelector<HTMLElement>('[data-key="2"]')!
		// biome-ignore lint/style/noNonNullAssertion: test — element always present after mount
		const input = getInput(li.querySelector('form-checkbox')!)
		expect(input.checked).toBe(true)
	})
})

describe('module-todo — pass() wiring', () => {
	test('active todo: form-checkbox host.checked is false', async () => {
		await mountWithTodos()
		const fc = document.querySelector<HTMLElement>(
			'[data-key="1"] form-checkbox',
		) as HTMLElement & { checked: boolean }
		expect(fc.checked).toBe(false)
	})

	test('completed todo: form-checkbox host.checked is true', async () => {
		await mountWithTodos()
		const fc = document.querySelector<HTMLElement>(
			'[data-key="2"] form-checkbox',
		) as HTMLElement & { checked: boolean }
		expect(fc.checked).toBe(true)
	})
})

describe('module-todo — toggling a checkbox', () => {
	test('checking an active todo updates host.checked', async () => {
		await mountWithTodos()
		const fc = document.querySelector<HTMLElement>(
			'[data-key="1"] form-checkbox',
		) as HTMLElement & { checked: boolean }
		const input = getInput(fc)

		expect(fc.checked).toBe(false)
		input.checked = true
		input.dispatchEvent(new Event('change'))

		expect(fc.checked).toBe(true)
	})

	test('checking an active todo fires a PATCH request', async () => {
		const patchedUrls: string[] = []
		globalThis.fetch = (async (
			url: string | URL | Request,
			init?: RequestInit,
		) => {
			patchedUrls.push(String(url))
			return mockFetch(TODOS)(url, init)
		}) as typeof globalThis.fetch

		const el = document.createElement('module-todo')
		el.innerHTML = MODULE_TODO_INNER_HTML
		document.body.appendChild(el)
		await tick()
		await tick()
		await tick()

		// biome-ignore lint/style/noNonNullAssertion: test — element always present after mount
		const fc = document.querySelector<HTMLElement>(
			'[data-key="1"] form-checkbox',
		)!
		const input = getInput(fc)
		input.checked = true
		input.dispatchEvent(new Event('change'))

		await tick()

		expect(patchedUrls.some(u => u.includes('/api/todos/1'))).toBe(true)
	})
})
