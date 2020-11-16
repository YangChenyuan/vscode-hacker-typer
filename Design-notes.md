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

> @dbaeumer and I did a change where you can return a promise from the `deactivate` function. The VSCode extension host will go down in 10 seconds regardless if your promise completes or not (we must have a time box). If you are doing data critical things in the `deactivate`, I believe the approach is wrong, perhaps you could always save the files to a temporary location and synchronize at better times than on shut-down. Also, the `deactivate` is not the time to veto or prompt for saving, etc. `deactivate` means VS Code is going down or has went down due to a crash. If you want to have some sort of veto API, then please create a new issue asking for it. (From [VS Code issue](https://github.com/microsoft/vscode/issues/941))