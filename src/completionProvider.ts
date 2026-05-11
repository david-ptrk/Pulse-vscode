import * as vscode from 'vscode';

const KEYWORDS = [
    "if", "elif", "else", "while", "for", "break", "continue", "pass", "return", "match",
    "case", "try", "except", "finally", "raise", "import", "from", "as", "del", "in", "is",
    "and", "or", "not", "def", "class", "static", "lambda", "self", "dot", "transpose"
];

export class PulseCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        for (const keyword of KEYWORDS) {
            const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
            item.detail = "Pulse keyword";
            items.push(item);
        }
        
        return items;
    }
}