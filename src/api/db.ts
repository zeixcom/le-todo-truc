import { Database } from 'bun:sqlite'
import { broadcast } from './sse.ts'
import todosJson from './todos.json' with { type: 'json' }

type TodoItem = {
	id: string
	title: string
	createdAt: string
	completedAt: string | null
}

type TodoRow = {
	id: string
	title: string
	created_at: string
	completed_at: string | null
}

const db = new Database('./src/api/todos.db', { create: true })

db.run(`
	CREATE TABLE IF NOT EXISTS todos (
		id           TEXT PRIMARY KEY,
		title        TEXT NOT NULL,
		created_at   TEXT NOT NULL,
		completed_at TEXT DEFAULT NULL
	)
`)

const { n } = db.query<{ n: number }, []>('SELECT COUNT(*) as n FROM todos').get()!
if (n === 0) {
	const insert = db.prepare<void, [string, string, string, string | null]>(
		'INSERT INTO todos (id, title, created_at, completed_at) VALUES (?, ?, ?, ?)',
	)
	db.transaction(() => {
		for (const t of todosJson.todos) {
			insert.run(t.id, t.title, t.createdAt, t.completedAt)
		}
	})()
}

function rowToTodo(row: TodoRow): TodoItem {
	return {
		id: row.id,
		title: row.title,
		createdAt: row.created_at,
		completedAt: row.completed_at,
	}
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}

function badRequest(msg: string): Response {
	return new Response(JSON.stringify({ error: msg }), {
		status: 400,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}

function notFound(): Response {
	return new Response(JSON.stringify({ error: 'Not found' }), {
		status: 404,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}

export function listTodos(): Response {
	const rows = db.query<TodoRow, []>('SELECT * FROM todos ORDER BY created_at ASC').all()
	return json({ todos: rows.map(rowToTodo) })
}

export async function createTodo(req: Request): Promise<Response> {
	const body = await req.json()
	if (typeof body.title !== 'string' || !body.title.trim()) {
		return badRequest('title is required')
	}
	const id = `todo_${Date.now()}`
	const now = new Date().toISOString()
	const title = body.title.trim()
	db.run('INSERT INTO todos (id, title, created_at, completed_at) VALUES (?, ?, ?, NULL)', [
		id,
		title,
		now,
	])
	const todo = rowToTodo(
		db.query<TodoRow, [string]>('SELECT * FROM todos WHERE id = ?').get(id)!,
	)
	broadcast({ type: 'created', todo })
	return json(todo, 201)
}

export async function updateTodo(req: Request, id: string): Promise<Response> {
	const body = await req.json()
	if (!('completedAt' in body)) {
		return badRequest('completedAt is required')
	}
	const completedAt = body.completedAt as string | null
	db.run('UPDATE todos SET completed_at = ? WHERE id = ?', [completedAt, id])
	const row = db.query<TodoRow, [string]>('SELECT * FROM todos WHERE id = ?').get(id)
	if (!row) return notFound()
	const todo = rowToTodo(row)
	broadcast({ type: 'updated', todo })
	return json(todo)
}

export function deleteTodo(id: string): Response {
	const row = db.query<TodoRow, [string]>('SELECT * FROM todos WHERE id = ?').get(id)
	if (!row) return notFound()
	db.run('DELETE FROM todos WHERE id = ?', [id])
	broadcast({ type: 'deleted', id })
	return new Response(null, { status: 204 })
}
