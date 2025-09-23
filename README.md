# Bookmark

[![GitHub release](https://img.shields.io/github/v/release/AlexKucera/bookmark)](https://github.com/AlexKucera/bookmark/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Downloads](https://img.shields.io/github/downloads/AlexKucera/bookmark/total)](https://github.com/AlexKucera/bookmark/releases)
![Desktop & Mobile](https://img.shields.io/badge/Platform-Desktop%20%26%20Mobile-green)

Add bookmarks to your Obsidian notes for quick navigation. Click the bookmark icon in the note header to set a bookmark, click again to jump back to it.

## Table of Contents

- [Key Features](#key-features)
- [Why This Plugin?](#why-this-plugin)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Contact](#contact)

## Key Features

- 📍 **One-Click Bookmarking** - Set bookmarks instantly with the header button 
- 🎯 **Smart Return Navigation** - Jump back to your bookmark with visual feedback 
- 🧹 **Automatic Cleanup** - Bookmarks self-destruct after navigation to keep notes clean 
- 🔄 **Dual Mode Support** - Works seamlessly in both edit and preview modes 
- 🎨 **Visual Indicators** - Gutter decorations show bookmark locations 
- 🧠 **Smart Placement** - Avoids YAML frontmatter and handles code blocks intelligently 
- ⌨️ **Keyboard Shortcuts** - Full hotkey support for power users 
- 🔧 **Zero Configuration** - Works out of the box with no setup required 

## Why This Plugin?

Long documents can be challenging to navigate, especially when you need to frequently jump between different sections. Traditional bookmarks in browsers don't help with individual document navigation, and Obsidian's built-in linking requires creating permanent markers.

This plugin solves the problem by providing **temporary, session-based bookmarks** that:
- Don't clutter your document with permanent markers
- Provide instant visual feedback about bookmark locations
- Work across both edit and preview modes
- Automatically clean up when you're done navigating

Perfect for researchers, writers, and anyone working with lengthy documents who needs quick navigation without permanent document modifications.

## Installation

### Community Plugin Store (Recommended)

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Bookmark"
4. Install and enable the plugin

### Manual Installation from GitHub

1. Download the latest release from [GitHub Releases](https://github.com/AlexKucera/bookmark/releases)
2. Extract the contents to `{vault}/.obsidian/plugins/bookmark/`
3. Reload Obsidian and enable the plugin in Community Plugins

### BRAT (Beta)

1. Install the BRAT plugin
2. Add this repository: `AlexKucera/bookmark`
3. Enable the plugin in Community Plugins

## Quick Start

1. **Set a Bookmark**: Click the bookmark icon (📖) in any note's header
2. **Navigate**: Scroll or move around your document
3. **Return**: Click the bookmark icon again (now 📖✓) to jump back
4. **Auto-Cleanup**: The bookmark automatically disappears after 500ms

The bookmark icon changes state to show whether a bookmark is set:
- 📖 Empty bookmark icon = No bookmark set
- 📖✓ Filled bookmark icon = Bookmark is set

## Commands

| Command | Description | Default Hotkey |
|---------|-------------|----------------|
| `Toggle bookmark` | Set bookmark at current position or jump to existing bookmark | Not set |
| `Clean up multiple bookmarks` | Remove all bookmark markers from the current note | Not set |

You can assign custom hotkeys to these commands in Obsidian's Settings → Hotkeys.

## How It Works

The plugin uses invisible HTML comment markers (`<!-- bookmark-marker -->`) to track bookmark positions. These markers:

- Are completely invisible in both edit and preview modes
- Persist with your document but don't interfere with content
- Are automatically removed after navigation
- Work across Obsidian sessions and device syncing

### Smart Features

- **Frontmatter Protection**: Bookmarks are never placed in YAML frontmatter
- **Code Block Handling**: Special logic for bookmarks within code blocks
- **Scroll Preservation**: Your scroll position is maintained during bookmark operations
- **Multi-Bookmark Detection**: Warns if multiple bookmarks are detected

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bookmark not appearing | Try reloading the note or restarting Obsidian |
| Multiple bookmark warning | Use the "Clean up multiple bookmarks" command |
| Bookmark in wrong location | The plugin uses scroll position detection - try setting bookmark while stationary |
| Bookmark not jumping correctly | Ensure you're not in a heavily formatted section; try another location |

## Development

This plugin is built with TypeScript and uses esbuild for bundling.

### Setup

```bash
# Clone the repository
git clone https://github.com/AlexKucera/bookmark.git
cd bookmark

# Install dependencies
npm install
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode with watch compilation |
| `npm run build` | Build for production with type checking |
| `npm run version` | Bump version and update manifest files |
| `eslint main.ts` | Run ESLint on main TypeScript file |
| `tsc -noEmit -skipLibCheck` | Run TypeScript type checking |

### Architecture

The plugin consists of several key components:

- **BookmarkPlugin** (`main.ts`) - Main plugin orchestrator
- **BookmarkManager** (`bookmarkManager.ts`) - Core bookmark logic
- **ViewActionManager** (`viewActionManager.ts`) - Header button management
- **GutterDecorationManager** (`gutterDecoration.ts`) - Visual gutter indicators

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support

If you find this plugin helpful, consider supporting its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/babylondreams)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/babylondreams)
[![Patreon](https://img.shields.io/badge/Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/babylondreams)

## Contact

**Alexander Kucera**
- Website: [https://alexanderkucera.com](https://alexanderkucera.com)
- GitHub: [@AlexKucera](https://github.com/AlexKucera)