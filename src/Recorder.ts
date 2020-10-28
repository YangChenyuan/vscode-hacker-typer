// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as buffers from "./buffers";
import Storage from "./storage";

export default class Recorder {
  private _disposable: vscode.Disposable;
  private _textEditor: vscode.TextEditor | undefined;
  private _buffers = 0;
  private _currentChanges: vscode.TextDocumentContentChangeEvent[] = [];
  private _storage: Storage;
  
  public static isAutoSave: boolean;

  public static register(context: vscode.ExtensionContext) {
    return () => {
      // reset global buffer
      buffers.clear();

      vscode.window.showInformationMessage("Hacker Typer is now recording!");
      const recorder = new Recorder(Storage.getInstance(context));
      context.subscriptions.push(recorder);
      
      Recorder.isAutoSave = true;
      recorder.autoSave(); 
    };
  }

  constructor(storage: Storage) {
    this._storage = storage;

    let subscriptions: vscode.Disposable[] = [];

    vscode.workspace.onDidChangeTextDocument(
      this.onDidChangeTextDocument,
      this,
      subscriptions
    );

    vscode.window.onDidChangeTextEditorSelection(
      this.onDidChangeTextEditorSelection,
      this,
      subscriptions
    );

    const save = vscode.commands.registerCommand(
      "jevakallio.vscode-hacker-typer.saveMacro",
      () => {
        this.saveRecording(save);
      }
    );

    // Why?
    this._textEditor = vscode.window.activeTextEditor;
    this._disposable = vscode.Disposable.from(
      ...subscriptions,
      save
    );

    if (this._textEditor) {
      this.insertStartingPoint(this._textEditor);
    }
  }

  private insertStartingPoint(textEditor: vscode.TextEditor) {
    const content = textEditor.document.getText();
    const selections = textEditor.selections;
    const language = textEditor.document.languageId;

    buffers.insert({
      position: this._buffers++,
      content,
      language,
      selections
    });
  }

  private saveRecording(command: vscode.Disposable) {
    vscode.window
      .showInputBox({
        prompt: "Give this thing a name",
        placeHolder: "cool-macro"
      })
      .then(name => {
        if (name) {
          return this._storage
            .save({
              name,
              description: "",
              buffers: buffers.all()
            })
            .then(macro => {
              vscode.window.showInformationMessage(
                `Saved ${macro.buffers.length} buffers under "${macro.name}".`
              );
              command.dispose();
            });
        }
      });
  }

  private timeout(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  private mySave(name: string) {
    return this._storage.save({
      name,
      description: "",
      buffers: buffers.all()
    })
  }

  public autoSave() {
    if (Recorder.isAutoSave) {
      Promise.all([
        this.mySave(String(Date.now())).then(macro => {
          console.log(`Saved ${macro.buffers.length} buffers under "${macro.name}".`)
        }),
        this.timeout(10000)
      ]).then(() => this.autoSave()); 
    }
  }

  private onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
    // @TODO: Gets called while playing -- need to stop recording once over

    // store changes, selection change will commit
    this._currentChanges = e.contentChanges;
  }

  private onDidChangeTextEditorSelection(
    e: vscode.TextEditorSelectionChangeEvent
  ) {
    // @TODO: Gets called while playing -- need to stop recording once over

    // Only allow recording to one active editor at a time
    // Breaks when you leave but that's fine for now.

    // vscode.window.showWarningMessage("Selection changes!");

    if (e.textEditor !== this._textEditor) {
      return;
    }

    const changes = this._currentChanges;
    const selections = e.selections || [];
    this._currentChanges = [];

    buffers.insert({
      changes,
      selections,
      position: this._buffers++
    });
  }

  dispose() {
    if (this._disposable) {
      this._disposable.dispose();
    }
  }
}
