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
        (_error, stdout, stderr) => {
            console.log("STDOUT:", stdout);
            console.log("STDERR:", stderr);
            console.log("ERROR:", _error);
            
            const diagnostics = parseErrors(stderr + "\n" + stdout);
            
            console.log("Parsed diagnostics:", diagnostics);
            callback(diagnostics);
        }
    );
}

function parseErrors(output: string): PulseDiagnostic[] {
    const diagnostics: PulseDiagnostic[] = [];
    
    // strip ANSI color codes
    const clean = output.replace(/\x1b\[[0-9;]*m/g, "");
    
    // severity mapping
    const getSeverity = (type: string): vscode.DiagnosticSeverity => {
        if (type === "Runtime Error") return vscode.DiagnosticSeverity.Warning;
        if (type === "Semantic Error") return vscode.DiagnosticSeverity.Warning;
        return vscode.DiagnosticSeverity.Error;
    };
    
    const withLocation = /\[([^\]]+)\]\s*(.+?)\s*\n\s*-->\s*<pulse>:(\d+):(\d+)/g;
    let match: RegExpExecArray | null;
    
    while ((match = withLocation.exec(clean)) !== null) {
        const type = match[1];
        const message = match[2].trim();
        const line = parseInt(match[3], 10) - 1;
        const column = parseInt(match[4], 10) - 1;
        
        diagnostics.push({
            message,
            line,
            column,
            severity: getSeverity(type),
        });
    }
    
    const noLocation = /\[([^\]]+)\]\s*(.+?)\s*-->\s*<pulse>/g;
    
    while ((match = noLocation.exec(clean)) !== null) {
        const type = match[1];
        const message = match[2].trim();
        
        diagnostics.push({
            message: `${message} (no location)`,
            line: 0,
            column: 0,
            severity: getSeverity(type),
        });
    }
    
    return diagnostics;
}