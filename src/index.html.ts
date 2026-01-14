import { ModuleTodo } from './components/module-todo/module-todo.html'
import { html } from './html'

export function Page() {
	return html`<!doctype html>
		<html>
			<head>
				<meta charset="utf-8" />
				<title>Le Todo Truc</title>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="stylesheet" href="/assets/main.css" />
			</head>
			<body>
				<main id="app" class="content-grid">${ModuleTodo()}</main>
				<script type="module" src="/assets/main.js"></script>
			</body>
		</html>`
}
