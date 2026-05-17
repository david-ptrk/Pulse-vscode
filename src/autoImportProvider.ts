import * as vscode from "vscode";

interface ModuleExport {
    name: string;
    module: string;
    kind: vscode.CompletionItemKind;
    doc: string;
}

// Pulse standard library
const PULSE_MODULES: ModuleExport[] = [
    // datasets
    { name: "iris", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Load the Iris flower dataset" },
    { name: "wine", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Load the Wine recognition dataset" },
    { name: "digits", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Load the handwritten digits datase" },
    { name: "breast_cancer", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Load the Breast Cancer Wisconsin dataset" },
    { name: "diabetes", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Load the Diabetes dataset" },
    { name: "make_classification", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Generate a synthetic classification dataset" },
    { name: "make_regression", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Generate a synthetic regression dataset" },
    { name: "make_blobs", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Generate isotropic Gaussian blobs for clustering" },
    { name: "make_moons", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Generate two interleaving half-circles" },
    { name: "make_circles", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Generate a large circle containing a small circle" },
    { name: "load_csv", module: "datasets", kind: vscode.CompletionItemKind.Function, doc: "Load a CSV file into a dataset" },
    
    // io
    { name: "read_file", module: "io", kind: vscode.CompletionItemKind.Function, doc: "Read the contents of a file" },
    { name: "write_file", module: "io", kind: vscode.CompletionItemKind.Function, doc: "Write data to a file" },
    { name: "append_file", module: "io", kind: vscode.CompletionItemKind.Function, doc: "Append data to the end of a file" },
    { name: "file_exists", module: "io", kind: vscode.CompletionItemKind.Function, doc: "Check if a file exists" },
    { name: "read_lines", module: "io", kind: vscode.CompletionItemKind.Function, doc: "Read a file line by line" },
    
    // learn
    { name: "example", module: "learn", kind: vscode.CompletionItemKind.Function, doc: "Run an interactive step-by-step ML learning example for a given topic" },
    { name: "topics", module: "learn", kind: vscode.CompletionItemKind.Function, doc: "List all available ML learning topics in the learn module" },
    
    // math
    { name: "sqrt", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Square root" },
    { name: "floor", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Floor function" },
    { name: "ceil", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Ceil function" },
    { name: "log", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Natural logarithm function" },
    { name: "log2", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Logarithm base 2 function" },
    { name: "log10", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Logarithm base 10 function" },
    { name: "exp", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Exponent function" },
    { name: "sin", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Sine function" },
    { name: "cos", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Cosine function" },
    { name: "tan", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Tangent function" },
    { name: "abs", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Absolute function" },
    { name: "pow", module: "math", kind: vscode.CompletionItemKind.Function, doc: "Power function" },
    { name: "pi", module: "math", kind: vscode.CompletionItemKind.Constant, doc: "" },
    { name: "e", module: "math", kind: vscode.CompletionItemKind.Constant, doc: "" },
    { name: "inf", module: "math", kind: vscode.CompletionItemKind.Constant, doc: "" },
    { name: "tau", module: "math", kind: vscode.CompletionItemKind.Constant, doc: "" },
    
    // metrics
    { name: "accuracy", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return accuracy = correct_predictions / total_predictions (0.0–1.0)" },
    { name: "precision", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return macro precision = TP / (TP + FP) averaged across classes" },
    { name: "recall", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return macro recall = TP / (TP + FN) averaged across classes" },
    { name: "f1", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return macro F1 score = harmonic mean of precision and recall" },
    { name: "confusion_matrix", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Print confusion matrix with per-class accuracy breakdown" },
    { name: "classification_report", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Print precision, recall, f1-score report per class" },
    { name: "mse", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return Mean Squared Error (MSE) = average squared error" },
    { name: "rmse", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return Root Mean Squared Error (RMSE) = sqrt(MSE)" },
    { name: "mae", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return Mean Absolute Error (MAE) = average absolute error" },
    { name: "r2", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return R² score (coefficient of determination)" },
    { name: "mape", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Return Mean Absolute Percentage Error (MAPE) in percentage" },
    { name: "summary", module: "metrics", kind: vscode.CompletionItemKind.Function, doc: "Print full evaluation summary (auto-detects classification or regression)" },
    
    // model
    { name: "LinearRegression", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Create a linear regression model for continuous prediction tasks" },
    { name: "LogisticRegression", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Create a logistic regression model for binary/multi-class classification" },
    { name: "DecisionTree", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Create a decision tree model for classification or regression" },
    { name: "RandomForest", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Create a random forest ensemble model for classification or regression" },
    { name: "KMeans", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Create a K-Means clustering model (unsupervised learning)" },
    { name: "KNN", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Create a K-Nearest Neighbors classifier with configurable k" },
    { name: "SVC", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Create a Support Vector Classifier using kernel methods" },
    { name: "NeuralNetwork", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Create a multi-layer perceptron neural network classifier" },
    { name: "Model.auto", module: "models", kind: vscode.CompletionItemKind.Function, doc: "Automatically select and train the best model using cross-validation" },
    
    // os
    { name: "getcwd", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return current working directory" },
    { name: "chdir", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Change current working directory" },
    { name: "listdir", module: "os", kind: vscode.CompletionItemKind.Function, doc: "List files and folders in a directory" },
    { name: "mkdir", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Create a directory" },
    { name: "makedirs", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Create directories recursively" },
    { name: "rmdir", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Remove an empty directory" },
    { name: "removedirs", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Remove directory and empty parent directories" },
    { name: "rmtree", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Remove directory and all contents recursively" },
    { name: "remove", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Delete a file" },
    { name: "rename", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Rename or move a file/directory" },
    { name: "copy", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Copy a file to another location" },
    { name: "exists", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Check if a path exists" },
    { name: "is_file", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Check if path is a file" },
    { name: "is_dir", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Check if path is a directory" },
    { name: "is_abs", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Check if path is absolute" },
    { name: "join", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Join path components safely" },
    { name: "basename", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return final component of a path" },
    { name: "dirname", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return directory portion of a path" },
    { name: "abspath", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return absolute path" },
    { name: "splitext", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Split path into root and extension" },
    { name: "split", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Split path into head and tail" },
    { name: "getsize", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return file size in bytes" },
    { name: "stat", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return file metadata (size, timestamps, mode)" },
    { name: "getenv", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Get environment variable value" },
    { name: "setenv", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Set environment variable" },
    { name: "env_vars", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return all environment variables" },
    { name: "platform", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return operating system platform string" },
    { name: "sep", module: "os", kind: vscode.CompletionItemKind.Function, doc: "Return OS path separator" },
    
    // preprocess
    { name: "normalize", module: "preprocess", kind: vscode.CompletionItemKind.Function, doc: "L2 normalize each column to unit length." },
    { name: "standardize", module: "preprocess", kind: vscode.CompletionItemKind.Function, doc: "Standardize features to zero mean and unit variance." },
    { name: "min_max_scale", module: "preprocess", kind: vscode.CompletionItemKind.Function, doc: "Scale each feature to range [0, 1]." },
    { name: "train_test_split", module: "preprocess", kind: vscode.CompletionItemKind.Function, doc: "Split dataset into train and test sets (X_train, X_test, y_train, y_test)." },
    { name: "shuffle", module: "preprocess", kind: vscode.CompletionItemKind.Function, doc: "Randomly shuffle dataset rows." },
    { name: "flatten_data", module: "preprocess", kind: vscode.CompletionItemKind.Function, doc: "Flatten multi-dimensional samples into 2D (n_samples, features)." },
    { name: "one_hot_encode", module: "preprocess", kind: vscode.CompletionItemKind.Function, doc: "Convert integer labels into one-hot encoded vectors" },
    
    // random
    { name: "random", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Return random float in [0.0, 1.0)." },
    { name: "randint", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Return random integer in [a, b] inclusive." },
    { name: "uniform", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Return random float in range [a, b]." },
    { name: "randrange", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Return random integer from range(start, stop, step)." },
    { name: "choice", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Return a random element from a list." },
    { name: "choices", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Return k random elements with replacement." },
    { name: "sample", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Return k unique random elements without replacement." },
    { name: "shuffle", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Shuffle list in-place." },
    { name: "gauss", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Gaussian distribution (mean, std deviation)." },
    { name: "normalvariate", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Normal distribution (alternative to gauss)." },
    { name: "expovariate", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Exponential distribution with lambda rate." },
    { name: "triangular", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Triangular distribution (low, high, mode)." },
    { name: "seed", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Seed RNG for reproducible results." },
    { name: "get_state", module: "random", kind: vscode.CompletionItemKind.Function, doc: "Return current RNG internal state." },
    
    // time
    { name: "now", module: "time", kind: vscode.CompletionItemKind.Function, doc: "Return the current UNIX timestamp in seconds since the epoch." },
    { name: "clock", module: "time", kind: vscode.CompletionItemKind.Function, doc: "Return a high-resolution performance counter for timing code execution." },
    { name: "sleep", module: "time", kind: vscode.CompletionItemKind.Function, doc: "Pause execution for the given number of seconds." },


    
    { name: "Vec",      module: "math",    kind: vscode.CompletionItemKind.Class,    doc: "Vector class" },
];

export class PulseAutoImportProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        
        // skip comments and strings
        if (linePrefix.includes("#")) return [];
        const doubleQuotes = (linePrefix.match(/"/g) || []).length;
        const singleQuotes = (linePrefix.match(/'/g) || []).length;
        if (doubleQuotes % 2 !== 0 || singleQuotes % 2 !== 0) return [];
        
        // get already imported names so we don't suggest them again
        const alreadyImported = this.getImportedNames(document);
        
        const items: vscode.CompletionItem[] = [];
        
        for (const exp of PULSE_MODULES) {
            if (alreadyImported.has(exp.name)) continue;
            
            const item = new vscode.CompletionItem(exp.name, exp.kind);
            item.detail = `${exp.doc} (from ${exp.module})`;
            item.documentation = new vscode.MarkdownString(`**${exp.name}** from \`${exp.module}\`\n\n${exp.doc}\n\n*Auto-import will add:*\n\`\`\`pulse\nfrom ${exp.module} import ${exp.name}\n\`\`\``);
            
            // insert the import at the top of the file
            item.additionalTextEdits = [this.buildImportEdit(document, exp)];
            item.insertText = exp.name;
            item.sortText = `zz_${exp.name}`;
            item.filterText = exp.name;
            
            // show a lightbulb-style label
            item.label = {
                label: exp.name,
                description: `from ${exp.module}`,
            };
            
            items.push(item);
        }
        
        return items;
    }
    
    // Helpers
    private getImportedNames(document: vscode.TextDocument): Set<string> {
        const imported = new Set<string>();
        const fromImport = /^\s*from\s+\S+\s+import\s+(.+)/;
        const directImport = /^\s*import\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            
            const fromMatch = fromImport.exec(text);
            if (fromMatch) {
                fromMatch[1].split(",").map(n => n.trim()).forEach(n => imported.add(n));
                continue;
            }
            
            const directMatch = directImport.exec(text);
            if (directMatch) {
                imported.add(directMatch[1]);
            }
        }
        
        return imported;
    }
    
    private buildImportEdit(document: vscode.TextDocument, exp: ModuleExport): vscode.TextEdit {
        // find the last existing import line to insert after it
        let lastImportLine = -1;
        
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            if (/^\s*(import|from)\s+/.test(text)) {
                lastImportLine = i;
            }
        }
        
        const importStatement = `from ${exp.module} import ${exp.name}\n`;
        
        if (lastImportLine >= 0) {
            // insert after last import
            const pos = new vscode.Position(lastImportLine + 1, 0);
            return vscode.TextEdit.insert(pos, importStatement);
        }
        else {
            // no imports yet - insert at top of file
            const pos = new vscode.Position(0, 0);
            return vscode.TextEdit.insert(pos, importStatement);
        }
    }
}