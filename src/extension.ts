import * as vscode from 'vscode';
import { PulseCompletionProvider } from "./completionProvider";
import { PulseHoverProvider } from './hoverProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log("Pulse language extension activated");
    
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { language: 'pulse', scheme: 'file' },
        new PulseCompletionProvider(),
        '.'
    );
    
    const hoverProvider = vscode.languages.registerHoverProvider(
        { language: "pulse", scheme: "file" },
        new PulseHoverProvider()
    );
    
    context.subscriptions.push(completionProvider, hoverProvider);
}

export function deactivate() {}