# Le Todo Truc

This Repository is a showcase how to create a todo list app using Le Truc, see [le-truc](https://github.com/zeixcom/le-truc).

It uses Bun on the server side to build a static HTML scaffold and bundle the JavaScript and CSS files. Server components are written in TypeScript as functions returning html-tagged template literals.

To install dependencies:

```bash
bun install
```

To build:

```bash
bun run build
```

To serve:

```bash
bun run serve
```

Visit [http://localhost:3000](http://localhost:3000) to see the app in action.

This project was created using `bun init` in bun v1.3.1. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
