import * as vscode from "vscode";
import * as cp from "child_process";

export interface PulseDiagnostic {
    message: string;
    line: number;
    column: number;
    severity: vscode.DiagnosticSeverity;
}

export function getInterpreterPath(): string | null {
    const config = vscode.workspace.getConfiguration("pulse");
    const interpreterPath = config.get<string>("interpreterPath");
    if (!interpreterPath || interpreterPath.trim() === "") return null;
    return interpreterPath.trim();
}

export function runPulseFile(filePath: string, callback: (diagnostics: PulseDiagnostic[]) => void): void {
    const interpreterPath = getInterpreterPath();
    
    if (!interpreterPath) {
        // no interpreter configured - skip
        callback([]);
        return;
    }
    
    cp.exec(
        `py "${interpreterPath}" "${filePath}"`,
        (_error: Error | null, _stdout: string, stderr: string) => {
            console.log("Pulse stderr:", stderr);
            console.log("Pulse error:", _error);
            if (!stderr || stderr.trim() === "") {
                // exit code 0 - no errors
                callback([]);
                return;
            }
            
            const diagnostics = parseErrors(stderr);
            console.log("Parsed diagnostics:", diagnostics);
            callback(diagnostics);
        }
    );
}

function parseErrors(stderr: string): PulseDiagnostic[] {
    const diagnostics: PulseDiagnostic[] = [];
    
    // strip ANSI color codes
    const clean = stderr.replace(/\x1b\[[0-9;]*m/g, "");
    
    // match pattern: [Syntax Error] message \n --> <pulse>:line:col
    const errorBlockPattern = /\[(Syntax Error|Lexical Error|Semantic Error|Runtime Error|Error)\]\s+(.+?)\s*\n\s*-->\s+<pulse>:(\d+):(\d+)/g;
    
    let match: RegExpExecArray | null;
    while ((match = errorBlockPattern.exec(clean)) !== null) {
        const type = match[1];
        const message = match[2].trim();
        const line = parseInt(match[3], 10) - 1;
        const column = parseInt(match[4], 10) - 1;
        
        const severity = 
            type === "Runtime Error" ? vscode.DiagnosticSeverity.Warning :
            type === "Semantic Error" ? vscode.DiagnosticSeverity.Warning :
            vscode.DiagnosticSeverity.Error;
        
        diagnostics.push({ message, line, column, severity });
    }
    
    return diagnostics;
}