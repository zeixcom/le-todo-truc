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
		<module-dialog>
			<dialog id="todo-edit-dialog" aria-labelledby="todo-edit-dialog-title">
				<header>
					<h2 id="todo-edit-dialog-title">Edit Todo</h2>
					<button type="button" class="close" aria-label="Close dialog">×</button>
				</header>
				<module-scrollarea orientation="vertical">
					<form id="todo-edit-form" class="content">
						${FormTextbox({
							classList: ['detail-title'],
							label: 'Title',
							id: 'todo-edit-title',
							name: 'title',
							clearable: false,
							required: true,
						})}
						${FormTextbox({
							classList: ['detail-description'],
							label: 'Description',
							id: 'todo-edit-description',
							name: 'description',
							clearable: false,
							textarea: true,
							rows: 4,
						})}
						<fieldset>
							<legend>Status</legend>
							<form-listbox id="todo-edit-status" class="detail-status">
								<input type="hidden" name="status" value="BACKLOG" />
								<div role="listbox" aria-labelledby="todo-edit-status-label">
									<button type="button" role="option" tabindex="-1" value="BACKLOG">Backlog</button>
									<button type="button" role="option" tabindex="-1" value="READY">Ready</button>
									<button type="button" role="option" tabindex="-1" value="IN_PROGRESS">In Progress</button>
									<button type="button" role="option" tabindex="-1" value="IN_REVIEW">In Review</button>
									<button type="button" role="option" tabindex="-1" value="DONE">Done</button>
								</div>
							</form-listbox>
						</fieldset>
						<form-combobox class="detail-assigned-to">
							<label for="todo-edit-assigned-to" id="todo-edit-assigned-to-label">Assigned To</label>
							<div class="input">
								<input
									id="todo-edit-assigned-to"
									type="text"
									name="assignedToName"
									role="combobox"
									aria-expanded="false"
									aria-controls="todo-edit-assigned-to-popup"
									aria-autocomplete="list"
									autocomplete="off"
								/>
								<form-listbox
									id="todo-edit-assigned-to-popup"
									src="/api/users/options"
								>
									<input type="hidden" name="assignedToHidden" />
									<p class="loading" role="status" hidden>Loading…</p>
									<p class="error" role="alert" aria-live="assertive" hidden></p>
									<module-scrollarea orientation="vertical">
										<div role="listbox" aria-labelledby="todo-edit-assigned-to-label" hidden></div>
									</module-scrollarea>
								</form-listbox>
							</div>
							<p class="error" role="alert" aria-live="assertive" id="todo-edit-assigned-to-error"></p>
						</form-combobox>
						<form-date class="detail-due-date">
							<label for="todo-edit-due-date">Due Date</label>
							<div class="input">
								<input type="date" id="todo-edit-due-date" name="dueDate" />
							</div>
							<p class="error" role="alert" aria-live="assertive" id="todo-edit-due-date-error"></p>
						</form-date>
						${FormTextbox({
							classList: ['detail-tags'],
							label: 'Tags',
							id: 'todo-edit-tags',
							name: 'tags',
							clearable: false,
						})}
						<div class="dialog-actions">
							${BasicButton({
								classList: ['save'],
								label: 'Save',
								type: 'submit',
								variant: 'constructive',
							})}
						</div>
					</form>
				</module-scrollarea>
			</dialog>
		</module-dialog>
	</module-todo> `
}
