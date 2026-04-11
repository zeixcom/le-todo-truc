import { escapeHTML } from '@zeix/le-truc'

/**
 * Safely creates HTML with highlighted matches
 */
export function highlightMatch(
	text: string,
	highlightPattern?: string | RegExp,
): string {
	if (!highlightPattern) return escapeHTML(text)

	const pattern =
		typeof highlightPattern === 'string'
			? new RegExp(
					highlightPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
					'giu',
				)
			: highlightPattern

	const matches: Array<{ start: number; end: number; text: string }> = []
	let match: RegExpExecArray | null

	pattern.lastIndex = 0

	while ((match = pattern.exec(text)) !== null) {
		matches.push({
			start: match.index,
			end: match.index + match[0].length,
			text: match[0],
		})
		if (match.index === pattern.lastIndex) pattern.lastIndex++
	}

	if (matches.length === 0) return escapeHTML(text)

	let result = ''
	let lastIndex = 0

	for (const { start, end, text: matchText } of matches) {
		result += escapeHTML(text.slice(lastIndex, start))
		result += `<mark>${escapeHTML(matchText)}</mark>`
		lastIndex = end
	}

	result += escapeHTML(text.slice(lastIndex))

	return result
}
