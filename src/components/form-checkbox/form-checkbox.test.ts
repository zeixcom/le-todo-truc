import { afterEach, describe, expect, test } from 'bun:test'
import { createState, pass } from '@zeix/le-truc'
import type { FormCheckboxProps } from './form-checkbox'
import './form-checkbox'

// Build the DOM imperatively — happy-dom fires connectedCallback at parseEndOfStartTag
// (before innerHTML children are parsed), so we must append children before connecting.
function setup() {
	const el = document.createElement('form-checkbox') as HTMLElement & {
		checked: boolean
	}
	const label = document.createElement('label')
	const input = document.createElement('input')
	input.type = 'checkbox'
	input.className = 'visually-hidden'
	const span = document.createElement('span')
	span.className = 'label'
	span.textContent = 'Test'
	label.append(input, span)
	el.appendChild(label)
	document.body.appendChild(el) // connectedCallback fires here, children already present
	return { el, input }
}

// Simulate what module-todo's checkboxes: pass() does.
// Using pass() from the bundled package ensures we access the same componentSignals
// WeakMap as component.ts (both loaded via @zeix/le-truc/index.js at runtime).
function passChecked(
	el: HTMLElement & { checked: boolean },
	checked: ReturnType<typeof createState<boolean>>,
) {
	const fakeHost = document.createElement('div')
	pass<Record<string, never>, FormCheckboxProps>({ checked })(
		// biome-ignore lint/suspicious/noExplicitAny: test helper coercion for pass() generic types
		fakeHost as any,
		// biome-ignore lint/suspicious/noExplicitAny: test helper coercion for pass() generic types
		el as any,
	)
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('form-checkbox — initial state', () => {
	test('host.checked defaults to false', () => {
		const { el } = setup()
		expect(el.checked).toBe(false)
	})

	test('input.checked reflects host.checked on connect', () => {
		const { input } = setup()
		expect(input.checked).toBe(false)
	})
})

describe('form-checkbox — setProperty effect', () => {
	test('setting host.checked = true updates input.checked', () => {
		const { el, input } = setup()
		el.checked = true
		expect(input.checked).toBe(true)
	})

	test('setting host.checked = false updates input.checked', () => {
		const { el, input } = setup()
		el.checked = true
		el.checked = false
		expect(input.checked).toBe(false)
	})
})

describe('form-checkbox — on(change) event', () => {
	test('checking input dispatches change → host.checked becomes true', () => {
		const { el, input } = setup()
		input.checked = true
		input.dispatchEvent(new Event('change'))
		expect(el.checked).toBe(true)
	})

	test('unchecking input dispatches change → host.checked becomes false', () => {
		const { el, input } = setup()
		el.checked = true
		input.checked = false
		input.dispatchEvent(new Event('change'))
		expect(el.checked).toBe(false)
	})
})

describe('form-checkbox — slot replacement via pass()', () => {
	test('pass with checked=true state updates input.checked immediately', () => {
		const { el, input } = setup()
		expect(input.checked).toBe(false)

		passChecked(el, createState(true))

		expect(input.checked).toBe(true)
	})

	test('pass with checked=false, then state.set(true) updates input.checked', () => {
		const { el, input } = setup()
		const checked = createState(false)
		passChecked(el, checked)
		expect(input.checked).toBe(false)

		checked.set(true)
		expect(input.checked).toBe(true)
	})

	test('pass with checked=true, then state.set(false) updates input.checked', () => {
		const { el, input } = setup()
		const checked = createState(true)
		passChecked(el, checked)
		expect(input.checked).toBe(true)

		checked.set(false)
		expect(input.checked).toBe(false)
	})

	test('after pass, change event on input updates the external state', () => {
		const { el, input } = setup()
		const checked = createState(false)
		passChecked(el, checked)

		input.checked = true
		input.dispatchEvent(new Event('change'))

		expect(checked.get()).toBe(true)
	})

	test('after pass, el.checked reflects the external state', () => {
		const { el } = setup()
		const checked = createState(true)
		passChecked(el, checked)
		expect(el.checked).toBe(true)

		checked.set(false)
		expect(el.checked).toBe(false)
	})
})
