// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as buffers from "./buffers";
import Storage from "./storage";

export default class Recorder {
  private _disposable: vscode.Disposable;
  private _textEditor: vscode.TextEditor | undefined;
  private _buffers = 0;
  private _storage: Storage;
  
  public static isAutoSave: boolean;

  public static register(context: vscode.ExtensionContext) {
    return () => {
      // reset global buffer
      buffers.clear();

      console.log("RECORDING!");
      const recorder = new Recorder(Storage.getInstance(context));
      context.subscriptions.push(recorder);
    };
  }


  constructor(storage: Storage) {
    this._storage = storage;

    let subscriptions: vscode.Disposable[] = [];

    let e1 = vscode.workspace.onDidChangeTextDocument(
      this.onDidChangeTextDocument,
      this,
      subscriptions
    );

    // For active editor change
    let e2 = vscode.window.onDidChangeActiveTextEditor(
      this.activeChange,
      this,
      subscriptions
    );

    let e3 = vscode.workspace.onDidSaveTextDocument(
      this.activeChange,
      this,
      subscriptions
    );

    // Why?
    this._textEditor = vscode.window.activeTextEditor;
    this._disposable = vscode.Disposable.from(
      ...subscriptions,
      e1,
      e2,
      e3
    );

    if (this._textEditor) {
      this.insertStartingPoint(this._textEditor);
    }
  }

  private insertStartingPoint(textEditor: vscode.TextEditor) {
    const content = textEditor.document.getText();
    // const selections = textEditor.selections;
    const language = textEditor.document.languageId;

    buffers.insert({
      position: this._buffers++,
      content,
      language
    });
  }

  private mySave(name: string) {
    return this._storage.save({
      name,
      description: "",
      buffers: buffers.all()
    })
  }

  private onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
    // @TODO: Gets called while playing -- need to stop recording once over

    // store changes, selection change will commit
    // this._currentChanges.push(...e.contentChanges);

    let changes = e.contentChanges;

    buffers.insert({
      changes,
      position: this._buffers++
    })

    if (this._buffers >= 15) {
      this.activeChange();
    }
  }

  dispose() {
    if (this._disposable) {
      this._disposable.dispose();
    }
  }

  activeChange() {
    let fileName = this._textEditor?.document?.fileName ?? "no-file";
    this.mySave(fileName + "&" + String(Date.now())).then(macro => {
      console.log(`Saved ${macro.buffers.length} buffers under "${macro.name}".`)
      this.dispose();
      vscode.commands.executeCommand("jevakallio.vscode-hacker-typer.recordMacro");
    });
  }
}
