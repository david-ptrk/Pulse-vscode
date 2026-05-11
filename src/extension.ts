import * as vscode from 'vscode';
import { PulseCompletionProvider } from "./completionProvider";

export function activate(context: vscode.ExtensionContext) {
    console.log("Pulse language extension activated");
    
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { language: 'pulse', scheme: 'file' },
        new PulseCompletionProvider(),
        '.'
    );
    
    context.subscriptions.push(completionProvider);
}

export function deactivate() {}