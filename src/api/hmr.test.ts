import { afterEach, describe, expect, test } from 'bun:test'
import { broadcastHmr, hmrSseHandler } from './hmr'

const decoder = new TextDecoder()

// Cancel the SSE stream after each test so the module-level `clients` Set is cleared.
const readers: ReadableStreamDefaultReader<Uint8Array>[] = []

afterEach(async () => {
	for (const reader of readers) await reader.cancel()
	readers.length = 0
})

function connect() {
	const response = hmrSseHandler()
	const reader = response.body!.getReader()
	readers.push(reader)
	return { response, reader }
}

async function read(reader: ReadableStreamDefaultReader<Uint8Array>) {
	const { value } = await reader.read()
	return decoder.decode(value)
}

describe('hmrSseHandler', () => {
	test('returns 200 with SSE headers', () => {
		const { response } = connect()
		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Type')).toBe('text/event-stream')
		expect(response.headers.get('Cache-Control')).toBe('no-cache')
		expect(response.headers.get('X-Accel-Buffering')).toBe('no')
	})

	test('sends a connected comment immediately on open', async () => {
		const { reader } = connect()
		const text = await read(reader)
		expect(text).toBe(': connected\n\n')
	})

	test('each call creates an independent stream', async () => {
		const { reader: r1 } = connect()
		const { reader: r2 } = connect()
		const t1 = await read(r1)
		const t2 = await read(r2)
		expect(t1).toBe(': connected\n\n')
		expect(t2).toBe(': connected\n\n')
	})
})

describe('broadcastHmr', () => {
	test('does not throw when no clients are connected', () => {
		expect(() => broadcastHmr({ type: 'reload', file: 'assets/main.js' })).not.toThrow()
	})

	test('delivers a reload event to a connected client', async () => {
		const { reader } = connect()
		await read(reader) // consume the ': connected' comment

		broadcastHmr({ type: 'reload', file: 'assets/main.js' })

		const text = await read(reader)
		expect(text).toBe('data: {"type":"reload","file":"assets/main.js"}\n\n')
	})

	test('delivers events to all connected clients', async () => {
		const { reader: r1 } = connect()
		const { reader: r2 } = connect()
		await read(r1)
		await read(r2)

		broadcastHmr({ type: 'reload', file: 'index.html' })

		const [t1, t2] = await Promise.all([read(r1), read(r2)])
		expect(t1).toBe('data: {"type":"reload","file":"index.html"}\n\n')
		expect(t2).toBe('data: {"type":"reload","file":"index.html"}\n\n')
	})

	test('removed client does not receive events after disconnect', async () => {
		const { reader } = connect()
		await read(reader) // consume connected comment
		await reader.cancel() // triggers stream cancel → removes client

		// Should not throw even though the client is gone
		expect(() => broadcastHmr({ type: 'reload', file: 'assets/main.css' })).not.toThrow()
	})
})

describe('HMR event format', () => {
	test('CSS file event has correct SSE format', async () => {
		const { reader } = connect()
		await read(reader)

		broadcastHmr({ type: 'reload', file: 'assets/main.css' })
		const text = await read(reader)

		// Must be valid SSE: "data: <json>\n\n"
		expect(text).toMatch(/^data: .+\n\n$/)
		const payload = JSON.parse(text.slice('data: '.length).trimEnd())
		expect(payload).toEqual({ type: 'reload', file: 'assets/main.css' })
	})

	test('JS file event has correct SSE format', async () => {
		const { reader } = connect()
		await read(reader)

		broadcastHmr({ type: 'reload', file: 'assets/main.js' })
		const text = await read(reader)

		expect(text).toMatch(/^data: .+\n\n$/)
		const payload = JSON.parse(text.slice('data: '.length).trimEnd())
		expect(payload).toEqual({ type: 'reload', file: 'assets/main.js' })
	})
})
