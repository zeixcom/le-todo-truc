import { mkdir, writeFile } from 'node:fs/promises'
import { Page } from './index.html.ts'

/**
 * Renders `src/index.html.ts` to a static HTML file at `dist/index.html`.
 *
 * Usage:
 *   bun src/bundle.ts
 *   bun run build:html   (if wired in package.json)
 */
async function main() {
	const outDir = './dist'
	const outFile = `${outDir}/index.html`

	await mkdir(outDir, { recursive: true })

	// `Page()` returns whatever your `html` tag returns; we force it to a string for writing.
	const html = String(Page())

	await writeFile(outFile, html, 'utf8')
}

await main()
