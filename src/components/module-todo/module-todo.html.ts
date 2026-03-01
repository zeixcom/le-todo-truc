import { html } from '../../html'
import { BasicButton } from '../basic-button/basic-button.html'
import { BasicPluralize } from '../basic-pluralize/basic-pluralize.html'
import { FormCheckbox } from '../form-checkbox/form-checkbox.html'
import { FormRadiogroup } from '../form-radiogroup/form-radiogroup.html'
import { FormTextbox } from '../form-textbox/form-textbox.html'

export function ModuleTodo() {
	return html`<module-todo class="content">
		<form action="#">
			${FormTextbox({
				label: 'What needs to be done?',
				id: 'add-todo',
				name: 'add-todo',
				clearable: true,
				autocomplete: 'off',
			})}
			${BasicButton({
				classList: ['submit'],
				label: 'Add Todo',
				type: 'submit',
				variant: 'constructive',
				disabled: true,
			})}
		</form>
		<template>
			<li>
				${FormCheckbox({ classList: ['todo'], label: html`<slot></slot>` })}
				${BasicButton({
					classList: ['delete'],
					label: '✕',
					ariaLabel: 'Delete',
					variant: ['tertiary', 'destructive'],
					size: 'small',
				})}
			</li>
		</template>
		<ol class="all"></ol>
		<footer>
			${BasicPluralize({
				content: html`<p class="none">Well done, all done!</p>
					<p class="some">
						<span class="count"></span> task<span class="other">s</span>
						remaining
					</p>`,
			})}
			${FormRadiogroup({
				classList: ['split-button'],
				legend: 'Filter',
				legendHidden: true,
				name: 'filter',
				options: {
					all: 'All',
					active: 'Active',
					completed: 'Completed',
				},
				selected: 'all',
				controlsHidden: true,
			})}
			${BasicButton({
				classList: ['clear-completed'],
				label: 'Clear completed',
				variant: ['tertiary', 'destructive'],
				badge: true,
			})}
		</footer>
	</module-todo> `
}
