import * as vscode from 'vscode';

const CONSTANTS = ["True", "False", "null", "None", "NaN"];

const KEYWORDS = [
    "if", "elif", "else", "while", "for", "break", "continue", "pass", "return", "match",
    "case", "try", "except", "finally", "raise", "import", "from", "as", "del", "in", "is",
    "and", "or", "not", "def", "class", "static", "lambda", "self", "dot", "transpose"
];

const BUILTINS: Record<string, string> = {
    print: "print(*values, sep=\" \", end=\"\\n\")",
    input: "input(prompt=\"\")",
    str: "str(x)",
    int: "int(x)",
    float: "float(x)",
    type: "type(obj)",
    abs: "abs(x)",
    pow: "pow(base, exp)",
    min: "min(x1, x2, ...)",
    max: "max(x1, x2, ...)",
    len: "len(obj)",
    range: "range(stop) | range(start, stop) | range(start, stop, step)",
    round: "round(x, ndigits?)",
    bool: "bool(x)",
    enumerate: "enumerate(iterable, start?)",
    zip: "zip(*iterables)",
    sum: "sum(iterable, start?)",
    any: "any(iterable)",
    all: "all(iterable)",
};

const SNIPPETS: [string, string, string][] = [
    ["def", "def ${1:name}(${2:params}):\n\t${3:pass}", "Define a function"],
    ["class", "class ${1:Name}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}", "Define a class"],
    ["if", "if ${1:condition}:\n\t${2:pass}", "If statement"],
    ["if-else", "if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}", "If-else statement"],
    ["for", "for ${1:item} in ${2:iterable}:\n\t${3:pass}", "For loop"],
    ["while", "while ${1:condition}:\n\t${2:pass}", "While loop"],
    ["try", "try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}", "Try-except"],
    ["match", "match ${1:subject}:\n\tcase ${2:pattern}:\n\t\t${3:pass}", "Match statement"],
    ["lambda", "lambda ${1:params}: ${2:expression}", "Lambda expression"],
    ["fstring", "f\"${1:text} {${2:expression}}\"", "F-string"],
    ["listcomp", "[${1:expr} for ${2:item} in ${3:iterable}]", "List comprehension"],
    ["listcomp-if", "[${1:expr} for ${2:item} in ${3:iterable} if ${4:condition}]", "Filtered list comprehension"],
    ["pipe", "${1:value} |> ${2:function}", "Pipe operator"],
    ["static-method", "static def ${1:name}(${2:params}):\n\t${3:pass}", "Static method"],
    ["import", "import ${1:module}", "Import"],
    ["from-import", "from ${1:module} import ${2:name}", "From import"],
];

export class PulseCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        if (this.isInsiderStringOrComment(linePrefix)) {
            return [];
        }
        
        const items: vscode.CompletionItem[] = [];
        
        for (const keyword of KEYWORDS) {
            const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
            item.detail = "Pulse keyword";
            items.push(item);
        }
        
        for (const [name, signature] of Object.entries(BUILTINS)) {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
            item.detail = signature;
            item.insertText = new vscode.SnippetString(`${name}($1)$0`);
            items.push(item);
        }
        
        for (const [label, snippet, doc] of SNIPPETS) {
            const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
            item.insertText = new vscode.SnippetString(snippet);
            item.documentation = new vscode.MarkdownString(doc);
            item.detail = "Pulse snippet";
            item.sortText = `z_${label}`;
            items.push(item);
        }
        
        for (const constant of CONSTANTS) {
            const item = new vscode.CompletionItem(constant, vscode.CompletionItemKind.Constant);
            item.detail = "Pulse constant";
            items.push(item);
        }
        
        return items;
    }
    
    private isInsiderStringOrComment(linePrefix: string): boolean {
        if (linePrefix.includes("#")) {
            return true;
        }
        const doubleQuotes = (linePrefix.match(/"/g) || []).length;
        const singleQuotes = (linePrefix.match(/'/g) || []).length;
        return doubleQuotes % 2 !== 0 || singleQuotes % 2 !== 0;
    }
}