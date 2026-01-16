import { attr, html, type Tokens } from '../../html'

type ModuleListRenderProps = {
	classList?: Tokens
	filter?: string
	list?: string
	item?: string
	controls?: string
}

export function ModuleList({
	classList,
	filter,
	list,
	item,
	controls,
}: ModuleListRenderProps) {
	return html`<module-list
		${attr('filter', filter)}
		${attr('class', classList)}
	>
		${list ? list : html`<ul data-container></ul>`}
		<template> ${item ? item : html`<li><slot></slot></li>`} </template>
		${controls}
	</module-list> `
}
