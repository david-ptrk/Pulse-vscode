import * as vscode from 'vscode';
import { PulseCompletionProvider } from "./completionProvider";
import { PulseHoverProvider } from './hoverProvider';
import { PulseDefinitionProvider } from './definitionProvider';
import { PulseDiagnosticsProvider } from './diagnosticsProvider';
import { PulseOutlineProvider } from './outlineProvider';
import { PulseSignatureProvider } from './signatureProvider';
import { PulseAutoImportProvider } from './autoImportProvider';
import { PulseRenameProvider } from './renameProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log("Pulse language extension activated");
    
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { language: 'pulse', scheme: 'file' },
        new PulseCompletionProvider(),
        '.'
    );
    
    const autoImportProvider = vscode.languages.registerCompletionItemProvider(
        { language: "pulse", scheme: "file" },
        new PulseAutoImportProvider()
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
    
    const signatureProvider = vscode.languages.registerSignatureHelpProvider(
        { language: "pulse", scheme: "file" },
        new PulseSignatureProvider(),
        "(", ","
    );
    
    const renameProvider = vscode.languages.registerRenameProvider(
        { language: "pulse", scheme: "file" },
        new PulseRenameProvider()
    );
    
    const diagnosticsProvider = new PulseDiagnosticsProvider();
    diagnosticsProvider.activate(context);
    
    context.subscriptions.push(
        completionProvider,
        autoImportProvider,
        hoverProvider,
        definitionProvider,
        outlineProvider,
        signatureProvider,
        renameProvider
    );
}

export function deactivate() {}