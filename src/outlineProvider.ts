import * as vscode from "vscode";

export class PulseOutlineProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        
        const funcPattern = /^\s*(?:static\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/;
        const classPattern = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
        const varPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\+|-|\*|\/)?=(?!=)/;
        
        let currentClass: vscode.DocumentSymbol | null = null;
        let currentClassIndent = -1;
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;
            const trimmed = text.trimStart();
            const indent = text.length - trimmed.length;
            
            // skip comments and empty lines
            if (trimmed.startsWith("#") || trimmed.trim() === "") continue;
            
            // class
            const classMatch = classPattern.exec(text);
            if (classMatch) {
                const name = classMatch[1];
                const range = new vscode.Range(i, 0, i, text.length);
                const sym = new vscode.DocumentSymbol(name, "", vscode.SymbolKind.Class, range, range);
                
                symbols.push(sym);
                currentClass = sym;
                currentClassIndent = indent;
                continue;
            }
            
            // function / method
            const funcMatch = funcPattern.exec(text);
            if (funcMatch) {
                const name = funcMatch[1];
                const params = funcMatch[2].trim();
                const range = new vscode.Range(i, 0, i, text.length);
                const isStatic = /^\s*static\s+def/.test(text);
                const sym = new vscode.DocumentSymbol(name, params ? `(${params})` : "()", vscode.SymbolKind.Function, range, range);
                
                if (currentClass && indent > currentClassIndent) {
                    sym.kind = vscode.SymbolKind.Method;
                    sym.detail = (isStatic ? "static " : "") + (params ? `(${params})` : "()");
                    currentClass.children.push(sym);
                }
                else {
                    currentClass = null;
                    currentClassIndent = -1;
                    symbols.push(sym);
                }
                continue;
            }
            
            // top-level variables only
            if (indent === 0) {
                const varMatch = varPattern.exec(text);
                if (varMatch) {
                    const name = varMatch[1];
                    
                    // skip keywords that look like assignments
                    const skip = new Set(["if", "elif", "else", "while", "for", "return", "and", "or", "not", "in", "is"]);
                    if (skip.has(name)) continue;
                    
                    const range = new vscode.Range(i, 0, i, text.length);
                    const sym = new vscode.DocumentSymbol(name, "variable", vscode.SymbolKind.Variable, range, range);
                    symbols.push(sym);
                }
            }
        }
        
        return symbols;
    }
}