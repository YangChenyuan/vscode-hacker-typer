# Design notes

## Record

For different file, use some like `onActiveDocumentChange` event handler to save and clean buffers (with name `filename+timestamp`)

- `workspace.onDidSaveTextDocument`
- `window.onDidChangeActiveTextEditor`
- an event fired when workspace will be closed. (To be done)
- Extensions can export a `deactivate` method along with their activate method that will be invoked when VS Code is shutdown

Take `contentChange` into account (exclude `selectionChange`)

_problem: too many changes without typing_ (can be ignored)

## Replay

Auto replay may have bugs

Stop and backspace mechanism (to check some weird points)

Disable record when replaying.

---

**Record** and **Replay** may have data races in `buffer`

---

11.15

Now problem is switch betweeen record and replay.

---

## Problem

`tsc` version problem: typescript 3.7+ support `?.` operation.