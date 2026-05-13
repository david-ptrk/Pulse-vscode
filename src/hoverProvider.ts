import * as vscode from "vscode";
import { parseSymbols  } from "./symbolParser";

const KEYWORD_DOCS: Record<string, string> = {
    "if": "**if** - evaluates a condition and executes the block if true",
    "elif": "**elif** - else-if branch, checked when previous condition was false",
    "else": "**else** - executes when all preceding conditions are false",
    "while": "**while** - repeatedly executes a block while condition is true",
    "for": "**for** - iterates over elements of an iterable",
    "break": "**break** - exits the nearest enclosing loop",
    "continue": "**continue** - skips to the next iteration of the loop",
    "pass": "**pass** - no-op placeholder statement",
    "return": "**return** - exits a function, optionally returning a value",
    "def": "**def** - defines a new function",
    "class": "**class** - defines a new class",
    "static": "**static** - marks a method as static, no implicit self",
    "self": "**self** - refers to the current class instance",
    "lambda": "**lambda** - defines an anonymous inline function\n\n`lambda x, y: x + y`",
    "import": "**import** - imports a module",
    "from": "**from** - imports specific names from a module",
    "as": "**as** - creates an alias for an import or exception",
    "and": "**and** - logical AND operator",
    "or": "**or** - logical OR operator",
    "not": "**not** - logical NOT operator",
    "in": "**in** - membership test operator",
    "is": "**is** - identity comparison operator",
    "del": "**del** - deletes a variable or subscript",
    "raise": "**raise** - raises an exception",
    "try": "**try** - begins an exception-handling block",
    "except": "**except** - catches exceptions from a try block",
    "finally": "**finally** - always executes after try/except",
    "match": "**match** - structural pattern matching on a subject",
    "case": "**case** - defines a pattern branch inside a match block",
    "dot": "**dot** - matrix dot product operator",
    "transpose": "**transpose** - matrix transpose operator",
    "null": "**null** - represents the absence of a value",
    "None": "**None** - represents the absence of a value",
    "NaN": "**NaN** - not a number, result of invalid numeric operations",
    "True": "**True** - boolean true value",
    "False": "**False** - boolean false value",
};

const BUILTIN_DOCS: Record<string, { signature: string; doc: string }> = {
    print: { signature: "print(*values, sep=\" \", end=\"\\n\")", doc: "Print values to stdout." },
    input: { signature: "input(prompt=\"\")", doc: "Read a line from stdin." },
    str: { signature: "str(x)", doc: "Convert object to string." },
    int: { signature: "int(x)", doc: "Convert object to integer." },
    float: { signature: "float(x)", doc: "Convert object to float." },
    type: { signature: "type(obj)", doc: "Return the type of an object." },
    abs: { signature: "abs(x)", doc: "Return the absolute value of x." },
    pow: { signature: "pow(base, exp)", doc: "Return base raised to the power of exp." },
    min: { signature: "min(x1, x2, ...)", doc: "Return the minimum value." },
    max: { signature: "max(x1, x2, ...)", doc: "Return the maximum value." },
    len: { signature: "len(obj)", doc: "Return the length of an object." },
    range: { signature: "range(stop) | range(start, stop) | range(start, stop, step)", doc: "Generate a sequence of numbers." },
    round: { signature: "round(x, ndigits?)", doc: "Round x to ndigits decimal places." },
    bool: { signature: "bool(x)", doc: "Convert object to boolean." },
    enumerate: { signature: "enumerate(iterable, start?)", doc: "Return (index, value) pairs." },
    zip: { signature: "zip(*iterables)", doc: "Pair elements from multiple iterables." },
    sum: { signature: "sum(iterable, start?)", doc: "Sum all elements of an iterable." },
    any: { signature: "any(iterable)", doc: "Return true if any element is truthy." },
    all: { signature: "all(iterable)", doc: "Return true if all elements are truthy." },
};

export class PulseHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | null {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;
        
        const word = document.getText(range);
        
        // keyword hover
        if (KEYWORD_DOCS[word]) {
            return new vscode.Hover(new vscode.MarkdownString(KEYWORD_DOCS[word]));
        }
        
        // builtin hover
        if (BUILTIN_DOCS[word]) {
            const { signature, doc } = BUILTIN_DOCS[word];
            const md = new vscode.MarkdownString();
            md.appendCodeblock(signature, "pulse");
            md.appendMarkdown(`\n${doc}`);
            return new vscode.Hover(md);
        }
        
        // user-defined symbol hover
        const symbols = parseSymbols(document);
        const sym = symbols.find(s => s.name === word);
        if (sym) {
            const md = new vscode.MarkdownString();
            
            if (sym.kind === "function") {
                const sig = this.extractFunctionSignature(document, sym.line);
                md.appendCodeblock(sig, "pulse");
                md.appendMarkdown(`\n*(user-defined function - line ${sym.line + 1})*`);
            }
            else if (sym.kind === "class") {
                md.appendCodeblock(`class ${sym.name}`, "pulse");
                md.appendMarkdown(`\n(user-defined class - line ${sym.line + 1})*`);
            }
            else if (sym.kind === "parameter") {
                md.appendCodeblock(sym.name, "pulse");
                md.appendMarkdown(`\n*(parameter - line ${sym.line + 1})*`);
            }
            else {
                const val = this.extractAssignedValue(document, sym.name);
                md.appendCodeblock(val ? `${sym.name} = ${val}` : sym.name, "pulse");
                md.appendMarkdown(`\n*(local variable - line ${sym.line + 1})*`);
            }
            
            return new vscode.Hover(md);
        }
        
        return null;
    }
    
    private extractFunctionSignature(document: vscode.TextDocument, line: number): string {
        const text = document.lineAt(line).text.trim();
        const match = /(?:static\s+)?def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)/.exec(text);
        return match ? match[0] : text;
    }
    
    private extractAssignedValue(document: vscode.TextDocument, name: string): string | null {
        const pattern = new RegExp(`\\b${name}\\s*=\\s*(.+)`);
        for (let i = 0; i < document.lineCount; i++) {
            const match = pattern.exec(document.lineAt(i).text);
            if (match) return match[1].trim();
        }
        return null;
    }
}