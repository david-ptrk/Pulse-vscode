import * as vscode from 'vscode';
import { parseSymbols } from './symbolParser';

const KEYWORDS = [
    "if", "elif", "else", "while", "for", "break", "continue", "pass", "return", "match",
    "case", "try", "except", "finally", "raise", "import", "from", "as", "del", "in", "is",
    "and", "or", "not", "def", "class", "static", "lambda", "self", "dot", "transpose"
];

const CONSTANTS = ["True", "False", "null", "None", "NaN"];

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

const LIST_MEMBERS: Record<string, string> = {
    append: "append(item) - add item to end",
    pop: "pop(index?) - remove and return item",
    slice: "slice(start, end) - return sliced list",
    contains: "contains(item) - check if item exists",
    length: "length() - return list length",
    reverse: "reverse() - reverse in place",
    clear: "clear() - remove all items",
    sort: "sort(key?, reverse?) - sort in place",
    filter: "filter(fn) - filter items by condition",
    index: "index(item, start?) - return index of item or error",
    find: "find(item, start?) - return index or -1",
    insert: "insert(index, item) - insert at index",
    extend: "extend(iterable) - extend with list or range",
    count: "count(item) - count occurrences",
};

const DICT_MEMBERS: Record<string, string> = {
    keys: "keys() - return all keys",
    values: "values() - return all values",
    items: "items() - return (key, value) pairs",
    has: "has(key) - check if key exists",
    remove: "remove(key) - remove key (error if missing)",
    length: "length() - return number of entries",
};

const STRING_MEMBERS: Record<string, string> = {
    upper: "upper() - convert to uppercase",
    lower: "lower() - convert to lowercase",
    trim: "trim() - remove leading/trailing whitespace",
    split: "split(sep?) - split into list",
    join: "join(iterable) - join list of strings",
    replace: "replace(old, new) - replace occurrences",
    starts_with: "starts_with(prefix) - check prefix",
    ends_with: "ends_with(suffix) - check suffix",
    contains: "contains(sub) - check substring",
    find: "find(sub, start?) - find substring index",
    index: "index(sub, start?) - find index or error",
    count: "count(sub) - count substring occurrences",
    format: "format(*args) - replace {} placeholders",
    length: "length() - string length",
};

export class PulseCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        if (this.isInsiderStringOrComment(linePrefix)) {
            return [];
        }
        
        // member completions after dot
        const dotMatch = /([a-zA-Z_][a-zA-Z0-9_]*)\.$/.exec(linePrefix);
        if (dotMatch) {
            return this.getMemberCompletions(dotMatch[1], document);
        }
        
        const items: vscode.CompletionItem[] = [];
        
        // keywords
        for (const keyword of KEYWORDS) {
            const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
            item.detail = "Pulse keyword";
            items.push(item);
        }
        
        // constants
        for (const constant of CONSTANTS) {
            const item = new vscode.CompletionItem(constant, vscode.CompletionItemKind.Constant);
            item.detail = "Pulse constant";
            items.push(item);
        }
        
        // builtins
        for (const [name, signature] of Object.entries(BUILTINS)) {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
            item.detail = signature;
            item.insertText = new vscode.SnippetString(`${name}($1)$0`);
            items.push(item);
        }
        
        // snippets
        for (const [label, snippet, doc] of SNIPPETS) {
            const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
            item.insertText = new vscode.SnippetString(snippet);
            item.documentation = new vscode.MarkdownString(doc);
            item.detail = "Pulse snippet";
            item.sortText = `z_${label}`;
            items.push(item);
        }
        
        // dynamic symbols from current file
        const symbols = parseSymbols(document);
        for (const sym of symbols) {
            const kind = sym.kind === "function" ? vscode.CompletionItemKind.Function :
                        sym.kind === "class" ? vscode.CompletionItemKind.Class :
                        sym.kind === "parameter" ? vscode.CompletionItemKind.Variable :
                                                vscode.CompletionItemKind.Variable;
            
            const item = new vscode.CompletionItem(sym.name, kind);
            item.detail = `Pulse ${sym.kind} - line ${sym.line + 1}`;
            item.sortText = `a_${sym.name}`;
            items.push(item);
        }
        
        return items;
    }
    
    private getMemberCompletions(varName: string, document: vscode.TextDocument): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        // infer type from assignment in document
        const inferredType = this.inferType(varName, document);
        
        const memberMap = inferredType === "list" ? LIST_MEMBERS :
                        inferredType === "dict" ? DICT_MEMBERS :
                        inferredType === "string" ? STRING_MEMBERS : null;
        
        if (memberMap) {
            for (const [name, doc] of Object.entries(memberMap)) {
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Method);
                item.detail = doc;
                item.insertText = new vscode.SnippetString(`${name}($1)$0`);
                items.push(item);
            }
            return items;
        }
        
        // unknown type - show methods from all three
        for (const members of [LIST_MEMBERS, DICT_MEMBERS, STRING_MEMBERS]) {
            for (const [name, doc] of Object.entries(members)) {
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Method);
                item.detail = doc;
                item.insertText = new vscode.SnippetString(`${name}($1)$0`);
                items.push(item);
            }
        }
        
        // also show methods of classes defined in current file
        const symbols = parseSymbols(document);
        for (const sym of symbols.filter(s => s.kind === "function")) {
            const item = new vscode.CompletionItem(sym.name, vscode.CompletionItemKind.Method);
            item.detail = `Pulse method - line ${sym.line + 1}`;
            items.push(item);
        }
        
        return items;
    }
    
    private inferType(varName: string, document: vscode.TextDocument): string | null {
        const listPattern = new RegExp(`\\b${varName}\\s*=\\s*\\[`);
        const dictPattern = new RegExp(`\\b${varName}\\s*=\\s*\\{`);
        const stringPattern = new RegExp(`\\b${varName}\\s*=\\s*["'f]`);
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            if (listPattern.test(line)) return "list";
            if (dictPattern.test(line)) return "dict";
            if (stringPattern.test(line)) return "string";
        }
        
        return null;
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