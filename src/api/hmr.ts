const encoder = new TextEncoder()
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()

export function broadcastHmr(event: object): void {
	const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
	for (const ctrl of clients) {
		try {
			ctrl.enqueue(data)
		} catch {
			clients.delete(ctrl)
		}
	}
}

export function hmrSseHandler(): Response {
	let ctrl!: ReadableStreamDefaultController<Uint8Array>
	const stream = new ReadableStream<Uint8Array>({
		start(c) {
			ctrl = c
			clients.add(ctrl)
			ctrl.enqueue(encoder.encode(': connected\n\n'))
		},
		cancel() {
			clients.delete(ctrl)
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		},
	})
}
