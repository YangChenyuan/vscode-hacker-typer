# Design notes

## Record

For different file, use some like `onActiveDocumentChange` event handler to save and clean buffers (with name `filename+timestamp`)

_problem: too many changes without typing_ (can be ignored)

## Replay

Auto replay may have bugs

Stop and backspace mechanism (to check some weird points)

Disable record when replaying.