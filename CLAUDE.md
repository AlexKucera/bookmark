# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run dev` - Start development mode with watch compilation (uses esbuild)
- `npm run build` - Build for production (includes TypeScript type checking and minification)
- `npm run version` - Bump version and update manifest/versions files

### Code Quality
- `eslint main.ts` - Run ESLint on the main TypeScript file
- `eslint ./src/` - Run ESLint on source folder (if using src structure)
- `tsc -noEmit -skipLibCheck` - Run TypeScript type checking without emitting files

### Installation
- `npm i` - Install dependencies
- Ensure Node.js version is at least v16

## Project Architecture

This is an Obsidian plugin built with TypeScript and bundled with esbuild. The plugin follows Obsidian's standard plugin architecture pattern.

### Core Structure
- **main.ts** - Main plugin entry point containing the plugin class that extends Obsidian's Plugin base class
- **manifest.json** - Plugin metadata including ID, name, version, and minimum Obsidian version
- **esbuild.config.mjs** - Build configuration using esbuild for bundling
- **package.json** - Standard npm package file with build scripts and dependencies

### Plugin Components
The plugin demonstrates Obsidian's core API patterns:
- **Plugin Class** (`MyPlugin`) - Main plugin class extending Obsidian's Plugin
- **Settings Interface** (`MyPluginSettings`) - Type-safe settings configuration
- **Modal Component** (`SampleModal`) - Custom modal dialog extending Obsidian's Modal
- **Settings Tab** (`SampleSettingTab`) - Plugin settings page extending PluginSettingTab

### Key Plugin Features
- Ribbon icon integration with the left sidebar
- Status bar integration
- Command registration (simple, editor-based, and conditional commands)
- Settings persistence and UI
- DOM event handling with automatic cleanup
- Interval registration with automatic cleanup

### Build Process
- TypeScript compilation with strict settings (nullchecks, noImplicitAny)
- esbuild bundling with external Obsidian APIs and CodeMirror modules
- Development mode includes inline source maps and watch mode
- Production mode includes minification and tree shaking
- External modules: obsidian, electron, @codemirror/*, @lezer/*, builtin Node modules

### File Structure Pattern
- Source code in root directory (main.ts)
- Built output: main.js (bundled by esbuild)
- Styles: styles.css
- Configuration: tsconfig.json, .eslintrc, .editorconfig
- Version management: versions.json tracks compatibility with Obsidian versions

### Development Workflow
1. Use `npm run dev` for hot-reload development
2. Plugin auto-reloads when main.js changes (need to reload Obsidian)
3. Built files (main.js, manifest.json, styles.css) are what get distributed
4. Version bumping updates both package.json and manifest.json via version-bump.mjs