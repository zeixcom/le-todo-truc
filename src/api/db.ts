import { Database } from 'bun:sqlite'
import { broadcast } from './sse.ts'

type TodoStatus = 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'

type TodoItem = {
	id: string
	title: string
	description: string | null
	dueDate: string | null
	authorId: string | null
	assignedToId: string | null
	tags: string[]
	status: TodoStatus
	createdAt: string
	completedAt: string | null
}

type TodoRow = {
	id: string
	title: string
	description: string | null
	due_date: string | null
	author_id: string | null
	assigned_to_id: string | null
	tags: string | null
	status: TodoStatus
	created_at: string
	completed_at: string | null
	sort_order: number
}

export type User = {
	id: string
	name: string
	email: string
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

db.run(`
	CREATE TABLE IF NOT EXISTS users (
		id    TEXT PRIMARY KEY,
		name  TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE
	)
`)

// Migrations: add columns to todos if they don't exist yet
const todoColumns = db
	.query<{ name: string }, []>('PRAGMA table_info(todos)')
	.all()
const todoColumnNames = todoColumns.map(c => c.name)

if (!todoColumnNames.includes('sort_order')) {
	db.run('ALTER TABLE todos ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
	const rows = db
		.query<{ id: string }, []>('SELECT id FROM todos ORDER BY created_at ASC')
		.all()
	const stmt = db.prepare<void, [number, string]>(
		'UPDATE todos SET sort_order = ? WHERE id = ?',
	)
	db.transaction(() => {
		rows.forEach((row, i) => stmt.run(i, row.id))
	})()
}

if (!todoColumnNames.includes('description')) {
	db.run('ALTER TABLE todos ADD COLUMN description TEXT DEFAULT NULL')
}
if (!todoColumnNames.includes('due_date')) {
	db.run('ALTER TABLE todos ADD COLUMN due_date TEXT DEFAULT NULL')
}
if (!todoColumnNames.includes('author_id')) {
	db.run('ALTER TABLE todos ADD COLUMN author_id TEXT DEFAULT NULL')
}
if (!todoColumnNames.includes('assigned_to_id')) {
	db.run('ALTER TABLE todos ADD COLUMN assigned_to_id TEXT DEFAULT NULL')
}
if (!todoColumnNames.includes('tags')) {
	db.run('ALTER TABLE todos ADD COLUMN tags TEXT DEFAULT NULL')
}
if (!todoColumnNames.includes('status')) {
	db.run("ALTER TABLE todos ADD COLUMN status TEXT NOT NULL DEFAULT 'BACKLOG'")
}

function rowToTodo(row: TodoRow): TodoItem {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		dueDate: row.due_date,
		authorId: row.author_id,
		assignedToId: row.assigned_to_id,
		tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
		status: row.status ?? 'BACKLOG',
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

function conflict(msg: string): Response {
	return new Response(JSON.stringify({ error: msg }), {
		status: 409,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}

// ── Todos ────────────────────────────────────────────────────────────────────

const VALID_STATUSES: TodoStatus[] = [
	'BACKLOG',
	'READY',
	'IN_PROGRESS',
	'IN_REVIEW',
	'DONE',
]

const TODO_COLUMN_MAP: Partial<Record<string, string>> = {
	completedAt: 'completed_at',
	title: 'title',
	description: 'description',
	dueDate: 'due_date',
	authorId: 'author_id',
	assignedToId: 'assigned_to_id',
	tags: 'tags',
	status: 'status',
}

export function listTodos(): Response {
	const rows = db
		.query<
			TodoRow,
			[]
		>('SELECT * FROM todos ORDER BY sort_order ASC, created_at ASC')
		.all()
	return json({ todos: rows.map(rowToTodo) })
}

export async function createTodo(req: Request): Promise<Response> {
	const body = await req.json()
	if (typeof body.title !== 'string' || !body.title.trim()) {
		return badRequest('title is required')
	}
	if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
		return badRequest(`status must be one of: ${VALID_STATUSES.join(', ')}`)
	}
	const id = `todo_${Date.now()}`
	const now = new Date().toISOString()
	const title = body.title.trim()
	const description =
		typeof body.description === 'string' ? body.description : null
	const dueDate = typeof body.dueDate === 'string' ? body.dueDate : null
	const authorId = typeof body.authorId === 'string' ? body.authorId : null
	const assignedToId =
		typeof body.assignedToId === 'string' ? body.assignedToId : null
	const tags = Array.isArray(body.tags)
		? (body.tags as string[]).join(',')
		: null
	const status: TodoStatus = body.status ?? 'BACKLOG'

	// biome-ignore lint/style/noNonNullAssertion: example
	const { maxOrder } = db
		.query<
			{ maxOrder: number },
			[]
		>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS maxOrder FROM todos')
		.get()!
	db.run(
		`INSERT INTO todos
			(id, title, description, due_date, author_id, assigned_to_id, tags, status, created_at, completed_at, sort_order)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
		[
			id,
			title,
			description,
			dueDate,
			authorId,
			assignedToId,
			tags,
			status,
			now,
			maxOrder,
		],
	)
	const todo = rowToTodo(
		// biome-ignore lint/style/noNonNullAssertion: example
		db.query<TodoRow, [string]>('SELECT * FROM todos WHERE id = ?').get(id)!,
	)
	broadcast({ type: 'created', todo })
	return json(todo, 201)
}

export async function updateTodo(req: Request, id: string): Promise<Response> {
	const body = await req.json()

	if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
		return badRequest(`status must be one of: ${VALID_STATUSES.join(', ')}`)
	}

	const updates: [string, string | null][] = []
	for (const [key, col] of Object.entries(TODO_COLUMN_MAP)) {
		if (!(key in body)) continue
		const raw = body[key]
		const val: string | null =
			key === 'tags' && Array.isArray(raw)
				? (raw as string[]).join(',')
				: (raw as string | null)
		// biome-ignore lint/style/noNonNullAssertion: col always defined via map
		updates.push([col!, val])
	}

	if (updates.length === 0) {
		return badRequest(
			`at least one of the following fields is required: ${Object.keys(TODO_COLUMN_MAP).join(', ')}`,
		)
	}

	const setClauses = updates.map(([col]) => `${col} = ?`).join(', ')
	const values = updates.map(([, val]) => val)
	db.run(`UPDATE todos SET ${setClauses} WHERE id = ?`, [...values, id])

	const row = db
		.query<TodoRow, [string]>('SELECT * FROM todos WHERE id = ?')
		.get(id)
	if (!row) return notFound()
	const todo = rowToTodo(row)
	broadcast({ type: 'updated', todo })
	return json(todo)
}

export function deleteTodo(id: string): Response {
	const row = db
		.query<TodoRow, [string]>('SELECT * FROM todos WHERE id = ?')
		.get(id)
	if (!row) return notFound()
	db.run('DELETE FROM todos WHERE id = ?', [id])
	broadcast({ type: 'deleted', id })
	return new Response(null, { status: 204 })
}

export async function reorderTodos(req: Request): Promise<Response> {
	const body = await req.json()
	if (!Array.isArray(body.ids)) {
		return badRequest('ids is required as an array')
	}
	const ids = body.ids as string[]
	const stmt = db.prepare<void, [number, string]>(
		'UPDATE todos SET sort_order = ? WHERE id = ?',
	)
	db.transaction(() => {
		ids.forEach((id, i) => stmt.run(i, id))
	})()
	broadcast({ type: 'reordered', ids })
	return new Response(null, { status: 204 })
}

// ── Users ────────────────────────────────────────────────────────────────────

export function listUsers(): Response {
	const users = db
		.query<User, []>('SELECT * FROM users ORDER BY name ASC')
		.all()
	return json({ users })
}

export function listUserOptions(): Response {
	const users = db
		.query<User, []>('SELECT * FROM users ORDER BY name ASC')
		.all()
	return json(users.map(u => ({ value: u.name, label: u.name })))
}

export async function createUser(req: Request): Promise<Response> {
	const body = await req.json()
	if (typeof body.name !== 'string' || !body.name.trim()) {
		return badRequest('name is required')
	}
	if (typeof body.email !== 'string' || !body.email.trim()) {
		return badRequest('email is required')
	}
	const id = `user_${Date.now()}`
	const name = body.name.trim()
	const email = body.email.trim().toLowerCase()
	try {
		db.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
			id,
			name,
			email,
		])
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE')) {
			return conflict(`email '${email}' is already in use`)
		}
		throw err
	}
	// biome-ignore lint/style/noNonNullAssertion: row was just inserted
	const user = db
		.query<User, [string]>('SELECT * FROM users WHERE id = ?')
		.get(id)!
	return json(user, 201)
}

export function getUser(id: string): Response {
	const user = db
		.query<User, [string]>('SELECT * FROM users WHERE id = ?')
		.get(id)
	if (!user) return notFound()
	return json(user)
}

export async function updateUser(req: Request, id: string): Promise<Response> {
	const existing = db
		.query<User, [string]>('SELECT * FROM users WHERE id = ?')
		.get(id)
	if (!existing) return notFound()

	const body = await req.json()
	const name =
		typeof body.name === 'string' && body.name.trim()
			? body.name.trim()
			: existing.name
	const email =
		typeof body.email === 'string' && body.email.trim()
			? body.email.trim().toLowerCase()
			: existing.email

	try {
		db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [
			name,
			email,
			id,
		])
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE')) {
			return conflict(`email '${email}' is already in use`)
		}
		throw err
	}

	// biome-ignore lint/style/noNonNullAssertion: row was just updated
	const user = db
		.query<User, [string]>('SELECT * FROM users WHERE id = ?')
		.get(id)!
	return json(user)
}

export function deleteUser(id: string): Response {
	const user = db
		.query<User, [string]>('SELECT * FROM users WHERE id = ?')
		.get(id)
	if (!user) return notFound()
	db.run('DELETE FROM users WHERE id = ?', [id])
	return new Response(null, { status: 204 })
}
