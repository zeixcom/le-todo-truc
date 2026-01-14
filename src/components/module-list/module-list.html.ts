import { html } from '../../html'

type ModuleListServerProps = {
	filter?: string
	list?: string
	item?: string
	controls?: string
}

export function ModuleList({
	filter,
	list,
	item,
	controls,
}: ModuleListServerProps) {
	return html`<module-list ${filter && `filter="${filter}"`}>
		${list ? list : '<ul data-container></ul>'}
		<template> ${item ? item : '<li><slot></slot></li>'} </template>
		${controls}
	</module-list> `
}
