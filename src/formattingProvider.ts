import * as vscode from "vscode";

export class PulseFormattingProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = [];
        const indentChar = options.insertSpaces ? " ".repeat(options.tabSize) : "\t";
        
        const lines: string[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            lines.push(document.lineAt(i).text);
        }
        
        const formatted = this.formatLines(lines, indentChar);
        
        // replace entire document with formatted content
        const fullRange = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
        );
        
        edits.push(vscode.TextEdit.replace(fullRange, formatted.join("\n")));
        return edits;
    }
    
    private formatLines(lines: string[], indentChar: string): string[] {
        const result: string[] = [];
        
        const increaseAfter  = /^(if|elif|else|for|while|def|class|try|except|finally|match|case)\b.*:\s*$/;
        const decreaseBefore = /^(elif|else|except|finally)\b/;
        
        let indentLevel = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            const trimmed = raw.trim();
            
            // preserve empty lines
            if (trimmed === "") {
                result.push("");
                continue;
            }
            
            // preserve comments at their current indentation
            if (trimmed.startsWith("#")) {
                result.push(indentChar.repeat(indentLevel) + trimmed);
                continue;
            }
            
            // decrease indent before elif/else/except/finally
            if (decreaseBefore.test(trimmed) && indentLevel > 0) {
                indentLevel--;
            }
            
            // apply current indent
            result.push(indentChar.repeat(indentLevel) + trimmed);
            
            // increase indent after block headers
            if (increaseAfter.test(trimmed)) {
                indentLevel++;
                continue;
            }
            
            // look ahead - if next non-empty line dedents, reduce level
            const nextLine = this.getNextNonEmptyLine(lines, i + 1);
            if (nextLine !== null) {
                const nextTrimmed = nextLine.trim();
                const nextRawIndent = nextLine.length - nextLine.trimStart().length;
                const currentExpectedIndent = indentLevel * indentChar.length;
                
                // if next line is less indented than current level, snap back
                if (nextRawIndent < currentExpectedIndent && !decreaseBefore.test(nextTrimmed)) {
                    indentLevel = Math.floor(nextRawIndent / indentChar.length);
                }
            }
        }
        
        return result;
    }
    
    private getNextNonEmptyLine(lines: string[], from: number): string | null {
        for (let i = from; i < lines.length; i++) {
            if (lines[i].trim() !== "") {
                return lines[i];
            }
        }
        return null;
    }
}

export class PulseRangeFormattingProvider implements vscode.DocumentRangeFormattingEditProvider {
    provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = [];
        const indentChar = options.insertSpaces ? " ".repeat(options.tabSize) : "\t";
        const lines: string[] = [];
        
        for (let i = range.start.line; i <= range.end.line; i++) {
            lines.push(document.lineAt(i).text);
        }
        
        // detect base indent level from first line
        const firstLine = lines[0];
        const baseIndent = firstLine.length - firstLine.trimStart().length;
        const baseLevel = Math.floor(baseIndent / (options.tabSize || 4));
        
        const formatted = this.formatRange(lines, indentChar, baseLevel);
        const fullRange = new vscode.Range(
            new vscode.Position(range.start.line, 0),
            new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length)
        );
        
        edits.push(vscode.TextEdit.replace(fullRange, formatted.join("\n")));
        return edits;
    }
    
    private formatRange(lines: string[], indentChar: string, baseLevel: number): string[] {
        const result: string[] = [];
        let indentLevel = baseLevel;
        
        const increaseAfter  = /^\s*(if|elif|else|for|while|def|class|try|except|finally|match|case)\b.*:\s*$/;
        const decreaseBefore = /^\s*(elif|else|except|finally)\b/;
        
        for (const raw of lines) {
            const trimmed = raw.trim();
            
            if (trimmed === "") {
                result.push("");
                continue;
            }
            if (trimmed.startsWith("#")) {
                result.push(indentChar.repeat(indentLevel) + trimmed);
                continue;
            }
            
            if (decreaseBefore.test(trimmed) && indentLevel > baseLevel) {
                indentLevel--;
            }
            
            result.push(indentChar.repeat(indentLevel) + trimmed);
            
            if (increaseAfter.test(trimmed)) {
                indentLevel++;
            }
        }
        
        return result;
    }
}