import * as vscode from 'vscode';

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

export class PulseCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
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
        
        return items;
    }
}