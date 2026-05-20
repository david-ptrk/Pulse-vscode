import * as vscode from "vscode";

export class PulseReferencesProvider implements vscode.ReferenceProvider {
    provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext): vscode.Location[] {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return [];
        
        const word = document.getText(range);
        if (!word) return [];
        
        // skip keywords and constants
        const reserved = new Set([
            "if", "elif", "else", "while", "for", "break", "continue", "pass", "return", "match", "case",
            "try", "except", "finally", "raise", "import", "from", "as", "del", "in", "is", "and", "or",
            "not", "def", "class", "static", "lambda", "self", "dot", "transpose", "True", "False", "null",
            "None", "NaN",
        ]);
        if (reserved.has(word)) return [];
        
        const locations: vscode.Location[] = [];
        const pattern = new RegExp(`\\b${this.escapeRegex(word)}\\b`, "g");
        
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            
            // strip comments and string contents before scanning
            const stripped = this.maskStringsAndComments(lineText);
            
            // optionally skip the definition line itself
            if (!context.includeDeclaration) {
                const isDef = new RegExp(`^\\s*(?:static\\s+)?def\\s+${this.escapeRegex(word)}\\s*\\(`).test(lineText);
                const isClass = new RegExp(`^\\s*class\\s+${this.escapeRegex(word)}\\b`).test(lineText);
                if (isDef || isClass) continue;
            }
            
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(stripped)) !== null) {
                const start = new vscode.Position(i, match.index);
                const end = new vscode.Position(i, match.index + word.length);
                locations.push(new vscode.Location(document.uri, new vscode.Range(start, end)));
            }
        }
        
        return locations;
    }
    
    private maskStringsAndComments(text: string): string {
        return text
            .replace(/#.*$/, match => " ".repeat(match.length))
            .replace(/f?"[^"]*"/g, match => " ".repeat(match.length))
            .replace(/f?'[^']*'/g, match => " ".repeat(match.length));
    }
    
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}