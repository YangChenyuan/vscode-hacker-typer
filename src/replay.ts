import * as vscode from "vscode";
import * as buffers from "./buffers";
import Storage from "./storage";
import * as Queue from "promise-queue";

const stopPointBreakChar = `\n`; // ENTER
const replayConcurrency = 1;
const replayQueueMaxSize = Number.MAX_SAFE_INTEGER;
const replayQueue = new Queue(replayConcurrency, replayQueueMaxSize);

let isEnabled = false;
let currentBuffer: buffers.Buffer | undefined;
// let initialContent: string;

function autoReplay() {
  if (isEnabled) {
    // console.log("replay0. Queue length: " + replayQueue.getQueueLength() + ". Pending length: " + replayQueue.getPendingLength());
    replayQueue.add(
      () =>
        new Promise((resolve, reject) => {
          try {
            // console.log("replay1");
            setTimeout(()=>{autoReplay()}, 100);
            advanceBuffer(resolve, "a");
          } catch (e) {
            console.log(e);
            reject(e);
          }
        })
    );
  }
}

export function start(context: vscode.ExtensionContext) {

  const storage = Storage.getInstance(context);
  const items = storage.list();
  items.map(item => item.name)

  vscode.window.showQuickPick(items.map(item => item.name)).then(picked => {
    if (!picked) {
      return;
    }

    const macro = storage.getByName(picked);
    buffers.inject(macro.buffers);

    currentBuffer = buffers.get(0);
    if (!currentBuffer) {
      vscode.window.showErrorMessage("No active recording");
      return;
    }

    const textEditor = vscode.window.activeTextEditor;
    if (buffers.isStartingPoint(currentBuffer)) {
      setStartingPoint(currentBuffer, textEditor);
    }

    isEnabled = true;
    vscode.window.showInformationMessage(
      `Now playing ${buffers.count()} buffers from ${macro.name}!`
    );

    setTimeout(() => {autoReplay()}, 100);
  });
}

async function setStartingPoint(
  startingPoint: buffers.StartingPoint,
  textEditor: vscode.TextEditor | undefined
) {
  let editor = textEditor;
  // if no open text editor, open one
  if (!editor) {
    vscode.window.showInformationMessage("opening new window");
    const document = await vscode.workspace.openTextDocument({
      language: startingPoint.language,
      content: startingPoint.content
    });

    editor = await vscode.window.showTextDocument(document);
  } else {
    const existingEditor = editor;
    await existingEditor.edit(edit => {
      // update initial file content
      const l = existingEditor.document.lineCount;
      const range = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(
          l,
          Math.max(
            0,
            existingEditor.document.lineAt(Math.max(0, l - 1)).text.length - 1
          )
        )
      );

      edit.delete(range);
      edit.insert(new vscode.Position(0, 0), startingPoint.content);
    });
  }

    // move to next frame
  currentBuffer = buffers.get(startingPoint.position + 1);
}

export function disable() {
  isEnabled = false;
  currentBuffer = undefined;
}

export function onType({ text }: { text: string }) {
  if (isEnabled) {
    replayQueue.add(
      () =>
        new Promise((resolve, reject) => {
          try {
            advanceBuffer(resolve, text);
          } catch (e) {
            console.log(e);
            reject(e);
          }
        })
    );
  } else {
    vscode.commands.executeCommand("default:type", { text }); // TODO: type is a command
  }
}

export function onBackspace() {
  // move buffer one step backwards
  if (isEnabled && currentBuffer && currentBuffer.position > 0) {
    currentBuffer = buffers.get(currentBuffer.position - 1);
  }

  // actually execute backspace action
  vscode.commands.executeCommand("deleteLeft");
}

function updateSelections(
  range: vscode.Range,
  editor: vscode.TextEditor
) {
  editor.revealRange(
    range,
    vscode.TextEditorRevealType.InCenterIfOutsideViewport
  );
}

function advanceBuffer(done: () => void, userInput: string) {
  const editor = vscode.window.activeTextEditor;
  const buffer = currentBuffer;

  if (!editor) {
    vscode.window.showErrorMessage("No active editor");
    return done();
  }

  if (!buffer || !isEnabled) {
    disable();
    // vscode.window.showErrorMessage("No buffer to advance");
    return done();
  }

  if (buffers.isStopPoint(buffer)) {
    if (userInput === stopPointBreakChar) {
      currentBuffer = buffers.get(buffer.position + 1);
    }

    return done();
  }

  const { changes } = <buffers.Frame>buffer;

  const  updateSelectionAndAdvanceToNextBuffer = () => {
    if (changes?.[0]?.range) {
      updateSelections(changes[0].range, editor);
    }

    let position = buffer.position;
    currentBuffer = buffers.get(buffer.position + 1);

    console.log("post position: "+position+", current position: "+currentBuffer?.position+", length: "+buffers.count());

    // Ran out of buffers? Disable type capture.
    if (currentBuffer == undefined || position >= currentBuffer.position) {
      disable();
      // const existingEditor = editor;
      // await existingEditor.edit(edit => {
      //   // update initial file content
      //   const l = existingEditor.document.lineCount;
      //   const range = new vscode.Range(
      //     new vscode.Position(0, 0),
      //     new vscode.Position(
      //       l,
      //       Math.max(
      //         0,
      //         existingEditor.document.lineAt(Math.max(0, l - 1)).text.length - 1
      //       )
      //     )
      //   );

      //   edit.delete(range);
      //   edit.insert(new vscode.Position(0, 0), initialContent);
      // });
    }

    return done();
  };

  if (changes && changes.length > 0) {
    editor
      .edit(edit => applyContentChanges(changes, edit))
      .then(updateSelectionAndAdvanceToNextBuffer);
  } else {
    updateSelectionAndAdvanceToNextBuffer();
  }
}

function applyContentChanges(
  changes: vscode.TextDocumentContentChangeEvent[],
  edit: vscode.TextEditorEdit
) {
  changes.forEach(change => applyContentChange(change, edit));
}

function applyContentChange(
  change: vscode.TextDocumentContentChangeEvent,
  edit: vscode.TextEditorEdit
) {
  if (change.text === "") {
    edit.delete(change.range);
  } else if (change.rangeLength === 0) {
    edit.insert(change.range.start, change.text);
  } else {
    edit.replace(change.range, change.text);
  }
}
