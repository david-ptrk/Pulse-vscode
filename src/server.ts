import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    InitializeResult,
    TextDocumentSyncKind,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    HoverParams,
    Hover,
    MarkupContent,
    MarkupKind,
    Diagnostic,
    DiagnosticSeverity,
    DidChangeTextDocumentParams,
    DidOpenTextDocumentParams,
    DidSaveTextDocumentParams,
    ReferenceParams,
    Location,
    RenameParams,
    WorkspaceEdit,
    TextEdit,
    Range,
    Position,
    DocumentSymbolParams,
    SymbolInformation,
    SymbolKind,
    SignatureHelpParams,
    SignatureHelp,
    SignatureInformation,
    ParameterInformation,
    DefinitionParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

// create connection
const connection = createConnection(ProposedFeatures.all);

// document manager
const documents = new TextDocuments(TextDocument);

// Initialize -------------------------
connection.onInitialize((params: InitializeParams): InitializeResult => {
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: [".", "(", ","],
            },
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
            renameProvider: {
                prepareProvider: true,
            },
            documentSymbolProvider: true,
            signatureHelpProvider: {
                triggerCharacters: ["(", ","],
            },
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
        },
    };
});

connection.onInitialized(() => {
    connection.console.log("Pulse Language Server initialized");
});

// Completions
const KEYWORDS = [
    "if", "else", "elif", "while", "for", "in", "def", "return",
    "class", "import", "from", "as", "try", "except", "finally",
    "raise", "del", "match", "case", "break", "continue", "pass",
    "and", "or", "not", "is", "self", "static", "lambda", "None",
    "null", "NaN", "True", "False", "dot", "transpose"
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
}

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

function parseSymbols(text: string): { name: string; kind: string; line: number }[] {
    const symbols: {name: string; kind: string; line: number }[] = [];
    const seen = new Set<string>();
    const lines = text.split("\n");
    
    const funcDef = /^\s*(?:static\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/;
    const classDef = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const varAssign = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\+|-|\*|\/)?=(?!=)/;
    const forVar = /^\s*for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\b/;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        const funcMatch = funcDef.exec(line);
        if (funcMatch) {
            if (!seen.has(funcMatch[1])) {
                seen.add(funcMatch[1]);
                symbols.push({ name: funcMatch[1], kind: "function", line: i });
            }
            funcMatch[2].split(",")
                .map(p => p.trim().split(":")[0].trim())
                .filter(p => p && p !== "self")
                .forEach(p => {
                    if (!seen.has(p)) {
                        seen.add(p);
                        symbols.push({ name: p, kind: "parameter", line: i });
                    }
                });
            continue;
        }
        
        const classMatch = classDef.exec(line);
        if (classMatch && !seen.has(classMatch[1])) {
            seen.add(classMatch[1]);
            symbols.push({ name: classMatch[1], kind: "class", line: i });
            continue;
        }
        
        const forMatch = forVar.exec(line);
        if (forMatch && !seen.has(forMatch[1])) {
            seen.add(forMatch[1]);
            symbols.push({ name: forMatch[1], kind: "variable", line: i });
            continue;
        }
        
        const varMatch = varAssign.exec(line);
        if (varMatch && !seen.has(varMatch[1]) && varMatch[1] !== "self") {
            seen.add(varMatch[1]);
            symbols.push({ name: varMatch[1], kind: "variable", line: i });
        }
    }
    
    return symbols;
}

function inferType(varName: string, text: string): string | null {
    const lines = text.split("\n");
    const listPattern = new RegExp(`\\b${varName}\\s*=\\s*\\[`);
    const dictPattern = new RegExp(`\\b${varName}\\s*=\\s*\\{`);
    const stringPattern = new RegExp(`\\b${varName}\\s*=\\s*["'f]`);
    
    for (const line of lines) {
        if (listPattern.test(line)) return "list";
        if (dictPattern.test(line)) return "dict";
        if (stringPattern.test(line)) return "string";
    }
    return null;
}

function isInsideStringOrComment(linePrefix: string): boolean {
    if (linePrefix.includes("#")) return true;
    const doubleQuotes = (linePrefix.match(/"/g) || []).length;
    const singleQuotes = (linePrefix.match(/'/g) || []).length;
    return doubleQuotes % 2 !== 0 || singleQuotes % 2 !== 0;
}

connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    
    const text = doc.getText();
    const lines = text.split("\n");
    const linePrefix = lines[params.position.line]?.substring(0, params.position.character) ?? "";
    
    if (isInsideStringOrComment(linePrefix)) return [];
    
    // member completions after dot
    const dotMatch = /([a-zA-Z_][a-zA-Z0-9_]*)\.$/.exec(linePrefix);
    if (dotMatch) {
        const varName = dotMatch[1];
        const type = inferType(varName, text);
        const members = 
            type === "list" ? LIST_MEMBERS :
            type === "dict" ? DICT_MEMBERS :
            type === "string" ? STRING_MEMBERS :
            { ...LIST_MEMBERS, ...DICT_MEMBERS, ...STRING_MEMBERS };
        
        return Object.entries(members).map(([name, detail]) => ({
            label: name,
            kind: CompletionItemKind.Method,
            detail,
            insertText: `${name}($1)$0`,
            insertTextFormat: 2,
        }));
    }
    
    const items: CompletionItem[] = [];
    
    // keywords
    KEYWORDS.forEach(kw => items.push({
        label: kw,
        kind: CompletionItemKind.Keyword,
        detail: "Pulse keyword",
    }));
    
    // constants
    CONSTANTS.forEach(c => items.push({
        label: c,
        kind: CompletionItemKind.Constant,
        detail: "Pulse constant",
    }));
    
    // builtins
    Object.entries(BUILTINS).forEach(([name, sig]) => items.push({
        label: name,
        kind: CompletionItemKind.Function,
        detail: sig,
        insertText: `${name}($1)$0`,
        insertTextFormat: 2,
    }));
    
    // dynamic symbols from file
    parseSymbols(text).forEach(sym => items.push({
        label: sym.name,
        kind: sym.kind === "function" ? CompletionItemKind.Function :
            sym.kind === "class" ? CompletionItemKind.Class :
            CompletionItemKind.Variable,
        detail: `Pulse ${sym.kind} — line ${sym.line + 1}`,
        sortText: `a_${sym.name}`,
    }));
    
    return items;
});

// Hover
const KEYWORD_DOCS: Record<string, string> = {
    "if": "**if** - evaluates a condition and executes the block if true",
    "else": "**else** - executes when all preceding conditions are false",
    "elif": "**elif** - else-if branch, checked when previous condition was false",
    "while": "**while** - repeatedly executes a block while condition is true",
    "for": "**for** - iterates over elements of an iterable",
    "in": "**in** - membership test operator",
    "def": "**def** - defines a new function",
    "return": "**return** - exits a function, optionally returning a value",
    "class": "**class** - defines a new class",
    "import": "**import** - imports a module",
    "from": "**from** - imports specific names from a module",
    "as": "**as** - creates an alias for an import or exception",
    "try": "**try** - begins an exception-handling block",
    "except": "**except** - catches exceptions from a try block",
    "finally": "**finally** - always executes after try/except",
    "raise": "**raise** - raises an exception",
    "del": "**del** - deletes a variable or subscript",
    "match": "**match** - structural pattern matching on a subject",
    "case": "**case** - defines a pattern branch inside a match block",
    "break": "**break** - exits the nearest enclosing loop",
    "continue": "**continue** - skips to the next iteration of the loop",
    "pass": "**pass** - no-op placeholder statement",
    "and": "**and** - logical AND operator",
    "or": "**or** - logical OR operator",
    "not": "**not** - logical NOT operator",
    "is": "**is** - identity comparison operator",
    "self": "**self** - refers to the current class instance",
    "static": "**static** - marks a method as static, no implicit self",
    "lambda": "**lambda** - defines an anonymous inline function\n\n`lambda x, y: x + y`",
    "None": "**None** - represents the absence of a value",
    "null": "**null** - represents the absence of a value",
    "NaN": "**NaN** - not a number, result of invalid numeric operations",
    "True": "**True** - boolean true value",
    "False": "**False** - boolean false value",
    "dot": "**dot** - matrix dot product operator",
    "transpose": "**transpose** - matrix transpose operator",
};

const BUILTIN_HOVER: Record<string, { signature: string; doc: string }> = {
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

function getWordAtPosition(text: string, line: number, character: number): string {
    const lines = text.split("\n");
    const lineText = lines[line] ?? "";
    let start = character;
    let end = character;
    
    while (start > 0 && /\w/.test(lineText[start - 1])) start--;
    while (end < lineText.length && /\w/.test(lineText[end])) end++;
    
    return lineText.slice(start, end);
}

connection.onHover((params: HoverParams): Hover | null => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    
    const text = doc.getText();
    const word = getWordAtPosition(text, params.position.line, params.position.character);
    if (!word) return null;
    
    // keyword hover
    if (KEYWORD_DOCS[word]) {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: KEYWORD_DOCS[word],
            }
        };
    }
    
    // builtin hover
    if (BUILTIN_HOVER[word]) {
        const { signature, doc: docStr } = BUILTIN_HOVER[word];
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `\`\`\`pulse\n${signature}\n\`\`\`\n\n${docStr}`
            }
        };
    }
    
    // user-defined symbol hover
    const symbols = parseSymbols(text);
    const sym = symbols.find(s => s.name === word);
    if (sym) {
        const lines = text.split("\n");
        if (sym.kind === "function") {
            const sigLine = lines[sym.line] ?? "";
            const sigMatch = /(?:static\s+)?def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)/.exec(sigLine);
            const sig = sigMatch ? sigMatch[0] : word;
            return {
                contents: {
                    kind:  MarkupKind.Markdown,
                    value: `\`\`\`pulse\n${sig}\n\`\`\`\n\n*(user-defined function — line ${sym.line + 1})*`,
                }
            };
        }
        
        if (sym.kind === "class") {
            return {
                contents: {
                    kind:  MarkupKind.Markdown,
                    value: `\`\`\`pulse\nclass ${sym.name}\n\`\`\`\n\n*(user-defined class — line ${sym.line + 1})*`,
                }
            };
        }
        
        // variable - show assigned value
        const assignPattern = new RegExp(`\\b${word}\\s*=\\s*(.+)`);
        for (const line of lines) {
            const m = assignPattern.exec(line);
            if (m) {
                return {
                    contents: {
                        kind:  MarkupKind.Markdown,
                        value: `\`\`\`pulse\n${word} = ${m[1].trim()}\n\`\`\`\n\n*(local variable — line ${sym.line + 1})*`,
                    }
                };
            }
        }
        
        return {
            contents: {
                kind:  MarkupKind.Markdown,
                value: `\`\`\`pulse\n${word}\n\`\`\`\n\n*(local variable — line ${sym.line + 1})*`,
            }
        };
    }
    
    return null;
});

// Diagnostics
function validateDocument(text: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = []
    const lines = text.split("\n");
    
    const blockPattern = /^\s*(if|elif|else|for|while|def|class|try|except|finally|match|case)\b(.*)$/;
    const decreaseBefore = /^\s*(elif|else|except|finally)\b/;
    const funcPattern = /^\s*(?:static\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
    const loopStart = /^\s*(for|while)\b/;
    const funcStart = /^\s*(?:static\s+)?def\b/;
    
    const seen = new Map<string, number>();
    let insideLoop = 0;
    let insideFunction = 0;
    
    const keywords = new Set([
        "if", "else", "elif", "while", "for", "in", "def", "return",
        "class", "import", "from", "as", "try", "except", "finally",
        "raise", "del", "match", "case", "break", "continue", "pass",
        "and", "or", "not", "is", "self", "static", "lambda", "None",
        "null", "NaN", "True", "False", "dot", "transpose"
    ]);
    
    const builtins = new Set([
        "print", "input", "str", "int", "float", "type", "abs", "pow", "min",
        "max", "len", "range", "round", "bool", "enumerate", "zip", "sum",
        "any", "all", "Exception", "RuntimeError", "ValueError", "TypeError",
        "IndexError", "KeyError", "AttributeError", "ZeroDivisionError",
        "NameError", "NotImplementedError",
    ]);
    
    // collect defined names
    const defined = new Set<string>();
    const assignPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\+|-|\*|\/)?=(?!=)/;
    const classPattern = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const forPattern = /^\s*for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\b/;
    const importPattern = /^\s*import\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const fromPattern = /^\s*from\s+\S+\s+import\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const exceptPattern = /^\s*except\s+\S+\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const fullFuncPattern = /^\s*(?:static\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/;
    
    for (const line of lines) {
        const fm = fullFuncPattern.exec(line);
        if (fm) {
            defined.add(fm[1]);
            fm[2].split(",").map(p => p.trim().split(":")[0].trim()).filter(Boolean).forEach(p => defined.add(p));
            continue;
        }
        const cm = classPattern.exec(line); if (cm) { defined.add(cm[1]); continue; }
        const form = forPattern.exec(line); if (form) { defined.add(form[1]); continue; }
        const im = importPattern.exec(line); if (im) { defined.add(im[1]); continue; }
        const frm = fromPattern.exec(line); if (frm) { defined.add(frm[1]); continue; }
        const em = exceptPattern.exec(line); if (em) { defined.add(em[1]); continue; }
        const am = assignPattern.exec(line); if (am) { defined.add(am[1]); }
    }
    
    const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
    const open = new Set(["(", "[", "{"]);
    const close = new Set([")", "]", "}"]);
    
    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        const trimmed = text.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        
        const stripped = text.replace(/#.*$/, "").trimEnd();
        
        // missing colon
        const blockMatch = blockPattern.exec(stripped);
        if (blockMatch) {
            const kw = blockMatch[1];
            if (!stripped.trimEnd().endsWith(":")) {
                diagnostics.push({
                    range: { start: { line: i, character: 0 }, end: { line: i, character: text.length } },
                    message: `Missing ':' after '${kw}' block header`,
                    severity: DiagnosticSeverity.Error,
                    source: "pulse",
                });
            }
        }
        
        // unmatched brackets per line
        let inString: string | null = null;
        const stack: { char: string; col: number }[] = [];
        
        for (let j = 0; j < text.length; j++) {
            const ch = text[j];
            if (!inString && (ch === '"' || ch === "'")) { inString = ch; continue; }
            if (inString && ch === inString && text[j-1] !== "\\") { inString = null; continue; }
            if (inString) continue;
            if (ch === "#") break;
            
            if (open.has(ch)) {
                stack.push({ char: ch, col: j });
            }
            else if (close.has(ch)) {
                if (stack.length === 0) {
                    diagnostics.push({
                        range: { start: { line: i, character: j }, end: { line: i, character: j + 1 } },
                        message: `Unmatched '${ch}'`,
                        severity: DiagnosticSeverity.Error,
                        source: "pulse",
                    });
                }
                else if (stack[stack.length - 1].char !== pairs[ch]) {
                    diagnostics.push({
                        range: { start: { line: i, character: j }, end: { line: i, character: j + 1 } },
                        message: `Mismatched bracket — got '${ch}'`,
                        severity: DiagnosticSeverity.Error,
                        source: "pulse",
                    });
                }
                else {
                    stack.pop();
                }
            }
        }
        
        for (const unclosed of stack) {
            const isAtEnd = unclosed.col >= text.trimEnd().length - 1;
            if (!isAtEnd) {
                diagnostics.push({
                    range: { start: { line: i, character: unclosed.col }, end: { line: i, character: unclosed.col + 1 } },
                    message: `Unclosed '${unclosed.char}'`,
                    severity: DiagnosticSeverity.Warning,
                    source: "pulse",
                });
            }
        }
        
        // duplicate functions
        const funcMatch = funcPattern.exec(text);
        if (funcMatch) {
            const name = funcMatch[1];
            if (seen.has(name)) {
                const col = text.indexOf(name);
                diagnostics.push({
                    range: { start: { line: i, character: col }, end: { line: i, character: col + name.length } },
                    message: `Duplicate function '${name}' (first defined on line ${seen.get(name)! + 1})`,
                    severity: DiagnosticSeverity.Warning,
                    source: "pulse",
                });
            }
            else {
                seen.set(name, i);
            }
        }
        
        // invalid keyword usage
        if (loopStart.test(text)) { insideLoop++; }
        if (funcStart.test(text)) { insideFunction++; }
        
        if (/^\s*break\b/.test(text) && insideLoop === 0) {
            const col = text.indexOf("break");
            diagnostics.push({ range: { start: { line: i, character: col }, end: { line: i, character: col + 5 } }, message: "'break' outside loop", severity: DiagnosticSeverity.Error, source: "pulse" });
        }
        if (/^\s*continue\b/.test(text) && insideLoop === 0) {
            const col = text.indexOf("continue");
            diagnostics.push({ range: { start: { line: i, character: col }, end: { line: i, character: col + 8 } }, message: "'continue' outside loop", severity: DiagnosticSeverity.Error, source: "pulse" });
        }
        if (/^\s*return\b/.test(text) && insideFunction === 0) {
            const col = text.indexOf("return");
            diagnostics.push({ range: { start: { line: i, character: col }, end: { line: i, character: col + 6 } }, message: "'return' outside function", severity: DiagnosticSeverity.Error, source: "pulse" });
        }
        
        // unknown variables
        const cleanedLine = text
            .replace(/#.*$/, "")
            .replace(/"[^"]*"/g, match => " ".repeat(match.length))
            .replace(/'[^']*'/g, match => " ".repeat(match.length));
        
        if (/^\s*(def|class|import|from|#)/.test(cleanedLine)) continue;
        
        const identPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        let m: RegExpExecArray | null;
        while ((m = identPattern.exec(cleanedLine)) !== null) {
            const name = m[1];
            const col  = m.index;
            if (keywords.has(name) || builtins.has(name) || defined.has(name)) continue;
            const assignLeft = new RegExp(`^\\s*${name}\\s*(?:\\+|-|\\*|\\/)?=`);
            if (assignLeft.test(cleanedLine)) continue;
            diagnostics.push({
                range: { start: { line: i, character: col }, end: { line: i, character: col + name.length } },
                message: `Unknown identifier '${name}'`,
                severity: DiagnosticSeverity.Warning,
                source: "pulse",
            });
        }
    }
    
    return diagnostics
}

documents.onDidChangeContent(change => {
    const diagnostics = validateDocument(change.document.getText());
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

documents.onDidOpen(event => {
    const diagnostics = validateDocument(event.document.getText());
    connection.sendDiagnostics({ uri: event.document.uri, diagnostics });
})

// Definition
connection.onDefinition((params: DefinitionParams): Location | null => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    
    const text = doc.getText();
    const word = getWordAtPosition(text, params.position.line, params.position.character);
    if (!word) return null;
    
    const symbols = parseSymbols(text);
    const sym = symbols.find(s => s.name === word);
    if (!sym) return null;
    
    const lines = text.split("\n");
    const lineText = lines[sym.line] ?? "";
    const col = lineText.indexOf(sym.name);
    
    return {
        uri: params.textDocument.uri,
        range: {
            start: { line: sym.line, character: col },
            end: { line: sym.line, character: col + sym.name.length },
        },
    };
});

// References
connection.onReferences((params: ReferenceParams): Location[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    
    const text = doc.getText();
    const word = getWordAtPosition(text, params.position.line, params.position.character);
    if (!word) return [];
    
    const reserved = new Set([
        "if", "else", "elif", "while", "for", "in", "def", "return",
        "class", "import", "from", "as", "try", "except", "finally",
        "raise", "del", "match", "case", "break", "continue", "pass",
        "and", "or", "not", "is", "self", "static", "lambda", "None",
        "null", "NaN", "True", "False", "dot", "transpose"
    ]);
    if (reserved.has(word)) return [];
    
    const locations: Location[] = [];
    const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const lines = text.split("\n");
    
    for (let i = 0; i < lines.length; i++) {
        const cleaned = lines[i]
            .replace(/#.*$/, match => " ".repeat(match.length))
            .replace(/"[^"]*"/g, match => " ".repeat(match.length))
            .replace(/'[^']*'/g, match => " ".repeat(match.length));
        
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(cleaned)) !== null) {
            locations.push({
                uri: params.textDocument.uri,
                range: {
                    start: { line: i, character: m.index },
                    end: { line: i, character: m.index + word.length },
                },
            });
        }
    }
    
    return locations;
})

// Rename
connection.onPrepareRename((params): Range | null => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    
    const text = doc.getText();
    const word = getWordAtPosition(text, params.position.line, params.position.character);
    if (!word) return null;
    
    const reserved = new Set([
        "if", "else", "elif", "while", "for", "in", "def", "return",
        "class", "import", "from", "as", "try", "except", "finally",
        "raise", "del", "match", "case", "break", "continue", "pass",
        "and", "or", "not", "is", "self", "static", "lambda", "None",
        "null", "NaN", "True", "False", "dot", "transpose"
    ]);
    if (reserved.has(word)) return null;
    
    const lines = text.split("\n");
    const lineText = lines[params.position.line] ?? "";
    const col = lineText.indexOf(word, Math.max(0, params.position.character - word.length));
    
    return {
        start: { line: params.position.line, character: col },
        end: { line: params.position.line, character: col + word.length },
    };
});

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    
    const text = doc.getText();
    const oldName = getWordAtPosition(text, params.position.line, params.position.character);
    if (!oldName) return null;
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(params.newName)) return null;
    
    const edits: TextEdit[] = [];
    const pattern = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const lines = text.split("\n");
    
    for (let i = 0; i < lines.length; i++) {
        const cleaned = lines[i]
            .replace(/#.*$/, match => " ".repeat(match.length))
            .replace(/"[^"]*"/g, match => " ".repeat(match.length))
            .replace(/'[^']*'/g, match => " ".repeat(match.length));
        
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(cleaned)) !== null) {
            edits.push(TextEdit.replace(
                {
                    start: { line: i, character: m.index },
                    end:   { line: i, character: m.index + oldName.length },
                },
                params.newName
            ));
        }
    }
    
    return { changes: { [params.textDocument.uri]: edits } };
});

// Document Symbols (Outline)


// Listen -------------------------
documents.listen(connection);
connection.listen();