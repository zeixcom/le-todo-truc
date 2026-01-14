import { readFile } from 'node:fs/promises'

type Route = {
	path: string
	filePath: string
	contentType: string
}

const routes: Route[] = [
	{
		path: '/',
		filePath: './dist/index.html',
		contentType: 'text/html; charset=utf-8',
	},
	{
		path: '/index.html',
		filePath: './dist/index.html',
		contentType: 'text/html; charset=utf-8',
	},
	{
		path: '/assets/main.js',
		filePath: './dist/assets/main.js',
		contentType: 'text/javascript; charset=utf-8',
	},
	{
		path: '/assets/main.css',
		filePath: './dist/assets/main.css',
		contentType: 'text/css; charset=utf-8',
	},
]

function withCacheHeaders(res: Response, etag: string) {
	const headers = new Headers(res.headers)
	headers.set('ETag', etag)
	// Dev server: revalidate on every request, but allow 304 when unchanged.
	headers.set('Cache-Control', 'no-cache')
	return new Response(res.body, { status: res.status, headers })
}

function notFound(url: URL) {
	return new Response(`Not found: ${url.pathname}\n`, {
		status: 404,
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	})
}

function methodNotAllowed() {
	return new Response('Method Not Allowed\n', {
		status: 405,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			Allow: 'GET, HEAD',
		},
	})
}

function internalError(err: unknown) {
	const message = err instanceof Error ? err.stack || err.message : String(err)
	return new Response(`Internal Server Error\n\n${message}\n`, {
		status: 500,
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	})
}

async function serveFile(req: Request, route: Route) {
	// Bun supports `Bun.file(...)`, but using Node fs keeps this script portable.
	const bytes = await readFile(route.filePath)

	// Cheap ETag for dev: based on byte length (good enough for local use).
	// If you want stronger caching, swap to a hash.
	const etag = `W/"${bytes.byteLength}"`

	const ifNoneMatch = req.headers.get('if-none-match')
	if (ifNoneMatch && ifNoneMatch === etag) {
		return withCacheHeaders(new Response(null, { status: 304 }), etag)
	}

	const res = new Response(bytes, {
		status: 200,
		headers: {
			'Content-Type': route.contentType,
		},
	})

	return withCacheHeaders(res, etag)
}

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOST ?? 'localhost'

Bun.serve({
	port,
	hostname,
	async fetch(req) {
		try {
			const url = new URL(req.url)

			if (req.method !== 'GET' && req.method !== 'HEAD')
				return methodNotAllowed()

			// Strip query params; route by pathname only.
			const pathname = url.pathname

			const route = routes.find(r => r.path === pathname)
			if (!route) return notFound(url)

			const res = await serveFile(req, route)

			// Respect HEAD semantics (same headers, no body)
			if (req.method === 'HEAD') {
				return new Response(null, { status: res.status, headers: res.headers })
			}

			return res
		} catch (err) {
			return internalError(err)
		}
	},
})

console.log(`Dev server running at http://${hostname}:${port}`)
console.log('Serving only:')
for (const r of routes) console.log(`  ${r.path} -> ${r.filePath}`)
