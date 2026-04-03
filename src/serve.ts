import { watch } from 'node:fs'
import { readFile } from 'node:fs/promises'
import {
	createTodo,
	deleteTodo,
	listTodos,
	reorderTodos,
	updateTodo,
} from './api/db.ts'
import { broadcastHmr, hmrSseHandler } from './api/hmr.ts'
import { sseHandler } from './api/sse.ts'

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
		path: '/assets/main.js.map',
		filePath: './dist/assets/main.js.map',
		contentType: 'application/json; charset=utf-8',
	},
	{
		path: '/assets/main.css',
		filePath: './dist/assets/main.css',
		contentType: 'text/css; charset=utf-8',
	},
]

const HMR_SCRIPT = `<script>
(function () {
	var es = new EventSource('/hmr/events');
	es.onmessage = function (e) {
		var event = JSON.parse(e.data);
		if (event.type !== 'reload') return;
		var file = event.file;
		if (file && file.endsWith('.css')) {
			document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
				var url = new URL(link.href);
				link.href = url.pathname + '?v=' + Date.now();
			});
		} else {
			location.reload();
		}
	};
	console.log('[HMR] connected');
})();
</script>`

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

async function serveHtml(req: Request, route: Route): Promise<Response> {
	const source = await readFile(route.filePath, 'utf-8')
	const injected = source.replace('</body>', `${HMR_SCRIPT}\n</body>`)
	const encoder = new TextEncoder()
	const bytes = encoder.encode(injected)
	const etag = `W/"${bytes.byteLength}"`
	const ifNoneMatch = req.headers.get('if-none-match')
	if (ifNoneMatch && ifNoneMatch === etag) {
		return withCacheHeaders(new Response(null, { status: 304 }), etag)
	}
	const res = new Response(bytes, {
		status: 200,
		headers: { 'Content-Type': route.contentType },
	})
	return withCacheHeaders(res, etag)
}

async function handleApi(req: Request, url: URL): Promise<Response> {
	const { method } = req
	const { pathname } = url

	if (pathname === '/api/todos/') {
		if (method === 'GET') return listTodos()
		if (method === 'POST') return createTodo(req)
	}
	if (pathname === '/api/todos/' && method === 'PUT') return reorderTodos(req)

	if (pathname === '/api/todos/events' && method === 'GET') return sseHandler()

	const idMatch = pathname.match(/^\/api\/todos\/([^/]+)$/)
	if (idMatch) {
		const id = idMatch[1]
		if (id) {
			if (method === 'PATCH') return updateTodo(req, id)
			if (method === 'DELETE') return deleteTodo(id)
		}
	}

	return new Response(`Not found: ${pathname}\n`, {
		status: 404,
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	})
}

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOST ?? 'localhost'

Bun.serve({
	port,
	hostname,
	idleTimeout: 0,
	async fetch(req) {
		try {
			const url = new URL(req.url)
			const pathname = url.pathname

			if (pathname.startsWith('/api/')) return handleApi(req, url)

			if (pathname === '/hmr/events') return hmrSseHandler()

			if (req.method !== 'GET' && req.method !== 'HEAD')
				return methodNotAllowed()

			const route = routes.find(r => r.path === pathname)
			if (!route) return notFound(url)

			const isHtml = route.contentType.startsWith('text/html')
			const res = await (isHtml ? serveHtml(req, route) : serveFile(req, route))

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
console.log('Serving static assets:')
for (const r of routes) console.log(`  ${r.path} -> ${r.filePath}`)
console.log('API endpoints:')
console.log('  GET    /api/todos/')
console.log('  GET    /api/todos/events')
console.log('  POST   /api/todos/')
console.log('  PUT    /api/todos/')
console.log('  PATCH  /api/todos/:id')
console.log('  DELETE /api/todos/:id')

// HMR: watch source files, trigger builds, then broadcast reload to the browser
const buildTimers = new Map<string, ReturnType<typeof setTimeout>>()

function debounced(key: string, fn: () => void, delay = 50) {
	const t = buildTimers.get(key)
	if (t) clearTimeout(t)
	buildTimers.set(key, setTimeout(fn, delay))
}

// Maps each build script to the dist file it produces.
// Broadcasting after build completion is more reliable than watching dist/
// because macOS fs.watch returns null filenames for atomic (rename-based) writes.
const buildOutputs: Record<string, string> = {
	'build:html': 'index.html',
	'build:js:dev': 'assets/main.js',
	'build:css': 'assets/main.css',
}

function runScript(script: string) {
	console.log(`[HMR] Building: ${script}`)
	const proc = Bun.spawn(['bun', 'run', script], { stdout: 'inherit', stderr: 'inherit' })
	proc.exited.then(code => {
		if (code !== 0) {
			console.error(`[HMR] '${script}' failed (exit ${code})`)
			return
		}
		const file = buildOutputs[script]
		if (file) broadcastHmr({ type: 'reload', file })
	})
}

watch('./src', { recursive: true }, (_, filename) => {
	if (!filename) return
	if (filename.endsWith('.html.ts')) {
		debounced('html', () => runScript('build:html'))
	} else if (filename.endsWith('.ts')) {
		debounced('js', () => runScript('build:js:dev'))
	} else if (filename.endsWith('.css')) {
		debounced('css', () => runScript('build:css'))
	}
})
