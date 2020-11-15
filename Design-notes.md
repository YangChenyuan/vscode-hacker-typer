# Design notes

## Record

For different file, use some like `onActiveDocumentChange` event handler to save and clean buffers (with name `filename+timestamp`)

- `workspace.onDidSaveTextDocument`
- `window.onDidChangeActiveTextEditor`
- an event fired when workspace will be closed. (To be done)

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