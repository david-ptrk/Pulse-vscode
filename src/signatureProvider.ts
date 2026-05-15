import * as vscode from "vscode";

interface SignatureDef {
    label: string,
    doc: string,
    params: string[];
}

const BUILTIN_SIGNATURES: Record<string, SignatureDef> = {
    print: { label: "print(*values)", doc: "Print values to stdout.", params: ["*values"] },
    input: { label: "input(prompt?)", doc: "Read a line from stdin.", params: ["prompt?"] },
    str: { label: "str(obj)", doc: "Convert object to string.", params: ["obj"] },
    int: { label: "int(obj)", doc: "Convert object to integer.", params: ["obj"] },
    float: { label: "float(obj)", doc: "Convert object to float.", params: ["obj"] },
    bool: { label: "bool(obj)", doc: "Convert object to boolean.", params: ["obj"] },
    type: { label: "type(obj)", doc: "Return the type of an object.", params: ["obj"] },
    abs: { label: "abs(x)", doc: "Return the absolute value of x.", params: ["x"] },
    pow: { label: "pow(base, exp)", doc: "Return base raised to exp.", params: ["base", "exp"] },
    round: { label: "round(x, ndigits?)", doc: "Round x to ndigits decimal places.", params: ["x", "ndigits?"] },
    min: { label: "min(*args)", doc: "Return the minimum value.", params: ["*args"] },
    max: { label: "max(*args)", doc: "Return the maximum value.", params: ["*args"] },
    sum: { label: "sum(iterable)", doc: "Sum all elements of an iterable.", params: ["iterable"] },
    len: { label: "len(obj)", doc: "Return the length of an object.", params: ["obj"] },
    range: { label: "range(start, stop?, step?)", doc: "Generate a sequence of numbers.", params: ["start", "stop?", "step?"] },
    enumerate: { label: "enumerate(iterable, start?)", doc: "Return (index, value) pairs.", params: ["iterable", "start?"] },
    zip: { label: "zip(*iterables)", doc: "Pair elements from iterables.", params: ["*iterables"] },
    any: { label: "any(iterable)", doc: "Return true if any value is truthy.", params: ["iterable"] },
    all: { label: "all(iterable)", doc: "Return true if all values are truthy.", params: ["iterable"] },
};

export class PulseSignatureProvider implements vscode.SignatureHelpProvider {
    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position): vscode.SignatureHelp | null {
        const lineText = document.lineAt(position).text;
        const linePrefix = lineText.substring(0, position.character);
        
        // find the function call context
        const context = this.getCallContext(linePrefix);
        if (!context) return null;
        
        const { funcName, paramIndex } = context;
        
        // check builtins first
        const builtin = BUILTIN_SIGNATURES[funcName];
        if (builtin) {
            return this.buildSignatureHelp(builtin, paramIndex);
        }
        
        // check user-defined functions in document
        const userDef = this.findUserDefinedSignature(document, funcName);
        if (userDef) {
            return this.buildSignatureHelp(userDef, paramIndex);
        }
        
        return null;
    }
    
    // Helpers
    private getCallContext(linePrefix: string): {funcName: string; paramIndex: number } | null {
        // walk backwards from cursor to find opening paren and function name
        let depth = 0;
        let paramIndex = 0;
        
        for (let i = linePrefix.length - 1; i >= 0; i--) {
            const ch = linePrefix[i];
            
            if (ch === ")" || ch === "]" || ch === "}") {
                depth++;
                continue;
            }
            
            if (ch === "(" || ch === "[" || ch === "{") {
                if (depth > 0) {
                    depth--;
                    continue;
                }
                
                if (ch === "(") {
                    // found the opening paren - get function name before it
                    const before = linePrefix.substring(0, i).trimEnd();
                    const match = /([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(before);
                    if (!match) return null;
                    
                    return {funcName: match[1], paramIndex};
                }
                
                return null;
            }
            
            // count commas at depth 0 to find param index
            if (ch === "," && depth === 0) {
                paramIndex++;
            }
        }
        
        return null;
    }
    
    private buildSignatureHelp(def: SignatureDef, paramIndex: number): vscode.SignatureHelp {
        const sig = new vscode.SignatureInformation(def.label, new vscode.MarkdownString(def.doc));
        sig.parameters = def.params.map(p => new vscode.ParameterInformation(p));
        
        const help = new vscode.SignatureHelp();
        help.signatures = [sig];
        help.activeSignature = 0;
        help.activeParameter = Math.min(paramIndex, def.params.length - 1);
        
        return help;
    }
    
    private findUserDefinedSignature(document: vscode.TextDocument, funcName: string): SignatureDef | null {
        const pattern = new RegExp(`^\\s*(?:static\\s+)?def\\s+${funcName}\\s*\\(([^)]*)\\)`);
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            const match = pattern.exec(text);
            if (!match) continue;
            
            const rawParams = match[1];
            const params = rawParams.split(",").map(p => p.trim().split(":")[0].trim()).filter(p => p && p != "self");
            
            if (params.length === 0) {
                return {
                    label: `${funcName}()`,
                    doc: `User-defined function - line ${i + 1}`,
                    params: []
                };
            }
            
            const label = `${funcName}(${params.join(", ")})`;
            return {
                label,
                doc: `User-defined function - line ${i + 1}`,
                params,
            };
        }
        
        return null;
    }
}