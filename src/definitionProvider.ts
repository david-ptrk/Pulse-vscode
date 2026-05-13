import * as vscode from "vscode";
import { parseSymbols } from "./symbolParser";

export class PulseDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Location | null {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;
        
        const word = document.getText(range);
        const symbols = parseSymbols(document);
        const sym = symbols.find(s => s.name === word);
        
        if (!sym) return null;
        
        const targetLine = document.lineAt(sym.line);
        const targetPosition = new vscode.Position(sym.line, targetLine.text.indexOf(sym.name));
        
        return new vscode.Location(document.uri, targetPosition);
    }
}