import * as vscode from 'vscode';
import { PulseCompletionProvider } from "./completionProvider";
import { PulseHoverProvider } from './hoverProvider';
import { PulseDefinitionProvider } from './definitionProvider';

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
    
    const definitionProvider = vscode.languages.registerDefinitionProvider(
        { language: "pulse", scheme: "file" },
        new PulseDefinitionProvider()
    );
    
    context.subscriptions.push(completionProvider, hoverProvider, definitionProvider);
}

export function deactivate() {}