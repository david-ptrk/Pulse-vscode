import * as vscode from "vscode";

export interface PulseSymbol {
    name: string;
    kind: "variable" | "function" | "class" | "parameter";
    line: number;
}

export function parseSymbols(document: vscode.TextDocument): PulseSymbol[] {
    const symbols: PulseSymbol[] = [];
    const seen = new Set<string>();
    
    const funcDef = /^\s*(?:static\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/;
    const classDef = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const varAssign = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\+|-|\*|\/)?=/;
    const forVar = /^\s*for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\b/;
    
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        
        // functions
        const funcMatch = funcDef.exec(line);
        if (funcMatch) {
            const name = funcMatch[1];
            if (!seen.has(name)) {
                seen.add(name);
                symbols.push({ name, kind: "function", line: i });
            }
            // parameters
            const params = funcMatch[2].split(",").map(p => p.trim().split(":")[0].trim()).filter(Boolean);
            for (const param of params) {
                if (param !== "self" && !seen.has(param)) {
                    seen.add(param);
                    symbols.push({ name: param, kind: "parameter", line: i });
                }
            }
            continue;
        }
        
        // classes
        const classMatch = classDef.exec(line);
        if (classMatch) {
            const name = classMatch[1];
            if (!seen.has(name)) {
                seen.add(name);
                symbols.push({ name, kind: "class", line: i });
            }
            continue;
        }
        
        // for loop variables
        const forMatch = forVar.exec(line);
        if (forMatch) {
            const name = forMatch[1];
            if (!seen.has(name)) {
                seen.add(name);
                symbols.push({ name, kind: "variable", line: i });
            }
            continue;
        }
        
        // variable assignments
        const varMatch = varAssign.exec(line);
        if (varMatch) {
            const name = varMatch[1];
            if (!seen.has(name) && name !== "self") {
                seen.add(name);
                symbols.push({ name, kind: "variable", line: i });
            }
        }
    }
    
    return symbols;
}