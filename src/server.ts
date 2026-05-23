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
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Command,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as cp from "child_process";

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
            workspace: {
                workspaceFolders: { supported: true }
            },
            codeActionProvider: true,
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
    
    // auto-import suggestions
    const alreadyImported = getImportedNames(text);
    for (const exp of PULSE_MODULES) {
        if (alreadyImported.has(exp.name)) continue;
        items.push({
            label: exp.name,
            kind: exp.kind,
            detail: `${exp.doc} (from ${exp.module})`,
            documentation: {
                kind: MarkupKind.Markdown,
                value: `**${exp.name}** from \`${exp.module}\`\n\n${exp.doc}\n\n*Auto-import:* \`from ${exp.module} import ${exp.name}\``,
            },
            additionalTextEdits: [buildImportEdit(text, exp)],
            sortText: `zz_${exp.name}`,
            filterText: exp.name,
            labelDetails: { description: `from ${exp.module}` },
        });
    }
    
    return items;
});

// Auto-imports
interface ModuleExport {
    name: string;
    module: string;
    kind: CompletionItemKind;
    doc: string;
}

const PULSE_MODULES: ModuleExport[] = [
    // datasets
    { name: "iris", module: "datasets", kind: CompletionItemKind.Function, doc: "Load the Iris flower dataset" },
    { name: "wine", module: "datasets", kind: CompletionItemKind.Function, doc: "Load the Wine recognition dataset" },
    { name: "digits", module: "datasets", kind: CompletionItemKind.Function, doc: "Load the handwritten digits datase" },
    { name: "breast_cancer", module: "datasets", kind: CompletionItemKind.Function, doc: "Load the Breast Cancer Wisconsin dataset" },
    { name: "diabetes", module: "datasets", kind: CompletionItemKind.Function, doc: "Load the Diabetes dataset" },
    { name: "make_classification", module: "datasets", kind: CompletionItemKind.Function, doc: "Generate a synthetic classification dataset" },
    { name: "make_regression", module: "datasets", kind: CompletionItemKind.Function, doc: "Generate a synthetic regression dataset" },
    { name: "make_blobs", module: "datasets", kind: CompletionItemKind.Function, doc: "Generate isotropic Gaussian blobs for clustering" },
    { name: "make_moons", module: "datasets", kind: CompletionItemKind.Function, doc: "Generate two interleaving half-circles" },
    { name: "make_circles", module: "datasets", kind: CompletionItemKind.Function, doc: "Generate a large circle containing a small circle" },
    { name: "load_csv", module: "datasets", kind: CompletionItemKind.Function, doc: "Load a CSV file into a dataset" },
    
    // io
    { name: "read_file", module: "io", kind: CompletionItemKind.Function, doc: "Read the contents of a file" },
    { name: "write_file", module: "io", kind: CompletionItemKind.Function, doc: "Write data to a file" },
    { name: "append_file", module: "io", kind: CompletionItemKind.Function, doc: "Append data to the end of a file" },
    { name: "file_exists", module: "io", kind: CompletionItemKind.Function, doc: "Check if a file exists" },
    { name: "read_lines", module: "io", kind: CompletionItemKind.Function, doc: "Read a file line by line" },
    
    // learn
    { name: "example", module: "learn", kind: CompletionItemKind.Function, doc: "Run an interactive step-by-step ML learning example for a given topic" },
    { name: "topics", module: "learn", kind: CompletionItemKind.Function, doc: "List all available ML learning topics in the learn module" },
    
    // math
    { name: "sqrt", module: "math", kind: CompletionItemKind.Function, doc: "Square root" },
    { name: "floor", module: "math", kind: CompletionItemKind.Function, doc: "Floor function" },
    { name: "ceil", module: "math", kind: CompletionItemKind.Function, doc: "Ceil function" },
    { name: "log", module: "math", kind: CompletionItemKind.Function, doc: "Natural logarithm function" },
    { name: "log2", module: "math", kind: CompletionItemKind.Function, doc: "Logarithm base 2 function" },
    { name: "log10", module: "math", kind: CompletionItemKind.Function, doc: "Logarithm base 10 function" },
    { name: "exp", module: "math", kind: CompletionItemKind.Function, doc: "Exponent function" },
    { name: "sin", module: "math", kind: CompletionItemKind.Function, doc: "Sine function" },
    { name: "cos", module: "math", kind: CompletionItemKind.Function, doc: "Cosine function" },
    { name: "tan", module: "math", kind: CompletionItemKind.Function, doc: "Tangent function" },
    { name: "abs", module: "math", kind: CompletionItemKind.Function, doc: "Absolute function" },
    { name: "pow", module: "math", kind: CompletionItemKind.Function, doc: "Power function" },
    { name: "pi", module: "math", kind: CompletionItemKind.Constant, doc: "" },
    { name: "e", module: "math", kind: CompletionItemKind.Constant, doc: "" },
    { name: "inf", module: "math", kind: CompletionItemKind.Constant, doc: "" },
    { name: "tau", module: "math", kind: CompletionItemKind.Constant, doc: "" },
    
    // metrics
    { name: "accuracy", module: "metrics", kind: CompletionItemKind.Function, doc: "Return accuracy = correct_predictions / total_predictions (0.0–1.0)" },
    { name: "precision", module: "metrics", kind: CompletionItemKind.Function, doc: "Return macro precision = TP / (TP + FP) averaged across classes" },
    { name: "recall", module: "metrics", kind: CompletionItemKind.Function, doc: "Return macro recall = TP / (TP + FN) averaged across classes" },
    { name: "f1", module: "metrics", kind: CompletionItemKind.Function, doc: "Return macro F1 score = harmonic mean of precision and recall" },
    { name: "confusion_matrix", module: "metrics", kind: CompletionItemKind.Function, doc: "Print confusion matrix with per-class accuracy breakdown" },
    { name: "classification_report", module: "metrics", kind: CompletionItemKind.Function, doc: "Print precision, recall, f1-score report per class" },
    { name: "mse", module: "metrics", kind: CompletionItemKind.Function, doc: "Return Mean Squared Error (MSE) = average squared error" },
    { name: "rmse", module: "metrics", kind: CompletionItemKind.Function, doc: "Return Root Mean Squared Error (RMSE) = sqrt(MSE)" },
    { name: "mae", module: "metrics", kind: CompletionItemKind.Function, doc: "Return Mean Absolute Error (MAE) = average absolute error" },
    { name: "r2", module: "metrics", kind: CompletionItemKind.Function, doc: "Return R² score (coefficient of determination)" },
    { name: "mape", module: "metrics", kind: CompletionItemKind.Function, doc: "Return Mean Absolute Percentage Error (MAPE) in percentage" },
    { name: "summary", module: "metrics", kind: CompletionItemKind.Function, doc: "Print full evaluation summary (auto-detects classification or regression)" },
    
    // model
    { name: "LinearRegression", module: "models", kind: CompletionItemKind.Function, doc: "Create a linear regression model for continuous prediction tasks" },
    { name: "LogisticRegression", module: "models", kind: CompletionItemKind.Function, doc: "Create a logistic regression model for binary/multi-class classification" },
    { name: "DecisionTree", module: "models", kind: CompletionItemKind.Function, doc: "Create a decision tree model for classification or regression" },
    { name: "RandomForest", module: "models", kind: CompletionItemKind.Function, doc: "Create a random forest ensemble model for classification or regression" },
    { name: "KMeans", module: "models", kind: CompletionItemKind.Function, doc: "Create a K-Means clustering model (unsupervised learning)" },
    { name: "KNN", module: "models", kind: CompletionItemKind.Function, doc: "Create a K-Nearest Neighbors classifier with configurable k" },
    { name: "SVC", module: "models", kind: CompletionItemKind.Function, doc: "Create a Support Vector Classifier using kernel methods" },
    { name: "NeuralNetwork", module: "models", kind: CompletionItemKind.Function, doc: "Create a multi-layer perceptron neural network classifier" },
    { name: "Model.auto", module: "models", kind: CompletionItemKind.Function, doc: "Automatically select and train the best model using cross-validation" },
    
    // os
    { name: "getcwd", module: "os", kind: CompletionItemKind.Function, doc: "Return current working directory" },
    { name: "chdir", module: "os", kind: CompletionItemKind.Function, doc: "Change current working directory" },
    { name: "listdir", module: "os", kind: CompletionItemKind.Function, doc: "List files and folders in a directory" },
    { name: "mkdir", module: "os", kind: CompletionItemKind.Function, doc: "Create a directory" },
    { name: "makedirs", module: "os", kind: CompletionItemKind.Function, doc: "Create directories recursively" },
    { name: "rmdir", module: "os", kind: CompletionItemKind.Function, doc: "Remove an empty directory" },
    { name: "removedirs", module: "os", kind: CompletionItemKind.Function, doc: "Remove directory and empty parent directories" },
    { name: "rmtree", module: "os", kind: CompletionItemKind.Function, doc: "Remove directory and all contents recursively" },
    { name: "remove", module: "os", kind: CompletionItemKind.Function, doc: "Delete a file" },
    { name: "rename", module: "os", kind: CompletionItemKind.Function, doc: "Rename or move a file/directory" },
    { name: "copy", module: "os", kind: CompletionItemKind.Function, doc: "Copy a file to another location" },
    { name: "exists", module: "os", kind: CompletionItemKind.Function, doc: "Check if a path exists" },
    { name: "is_file", module: "os", kind: CompletionItemKind.Function, doc: "Check if path is a file" },
    { name: "is_dir", module: "os", kind: CompletionItemKind.Function, doc: "Check if path is a directory" },
    { name: "is_abs", module: "os", kind: CompletionItemKind.Function, doc: "Check if path is absolute" },
    { name: "join", module: "os", kind: CompletionItemKind.Function, doc: "Join path components safely" },
    { name: "basename", module: "os", kind: CompletionItemKind.Function, doc: "Return final component of a path" },
    { name: "dirname", module: "os", kind: CompletionItemKind.Function, doc: "Return directory portion of a path" },
    { name: "abspath", module: "os", kind: CompletionItemKind.Function, doc: "Return absolute path" },
    { name: "splitext", module: "os", kind: CompletionItemKind.Function, doc: "Split path into root and extension" },
    { name: "split", module: "os", kind: CompletionItemKind.Function, doc: "Split path into head and tail" },
    { name: "getsize", module: "os", kind: CompletionItemKind.Function, doc: "Return file size in bytes" },
    { name: "stat", module: "os", kind: CompletionItemKind.Function, doc: "Return file metadata (size, timestamps, mode)" },
    { name: "getenv", module: "os", kind: CompletionItemKind.Function, doc: "Get environment variable value" },
    { name: "setenv", module: "os", kind: CompletionItemKind.Function, doc: "Set environment variable" },
    { name: "env_vars", module: "os", kind: CompletionItemKind.Function, doc: "Return all environment variables" },
    { name: "platform", module: "os", kind: CompletionItemKind.Function, doc: "Return operating system platform string" },
    { name: "sep", module: "os", kind: CompletionItemKind.Function, doc: "Return OS path separator" },
    
    // preprocess
    { name: "normalize", module: "preprocess", kind: CompletionItemKind.Function, doc: "L2 normalize each column to unit length." },
    { name: "standardize", module: "preprocess", kind: CompletionItemKind.Function, doc: "Standardize features to zero mean and unit variance." },
    { name: "min_max_scale", module: "preprocess", kind: CompletionItemKind.Function, doc: "Scale each feature to range [0, 1]." },
    { name: "train_test_split", module: "preprocess", kind: CompletionItemKind.Function, doc: "Split dataset into train and test sets (X_train, X_test, y_train, y_test)." },
    { name: "shuffle", module: "preprocess", kind: CompletionItemKind.Function, doc: "Randomly shuffle dataset rows." },
    { name: "flatten_data", module: "preprocess", kind: CompletionItemKind.Function, doc: "Flatten multi-dimensional samples into 2D (n_samples, features)." },
    { name: "one_hot_encode", module: "preprocess", kind: CompletionItemKind.Function, doc: "Convert integer labels into one-hot encoded vectors" },
    
    // random
    { name: "random", module: "random", kind: CompletionItemKind.Function, doc: "Return random float in [0.0, 1.0)." },
    { name: "randint", module: "random", kind: CompletionItemKind.Function, doc: "Return random integer in [a, b] inclusive." },
    { name: "uniform", module: "random", kind: CompletionItemKind.Function, doc: "Return random float in range [a, b]." },
    { name: "randrange", module: "random", kind: CompletionItemKind.Function, doc: "Return random integer from range(start, stop, step)." },
    { name: "choice", module: "random", kind: CompletionItemKind.Function, doc: "Return a random element from a list." },
    { name: "choices", module: "random", kind: CompletionItemKind.Function, doc: "Return k random elements with replacement." },
    { name: "sample", module: "random", kind: CompletionItemKind.Function, doc: "Return k unique random elements without replacement." },
    { name: "shuffle", module: "random", kind: CompletionItemKind.Function, doc: "Shuffle list in-place." },
    { name: "gauss", module: "random", kind: CompletionItemKind.Function, doc: "Gaussian distribution (mean, std deviation)." },
    { name: "normalvariate", module: "random", kind: CompletionItemKind.Function, doc: "Normal distribution (alternative to gauss)." },
    { name: "expovariate", module: "random", kind: CompletionItemKind.Function, doc: "Exponential distribution with lambda rate." },
    { name: "triangular", module: "random", kind: CompletionItemKind.Function, doc: "Triangular distribution (low, high, mode)." },
    { name: "seed", module: "random", kind: CompletionItemKind.Function, doc: "Seed RNG for reproducible results." },
    { name: "get_state", module: "random", kind: CompletionItemKind.Function, doc: "Return current RNG internal state." },
    
    // time
    { name: "now", module: "time", kind: CompletionItemKind.Function, doc: "Return the current UNIX timestamp in seconds since the epoch." },
    { name: "clock", module: "time", kind: CompletionItemKind.Function, doc: "Return a high-resolution performance counter for timing code execution." },
    { name: "sleep", module: "time", kind: CompletionItemKind.Function, doc: "Pause execution for the given number of seconds." },
];

function getImportedNames(text: string): Set<string> {
    const imported = new Set<string>();
    const fromImport   = /^\s*from\s+\S+\s+import\s+(.+)/;
    const directImport = /^\s*import\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    
    for (const line of text.split("\n")) {
        const fromMatch = fromImport.exec(line);
        if (fromMatch) {
            fromMatch[1].split(",").map(n => n.trim()).forEach(n => imported.add(n));
            continue;
        }
        const directMatch = directImport.exec(line);
        if (directMatch) imported.add(directMatch[1]);
    }
    
    return imported;
}

function buildImportEdit(text: string, exp: ModuleExport): TextEdit {
    const lines = text.split("\n");
    let lastImportLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*(import|from)\s+/.test(lines[i])) {
            lastImportLine = i;
        }
    }
    
    const importStatement = `from ${exp.module} import ${exp.name}\n`;
    
    if (lastImportLine >= 0) {
        return TextEdit.insert({ line: lastImportLine + 1, character: 0 }, importStatement);
    }
    else {
        return TextEdit.insert({ line: 0, character: 0 }, importStatement);
    }
}

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

function parseErrors(stderr: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const clean = stderr.replace(/\x1b\[[0-9;]*m/g, "");
    
    const getSeverity = (type: string): DiagnosticSeverity => {
        if (type === "Runtime Error")  return DiagnosticSeverity.Warning;
        if (type === "Semantic Error") return DiagnosticSeverity.Warning;
        return DiagnosticSeverity.Error;
    };
    
    const withLocation = /\[([^\]]+)\]\s*(.+?)\s*\n\s*-->\s*<pulse>:(\d+):(\d+)/g;
    let match: RegExpExecArray | null;
    
    while ((match = withLocation.exec(clean)) !== null) {
        const line = parseInt(match[3], 10) - 1;
        const col  = parseInt(match[4], 10) - 1;
        diagnostics.push({
            range: {
                start: { line, character: col },
                end:   { line, character: col + 1 },
            },
            message:  `[Pulse] ${match[2].trim()}`,
            severity: getSeverity(match[1]),
            source:   "pulse-interpreter",
        });
    }
    
    return diagnostics;
}

function runInterpreter(uri: string): void {
    connection.workspace.getConfiguration({ section: "pulse" }).then((config) => {
        const interpreterPath = (config as Record<string, unknown>)["interpreterPath"] as string | undefined;
        connection.console.log(`Interpreter path: ${interpreterPath}`);
        if (!interpreterPath || interpreterPath.trim() === "") {
            connection.console.log("No interpreter path configured");
            return;
        }
        
        const filePath = decodeURIComponent(uri)
            .replace(/^file:\/\/\//, "")
            .replace(/\//g, "\\");
        connection.console.log(`Running: py "${interpreterPath.trim()}" "${filePath}"`);
        
        cp.exec(
            `py "${interpreterPath.trim()}" "${filePath}"`,
            (_error: Error | null, _stdout: string, stderr: string) => {
                connection.console.log(`Stderr: ${stderr}`);
                const diagnostics = parseErrors(stderr);
                connection.console.log(`Parsed: ${JSON.stringify(diagnostics)}`);
                if (diagnostics.length > 0) {
                    const existing = staticDiagnosticsCache.get(uri) || [];
                    connection.sendDiagnostics({ uri, diagnostics: [...existing, ...diagnostics] });
                }
            }
        );
    });
}

const staticDiagnosticsCache = new Map<string, Diagnostic[]>();

documents.onDidChangeContent(change => {
    const diagnostics = validateDocument(change.document.getText());
    staticDiagnosticsCache.set(change.document.uri, diagnostics);
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

documents.onDidOpen(event => {
    const diagnostics = validateDocument(event.document.getText());
    staticDiagnosticsCache.set(event.document.uri, diagnostics);
    connection.sendDiagnostics({ uri: event.document.uri, diagnostics });
    runInterpreter(event.document.uri);
});

documents.onDidSave(event => {
    runInterpreter(event.document.uri);
});

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
connection.onDocumentSymbol((params: DocumentSymbolParams): SymbolInformation[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    
    const text = doc.getText();
    const lines = text.split("\n");
    const symbols: SymbolInformation[] = [];
    
    const funcPattern = /^\s*(?:static\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/;
    const classPattern = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const varPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\+|-|\*|\/)?=(?!=)/;
    
    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        
        const classMatch = classPattern.exec(text);
        if (classMatch) {
            symbols.push({
                name: classMatch[1],
                kind: SymbolKind.Class,
                location: { uri: params.textDocument.uri, range: { start: { line: i, character: 0 }, end: { line: i, character: text.length } } },
            });
            continue;
        }
        
        const funcMatch = funcPattern.exec(text);
        if (funcMatch) {
            symbols.push({
                name: `${funcMatch[1]}(${funcMatch[2]})`,
                kind: SymbolKind.Function,
                location: { uri: params.textDocument.uri, range: { start: { line: i, character: 0 }, end: { line: i, character: text.length } } },
            });
            continue;
        }
        
        const indent = text.length - text.trimStart().length;
        if (indent === 0) {
            const varMatch = varPattern.exec(text);
            if (varMatch) {
                symbols.push({
                    name: varMatch[1],
                    kind: SymbolKind.Variable,
                    location: { uri: params.textDocument.uri, range: { start: { line: i, character: 0 }, end: { line: i, character: text.length } } },
                });
            }
        }
    }
    
    return symbols;
})

// Signature Help
const SIGNATURES_DEFS: Record<string, { label: string; doc: string; params: string[] }> = {
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

function getCallContext(linePrefix: string): { funcName: string; paramIndex: number } | null {
    let depth = 0;
    let paramIndex = 0;
    
    for (let i = linePrefix.length - 1; i >= 0; i--) {
        const ch = linePrefix[i];
        if (ch === ")" || ch === "]" || ch === "}") { depth++; continue; }
        if (ch === "(" || ch === "[" || ch === "{") {
            if (depth > 0) { depth--; continue; }
            if (ch === "(") {
                const before = linePrefix.substring(0, i).trimEnd();
                const match  = /([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(before);
                if (!match) return null;
                return { funcName: match[1], paramIndex };
            }
            return null;
        }
        if (ch === "," && depth === 0) paramIndex++;
    }
    return null;
}

connection.onSignatureHelp((params: SignatureHelpParams): SignatureHelp | null => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    
    const text = doc.getText();
    const lines = text.split("\n");
    let combined = "";
    
    for (let i = params.position.line; i >= 0; i--) {
        const lineText = i === params.position.line
            ? (lines[i] ?? "").substring(0, params.position.character)
            : (lines[i] ?? "");
        combined = lineText + combined;
        
        const ctx = getCallContext(combined);
        if (!ctx) { if (params.position.line - i >= 5) break; continue; }
        
        const { funcName, paramIndex } = ctx;
        
        // check builtins
        const builtin = SIGNATURES_DEFS[funcName];
        if (builtin) {
            return {
                signatures: [{
                    label: builtin.label,
                    documentation: { kind: MarkupKind.Markdown, value: builtin.doc },
                    parameters: builtin.params.map(p => ({ label: p } as ParameterInformation)),
                } as SignatureInformation],
                activeSignature: 0,
                activeParameter: Math.min(paramIndex, builtin.params.length - 1),
            };
        }
        
        // check user-defined
        const funcDefPattern = new RegExp(`^\\s*(?:static\\s+)?def\\s+${funcName}\\s*\\(([^)]*)\\)`);
        for (let j = 0; j < lines.length; j++) {
            const m = funcDefPattern.exec(lines[j]);
            if (!m) continue;
            const params2 = m[1].split(",").map(p => p.trim().split(":")[0].trim()).filter(p => p && p !== "self");
            const label = `${funcName}(${params2.join(", ")})`;
            return {
                signatures: [{
                    label,
                    documentation: { kind: MarkupKind.Markdown, value: `User-defined function — line ${j + 1}` },
                    parameters: params2.map(p => ({ label: p } as ParameterInformation)),
                } as SignatureInformation],
                activeSignature: 0,
                activeParameter: Math.min(paramIndex, params2.length - 1),
            };
        }
        
        return null;
    }
    return null;
});

// Formatting
function formatText(lines: string[], indentChar: string): string[] {
    const result: string[] = [];
    let indentLevel = 0;
    
    const increaseAfter = /^(if|elif|else|for|while|def|class|try|except|finally|match|case)\b.*:\s*$/;
    const decreaseBefore = /^(elif|else|except|finally)\b/;
    
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        
        if (trimmed === "") { result.push(""); continue; }
        if (trimmed.startsWith("#")) { result.push(indentChar.repeat(indentLevel) + trimmed); continue; }
        
        if (decreaseBefore.test(trimmed) && indentLevel > 0) indentLevel--;
        result.push(indentChar.repeat(indentLevel) + trimmed);
        
        if (increaseAfter.test(trimmed)) {
            indentLevel++;
            continue;
        }
        
        const next = lines.slice(i + 1).find(l => l.trim() !== "");
        if (next !== undefined) {
            const nextIndent = next.length - next.trimStart().length;
            const currentExpected = indentLevel * indentChar.length;
            if (nextIndent < currentExpected && !decreaseBefore.test(next.trim())) {
                indentLevel = Math.floor(nextIndent / indentChar.length);
            }
        }
    }
    
    return result;
}

connection.onDocumentFormatting((params): TextEdit[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    
    const text = doc.getText();
    const lines = text.split("\n");
    const indentChar = params.options.insertSpaces ? " ".repeat(params.options.tabSize) : "\t";
    const formatted = formatText(lines, indentChar);
    const lastLine = doc.lineCount - 1;
    const lastChar = doc.getText().split("\n")[lastLine].length;
    
    return [TextEdit.replace(
        { start: { line: 0, character: 0 }, end: { line: lastLine, character: lastChar } },
        formatted.join("\n")
    )];
});

connection.onDocumentRangeFormatting((params): TextEdit[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    
    const lines = doc.getText().split("\n");
    const rangeLines = lines.slice(params.range.start.line, params.range.end.line + 1);
    const indentChar = params.options.insertSpaces ? " ".repeat(params.options.tabSize) : "\t";
    const firstLine = rangeLines[0];
    const baseIndent = firstLine.length - firstLine.trimStart().length;
    const baseLevel = Math.floor(baseIndent / (params.options.tabSize || 4));
    
    const formatted = formatText(rangeLines, indentChar);
    const lastChar = lines[params.range.end.line].length;
    
    return [TextEdit.replace(
        { start: { line: params.range.start.line, character: 0 }, end: { line: params.range.end.line, character: lastChar } },
        formatted.join("\n")
    )];
});

// Code Actions - Quick Fixes
connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    
    const text = doc.getText();
    const lines = text.split("\n");
    const actions: CodeAction[] = [];
    
    for (const diagnostic of params.context.diagnostics) {
        const line = diagnostic.range.start.line;
        const lineText = lines[line] ?? "";
        
        // Fix: missing colon
        if (diagnostic.message.includes("Missing ':'")) {
            actions.push({
                title: "Add missing ':'",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [params.textDocument.uri]: [
                            TextEdit.insert(
                                { line, character: lineText.trimEnd().length },
                                ":"
                            )
                        ]
                    }
                },
                isPreferred: true,
            });
        }
        
        // Fix: remove break outside loop
        if (diagnostic.message.includes("'break' outside loop")) {
            actions.push({
                title: "Remove 'break'",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [params.textDocument.uri]: [
                            TextEdit.del({
                                start: { line, character: 0 },
                                end: { line: line + 1, character: 0 },
                            })
                        ]
                    }
                },
                isPreferred: true,
            });
        }
        
        // Fix: remove continue outside loop
        if (diagnostic.message.includes("'continue' outside loop")) {
            actions.push({
                title: "Remove 'continue'",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [params.textDocument.uri]: [
                            TextEdit.del({
                                start: { line, character: 0 },
                                end: { line: line + 1, character: 0 },
                            })
                        ]
                    }
                },
                isPreferred: true,
            });
        }
        
        // Fix: remove return outside function
        if (diagnostic.message.includes("'return' outside function")) {
            actions.push({
                title: "Remove 'return'",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [params.textDocument.uri]: [
                            TextEdit.del({
                                start: { line, character: 0 },
                                end: { line: line + 1, character: 0 },
                            })
                        ]
                    }
                },
                isPreferred: true,
            });
        }
        
        // Fix: unknown identifier
        if (diagnostic.message.includes("Unknown identifier")) {
            const match = /Unknown identifier '([^']+)'/.exec(diagnostic.message);
            if (match) {
                const name = match[1];
                const exp = PULSE_MODULES.find(m => m.name === name);
                if (exp) {
                    const importEdit = buildImportEdit(text, exp);
                    actions.push({
                        title: `Add import: from ${exp.module} import ${exp.name}`,
                        kind: CodeActionKind.QuickFix,
                        diagnostics: [diagnostic],
                        edit: {
                            changes: {
                                [params.textDocument.uri]: [importEdit]
                            }
                        },
                        isPreferred: true,
                    });
                }
            }
        }
        
        // Fix: duplicate function
        if (diagnostic.message.includes("Duplicate function")) {
            const match = /Duplicate function '([^']+)'/.exec(diagnostic.message);
            if (match) {
                const name = match[1];
                const newName = `${name}_2`;
                const col = lineText.indexOf(name);
                actions.push({
                    title: `Rename duplicate to '${newName}'`,
                    kind: CodeActionKind.QuickFix,
                    diagnostics: [diagnostic],
                    edit: {
                        changes: {
                            [params.textDocument.uri]: [
                                TextEdit.replace(
                                    {
                                        start: { line, character: col },
                                        end: { line, character: col + name.length },
                                    },
                                    newName
                                )
                            ]
                        }
                    },
                    isPreferred: false,
                });
            }
        }
    }
    
    return actions;
});

// Listen -------------------------
documents.listen(connection);
connection.listen();