# Pulse Language Support

VS Code extension for the [Pulse](https://github.com/david-ptrk/Pulse) programming language.

## Features

- **Syntax highlighting** - keywords, operators, strings, f-strings, comments, and Pulse-specific constructs
- **Autocomplete** - keywords, built-ins, snippets, and symbols from your current file
- **Hover documentation** - descriptions for keywords, built-ins, and your own functions
- **Signature help** - parameter hints as you type inside `()`
- **Inlay hints** - inline type hints for variable assignments
- **Go-to definition** - `F12` jumps to where a symbol is defined
- **Find all references** — `Shift+F12` shows every usage of a symbol
- **Rename symbol** - `F2` renames a variable or function across the file
- **Symbol outline** - functions, classes, and variables in the Explorer panel
- **Auto-imports** - suggests and inserts `from module import name` automatically
- **Diagnostics** - squiggles for syntax errors, unknown identifiers, duplicate functions, and more
- **Real interpreter errors** - actual Pulse parser errors shown as squiggles on save
- **Quick fixes** - lightbulb suggestions to fix common errors automatically
- **Code formatting** - format on save and range formatting

## Getting started

1. Install the extension
2. Open any `.pul` file and start writing Pulse code

To enable real interpreter diagnostics, set the path to your Pulse interpreter in VS Code settings:

```json
{
  "pulse.interpreterPath": "path/to/pulse.py"
}
```

## Recommended settings

```json
{
  "[pulse]": {
    "editor.formatOnSave": true,
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "editor.inlayHints.enabled": "on"
  }
}
```

## About Pulse

Pulse is a domain-specific interpreted language with a tree-walk interpreter. This extension is maintained alongside the Pulse interpreter.
