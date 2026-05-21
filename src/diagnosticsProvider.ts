import * as vscode from "vscode";
import { runPulseFile, PulseDiagnostic } from "./pulseRunner";

interface FunctionInfo {
    name: string,
    line: number,
}

export class PulseDiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection("pulse");
    }
    
    private runInterpreter(document: vscode.TextDocument): void {
        console.log("RUN INTERPRETER CALLED");
        
        runPulseFile(document.uri.fsPath, (results: PulseDiagnostic[]) => {
            console.log("INTERPRETER RESULTS:", results);
            
            // merge with existing static diagnostics
            const existing = this.diagnosticCollection.get(document.uri) || [];
            const all = [...existing];
            
            for (const r of results) {
                const pos = new vscode.Position(r.line, r.column);
                const range = new vscode.Range(pos, new vscode.Position(r.line, r.column + 1));
                all.push(new vscode.Diagnostic(range, `[Pulse] ${r.message}`, r.severity));
            }
            
            this.diagnosticCollection.set(document.uri, all);
        });
    }
    
    public activate(context: vscode.ExtensionContext): void {
        // run on open
        if (vscode.window.activeTextEditor) {
            this.validate(vscode.window.activeTextEditor.document);
        }
        
        // run on file open
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(doc => this.validate(doc))
        );
        
        // run on every edit
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(e => this.validate(e.document))
        );
        
        // run on save
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(doc => this.validate(doc))
        );
        
        // clear on close
        context.subscriptions.push(
            vscode.workspace.onDidCloseTextDocument(doc => this.diagnosticCollection.delete(doc.uri))
        );
        
        context.subscriptions.push(this.diagnosticCollection);
    }
    
    private validate(document: vscode.TextDocument): void {
        if (document.languageId !== "pulse") return;
        const diagnostics: vscode.Diagnostic[] = [];
        
        diagnostics.push(...this.checkMissingColons(document));
        diagnostics.push(...this.checkUnmatchedBrackets(document));
        diagnostics.push(...this.checkDuplicateFunctions(document));
        diagnostics.push(...this.checkInvalidKeywordUsage(document));
        diagnostics.push(...this.checkUnknownVariables(document));
        
        this.diagnosticCollection.set(document.uri, diagnostics);
        
        this.runInterpreter(document);
    }
    
    // Check 1: missing colon after if/elif/else/for/while/def/class/try/except/finally/match/case
    private checkMissingColons(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const pattern = /^\s*(if|elif|else|for|while|def|class|try|except|finally|match|case)\b(.*)$/;
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;
            
            // skip comments
            const stripped = text.replace(/#.*$/, "").trimEnd();
            if (!stripped) continue;
            
            const match = pattern.exec(stripped);
            if (!match) continue;
            
            const keyword = match[1];
            const rest = match[2];
            
            // else/try/finally take no condition, just need colon
            if (["else", "try", "finally"].includes(keyword)) {
                if (!stripped.trimEnd().endsWith(":")) {
                    const range = new vscode.Range(i, 0, i, text.length);
                    diagnostics.push(new vscode.Diagnostic(range, `Missing ':' after '${keyword}'`, vscode.DiagnosticSeverity.Error));
                }
                continue;
            }
            
            // for all other, line must end with colon (ignoring inline comment)
            if (!stripped.trimEnd().endsWith(":")) {
                const range = new vscode.Range(i, 0, i, text.length);
                diagnostics.push(new vscode.Diagnostic(range, `Missing ':' after '${keyword}' block header`, vscode.DiagnosticSeverity.Error));
            }
        }
        
        return diagnostics;
    }
    
    // Check 2: unmatched parentheses, brackets, braces
    private checkUnmatchedBrackets(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
        const open = new Set(["(", "[", "{"]);
        const close = new Set([")", "]", "}"]);
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            let inString: string | null = null;
            const stack: { char: string; col: number }[] = [];
            
            for (let j = 0; j < text.length; j++) {
                const ch = text[j];
                
                // track string boundaries
                if (!inString && (ch === '"' || ch === "'")) {
                    inString = ch;
                    continue;
                }
                if (inString && ch === inString && text[j - 1] !== "\\") {
                    inString = null;
                    continue;
                }
                if (inString) continue;
                
                // skip comments
                if (ch === "#") break;
                
                if (open.has(ch)) {
                    stack.push({ char: ch, col: j });
                }
                else if (close.has(ch)) {
                    if (stack.length === 0) {
                        diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, j, i, j + 1), `Unmatched '${ch}' — no opening bracket on this line`, vscode.DiagnosticSeverity.Error));
                    }
                    else if (stack[stack.length - 1].char !== pairs[ch]) {
                        diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, j, i, j + 1), `Mismatched bracket — got '${ch}' but expected closing for '${stack[stack.length - 1].char}'`, vscode.DiagnosticSeverity.Error));
                    }
                    else {
                        stack.pop();
                    }
                }
            }
            
            // anything left on stack is unclosed
            for (const unclosed of stack) {
                const range = new vscode.Range(i, unclosed.col, i, unclosed.col + 1);
                diagnostics.push(new vscode.Diagnostic(range, `Unclosed '${unclosed.char}' on this line`, vscode.DiagnosticSeverity.Warning));
            }
        }
        
        return diagnostics;
    }
    
    // Check 3: duplicat function definitions
    private checkDuplicateFunctions(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = []
        const seen = new Map<string, number>();
        const pattern = /^\s*(?:static\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            const match = pattern.exec(text);
            if (!match) continue;
            
            const name = match[1];
            if (seen.has(name)) {
                const col = text.indexOf(name);
                const range = new vscode.Range(i, col, i, col + name.length);
                diagnostics.push(new vscode.Diagnostic(range, `Duplicate function definition '${name}' (first defined on line ${seen.get(name)! + 1})`, vscode.DiagnosticSeverity.Warning));
            }
            else {
                seen.set(name, i);
            }
        }
        
        return diagnostics;
    }
    
    // Check 4: invalid keyword usage (break/continue outside loop, return outside function)
    private checkInvalidKeywordUsage(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = []
        
        let insideLoop = 0
        let insideFunction = 0;
        
        const loopStart = /^\s*(for|while)\b/;
        const funcStart = /^\s*(?:static\s+)?def\b/;
        const blockEnd = /^\s*(else|elif|except|finally)\b/;
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            const trimmed = text.trimStart();
            
            if (loopStart.test(text)) { insideLoop++; continue; }
            if (funcStart.test(text)) { insideFunction++; continue; }
            
            if (/^\s*break\b/.test(text) && insideLoop === 0) {
                const col = text.indexOf("break");
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, col, i, col + 5), "'break' used outside of a loop", vscode.DiagnosticSeverity.Error));
            }
            
            if (/^\s*continue\b/.test(text) && insideLoop === 0) {
                const col = text.indexOf("continue");
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, col, i, col + 8), "'continue' used outside of a loop", vscode.DiagnosticSeverity.Error));
            }
            
            if (/^\s*return\b/.test(text) && insideFunction === 0) {
                const col = text.indexOf("return");
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, col, i, col + 6), "'return' used outside of a function", vscode.DiagnosticSeverity.Error));
            }
        }
        
        return diagnostics;
    }
    
    // Check 5: unknown variables
    private checkUnknownVariables(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        
        const keywords = new Set([
            "if", "elif", "else", "while", "for", "break", "continue", "pass",
            "return", "match", "case", "try", "except", "finally", "raise",
            "import", "from", "as", "del", "in", "is", "and", "or", "not",
            "def", "class", "static", "lambda", "self", "dot", "transpose",
            "true", "false", "True", "False", "null", "None", "NaN",
        ]);
        
        const builtins = new Set([
            "print", "input", "str", "int", "float", "type", "abs", "pow", "min",
            "max", "len", "range", "round", "bool", "enumerate", "zip", "sum",
            "any", "all", "Exception", "RuntimeError", "ValueError", "TypeError",
            "IndexError", "KeyError", "AttributeError", "ZeroDivisionError",
            "NameError", "NotImplementedError",
        ]);
        
        // collect all defined names in the file first
        const defined = new Set<string>();
        const assignPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\+|-|\*|\/)?=/;
        const funcPattern = /^\s*(?:static\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/;
        const classPattern = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
        const forPattern = /^\s*for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\b/;
        const importPattern = /^\s*import\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
        const fromPattern = /^\s*from\s+\S+\s+import\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
        const exceptPattern = /^\s*except\s+\S+\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text
            
            const funcMatch = funcPattern.exec(text);
            if (funcMatch) {
                defined.add(funcMatch[1]);
                funcMatch[2].split(",").map(p => p.trim().split(":")[0].trim()).filter(Boolean).forEach(p => defined.add(p));
                continue;
            }
            
            const classMatch = classPattern.exec(text);
            if (classMatch) { 
                defined.add(classMatch[1]); 
                continue;
            }
            
            const forMatch = forPattern.exec(text);
            if (forMatch) {
                defined.add(forMatch[1]);
                continue;
            }
            
            const importMatch = importPattern.exec(text);
            if (importMatch) {
                defined.add(importMatch[1]);
                continue; 
            }
            
            const fromMatch = fromPattern.exec(text);
            if (fromMatch) {
                defined.add(fromMatch[1]);
                continue;
            }
            
            const exceptMatch = exceptPattern.exec(text);
            if (exceptMatch) {
                defined.add(exceptMatch[1]);
                continue;
            }
            
            const assignMatch = assignPattern.exec(text);
            if (assignMatch) {
                defined.add(assignMatch[1]); 
            }
        }
        
        // now scan for usages
        const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        const skipLinePattern = /^\s*(def|class|import|from|#)/;
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            const stripped = text.replace(/#.*$/, "").replace(/["'][^"']*["']/g, '""');
            
            if (skipLinePattern.test(stripped)) continue;
            
            let match: RegExpExecArray | null;
            while ((match = identifierPattern.exec(stripped)) !== null) {
                const name = match[1];
                const col = match.index;
                
                if (keywords.has(name)) continue;
                if (builtins.has(name)) continue;
                if (defined.has(name)) continue;
                
                // skip if it's the left side of an assignment on this line
                const assignLeft = new RegExp(`^\\s*${name}\\s*(?:\\+|-|\\*|\\/)?=`);
                if (assignLeft.test(stripped)) continue;
                
                // skip if it looks like a function being defined
                const defLine = new RegExp(`def\\s+${name}\\s*\\(`);
                if (defLine.test(stripped)) continue;
                
                const range = new vscode.Range(i, col, i, col + name.length);
                diagnostics.push(new vscode.Diagnostic(range, `Unknown identifier '${name}'`, vscode.DiagnosticSeverity.Warning));
            }
        }
        
        return diagnostics;
    }
}