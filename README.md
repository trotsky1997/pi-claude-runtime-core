# pi-claude-runtime-core

Shared Claude-style runtime contracts and helpers for Pi packages.

This package is the internal foundation for sibling packages such as:

- `pi-claude-todo-v2`
- `pi-claude-plan-mode`
- `pi-claude-subagent`

It is not a standalone Pi extension package by itself. Instead, it provides shared modules for:

- managed runtime schemas
- managed task registry helpers
- runtime bridge coordination
- team-state persistence
- agent discovery

## Install

You usually get this package transitively through `pi-claude-todo-v2`, `pi-claude-plan-mode`, or `pi-claude-subagent`, but Pi can also fetch it directly from GitHub:

```bash
pi install -l git:github.com/trotsky1997/pi-claude-runtime-core
```

```bash
pi install git:github.com/trotsky1997/pi-claude-runtime-core
```

Direct `pi install` works because Pi can cache the package like any other Git-backed dependency, but this package does not register interactive commands or tools by itself.

Package authors can also depend on it from GitHub with npm:

```bash
npm install git+https://github.com/trotsky1997/pi-claude-runtime-core.git#main
```

Or from a local checkout while developing these packages together:

```bash
npm install /absolute/path/to/pi-claude-runtime-core
```

## Exports

- `pi-claude-runtime-core/runtime-bridge`
- `pi-claude-runtime-core/managed-task-registry`
- `pi-claude-runtime-core/managed-task-schemas`
- `pi-claude-runtime-core/managed-runtime-schemas`
- `pi-claude-runtime-core/team-state`
- `pi-claude-runtime-core/agent-discovery`
