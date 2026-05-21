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
    const symbols: {name: string; kind: string; line: number}[] = {};
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
            funcMatch[2].
        }
    }
}

// Listen -------------------------
documents.listen(connection);
connection.listen();