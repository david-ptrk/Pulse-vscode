import * as vscode from 'vscode';
import { PulseCompletionProvider } from "./completionProvider";
import { PulseHoverProvider } from './hoverProvider';
import { PulseDefinitionProvider } from './definitionProvider';
import { PulseDiagnosticsProvider } from './diagnosticsProvider';
import { PulseOutlineProvider } from './outlineProvider';

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
    
    const outlineProvider = vscode.languages.registerDocumentSymbolProvider(
        { language: "pulse", scheme: "file" },
        new PulseOutlineProvider()
    );
    
    const diagnosticsProvider = new PulseDiagnosticsProvider();
    diagnosticsProvider.activate(context);
    
    context.subscriptions.push(
        completionProvider, hoverProvider, definitionProvider,
        outlineProvider
    );
}

export function deactivate() {}