import * as vscode from "vscode";

export class PulseRenameProvider implements vscode.RenameProvider {
    prepareRename(document: vscode.TextDocument, position: vscode.Position): vscode.Range | null {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;
        
        const word = document.getText(range);
        
        // block renaming of keywords and constants
        const reserved = new Set([
            "if", "elif", "else", "while", "for", "break", "continue", "pass",
            "return", "match", "case", "try", "except", "finally", "raise",
            "import", "from", "as", "del", "in", "is", "and", "or", "not",
            "def", "class", "static", "lambda", "self", "dot", "transpose",
            "True", "False", "null", "None", "NaN",
        ]);
        
        if (reserved.has(word)) {
            throw new Error(`Cannot rename reserved keyword '${word}'`);
        }
        
        return range;
    }
    
    provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.WorkspaceEdit | null {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;
        
        const oldName = document.getText(range);
        
        if (!this.isValidIdentifier(newName)) {
            throw new Error(`'${newName}' is not a valid Pulse identifier`);
        }
        
        const edit = new vscode.WorkspaceEdit();
        const occurrences = this.findAllOccurrences(document, oldName);
        
        for (const occurrence of occurrences) {
            edit.replace(document.uri, occurrence, newName);
        }
        
        return edit;
    }
    
    // Helpers
    private findAllOccurrences(document: vscode.TextDocument, name: string): vscode.Range[] {
        const ranges: vscode.Range[] = [];
        const pattern = new RegExp(`\\b${this.escapeRegex(name)}\\b`, "g");
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            const stripped = text.replace(/#.*$/, "");
            const cleaned = this.maskStrings(stripped);
            
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(cleaned)) !== null) {
                const start = new vscode.Position(i, match.index);
                const end = new vscode.Position(i, match.index + name.length);
                ranges.push(new vscode.Range(start, end));
            }
        }
        
        return ranges;
    }
    
    private maskStrings(text: string): string {
        return text
            .replace(/"[^"]*"/g, match => " ".repeat(match.length))
            .replace(/'[^']*'/g, match => " ".repeat(match.length));
    }
    
    private isValidIdentifier(name: string): boolean {
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
    }
    
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}