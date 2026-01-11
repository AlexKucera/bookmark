// ABOUTME: Main plugin entry point for Obsidian bookmark plugin
// ABOUTME: Coordinates bookmark functionality across views and handles lifecycle

import { Editor, MarkdownView, Plugin } from 'obsidian';
import { BookmarkManager } from './bookmarkManager';
import { ViewActionManager } from './viewActionManager';
import { GutterDecorationManager } from './gutterDecoration';
import { BOOKMARK_MARKER } from './constants';

// Pre-escaped marker pattern for regex operations
// Marker is always inserted as " <!-- bookmark-marker -->" at end of line,
// so we only need to match optional whitespace before the marker
const ESCAPED_MARKER = BOOKMARK_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MARKER_CLEANUP_RE = new RegExp(`\\s*${ESCAPED_MARKER}`, 'g');

export default class BookmarkPlugin extends Plugin {
	private bookmarkManager: BookmarkManager;
	private viewActionManager: ViewActionManager;
	private gutterManager: GutterDecorationManager;

	onload() {
		// Initialize managers
		this.bookmarkManager = new BookmarkManager();
		this.viewActionManager = new ViewActionManager();
		this.gutterManager = new GutterDecorationManager();

		// Register editor extension for gutter decorations
		this.registerEditorExtension(this.gutterManager.createBookmarkGutter());

		// Wait for layout to be ready before setting up views
		this.app.workspace.onLayoutReady(() => {
			// Add bookmark actions to existing markdown views
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (leaf.view instanceof MarkdownView) {
					this.setupView(leaf.view);
				}
			});

			// Listen for new views being created
			this.registerEvent(
				this.app.workspace.on('active-leaf-change', () => {
					this.handleActiveLeafChange();
				})
			);
		});

		// Add command for toggle bookmark
		this.addCommand({
			id: 'toggle',
			name: 'Toggle',
			editorCheckCallback: (checking, _editor, view) => {
				if (checking) {
					return view instanceof MarkdownView;
				}
				void this.toggleBookmark(view as MarkdownView);
				return true;
			}
		});

		// Add command to clean up multiple bookmarks
		this.addCommand({
			id: 'clean-multiple',
			name: 'Clean up multiple',
			editorCheckCallback: (checking, editor, view) => {
				if (checking) {
					return view instanceof MarkdownView;
				}
				void this.cleanupMultipleBookmarks(editor, view as MarkdownView);
				return true;
			}
		});
	}

	onunload() {
		// Clean up all view actions
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				this.viewActionManager.removeActionFromView(leaf.view);
			}
		});
	}

	// MARK: - Private Methods

	private handleActiveLeafChange(): void {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			this.setupView(activeView);
		}
	}

	private setupView(view: MarkdownView): void {
		// Add bookmark action if not already present
		if (!this.viewActionManager.getActionElement(view)) {
			this.viewActionManager.addActionToView(view, () => {
				void this.toggleBookmark(view);
			});
		}


		// Check for existing bookmark and update icon
		this.checkAndUpdateIcon(view);
	}

	private async toggleBookmark(view: MarkdownView): Promise<void> {
		const editor = view.editor;
		const content = editor.getValue();
		const bookmarkState = this.bookmarkManager.findBookmark(content);

		if (bookmarkState.hasBookmark && bookmarkState.lineNumber !== null) {
			// Bookmark exists - jump to it, then remove after delay
			this.bookmarkManager.jumpToBookmark(editor, bookmarkState.lineNumber, view);

			// Wait 500ms before clearing bookmark to let user see the location
			setTimeout(() => {
				const originalFile = view.file;
				void (async () => {
					try {
						const currentMode = view.getMode();

						if (currentMode === 'preview') {
							// In preview mode, use Vault.process to modify the file
							if (!originalFile) return;
							await this.app.vault.process(originalFile, (content) => {
								const bookmarkState = this.bookmarkManager.findBookmark(content);
								if (bookmarkState.hasBookmark && bookmarkState.lineNumber !== null) {
									const eol = content.includes('\r\n') ? '\r\n' : '\n';
									const lines = content.split(/\r?\n/);
									const lineContent = lines[bookmarkState.lineNumber];
									if (lineContent === undefined) return content;

									// Remove the marker and all preceding whitespace using same regex as other cleanup paths
									lines[bookmarkState.lineNumber] = lineContent.replace(MARKER_CLEANUP_RE, '');
									return lines.join(eol);
								}
								return content;
							});
						} else {
							// Edit mode - direct removal
							// If user switched files before the timeout, avoid mutating the wrong buffer.
							if (originalFile && view.file?.path !== originalFile.path) {
								await this.app.vault.process(originalFile, (content) => {
									return content.replace(MARKER_CLEANUP_RE, '');
								});
							} else {
								this.bookmarkManager.removeBookmark(editor);
							}
						}
	
						this.viewActionManager.updateActionIcon(view, 'bookmark');
					} catch (e) {
						console.error('Failed to remove bookmark:', e);
					}
				})();
			}, 500);
		} else {
			// No bookmark - set at visible line (works in both edit and preview modes)
			const mode = view.getMode();

			if (mode === 'preview') {
				// In preview mode, use Vault.process to modify the file
				const visibleLine = this.getVisibleLineInPreview(view);

				if (!view.file) return;
				await this.app.vault.process(view.file, (content) => {
					const eol = content.includes('\r\n') ? '\r\n' : '\n';
					const lines = content.split(/\r?\n/);
					let targetLine = Math.min(visibleLine, lines.length - 1);

					// Parse frontmatter to find end index
					let frontmatterEndIndex = -1;
					if (lines[0] === '---') {
						for (let i = 1; i < lines.length; i++) {
							if (lines[i] === '---') {
								frontmatterEndIndex = i;
								break;
							}
						}
					}

					// If visibleLine is inside frontmatter, set targetLine to first line after closing '---'
					if (frontmatterEndIndex !== -1 && targetLine <= frontmatterEndIndex) {
						targetLine = Math.min(frontmatterEndIndex + 1, lines.length - 1);
					}

					// Ensure target line is valid
					targetLine = Math.max(0, Math.min(targetLine, lines.length - 1));

					// Re-derive the line content and check if it already contains the marker
					const lineContent = lines[targetLine];
					if (!lineContent.includes(BOOKMARK_MARKER)) {
						// Insert bookmark at end of line
						lines[targetLine] = lineContent + ' ' + BOOKMARK_MARKER;
					}

					return lines.join(eol);
				});
			} else {
				// In source/edit mode, use auto-detection with full bookmark manager logic
				const detectedLine = this.bookmarkManager.getFirstVisibleLine(editor);
				this.bookmarkManager.insertBookmark(editor, detectedLine);
			}

			this.viewActionManager.updateActionIcon(view, 'bookmark-check');
		}
	}

	private getVisibleLineInPreview(view: MarkdownView): number {
		try {
			// Get scroll position in preview mode (likely already a percentage 0-100)
			const scroll = view.previewMode.getScroll();
			const containerEl = view.previewMode.containerEl;


			// Treat scroll as percentage if it's reasonable, otherwise as pixels
			let scrollPercentage: number;

			if (scroll <= 100) {
				// Likely already a percentage (0-100)
				scrollPercentage = scroll / 100;
			} else {
				// Treat as pixel value
				scrollPercentage = scroll / containerEl.scrollHeight;
			}

			// Estimate visible line based on scroll percentage
			const editor = view.editor;
			const totalLines = editor.lineCount();
			const estimatedLine = Math.floor(scrollPercentage * totalLines);


			// Ensure within bounds
			const finalLine = Math.min(Math.max(0, estimatedLine), totalLines - 1);
			return finalLine;
		} catch (e) {
			console.error('Error in getVisibleLineInPreview:', e);
		}

		// Fallback to first line
		return 0;
	}

	private async cleanupMultipleBookmarks(editor: Editor, view: MarkdownView): Promise<void> {
		const currentMode = view.getMode();

		if (currentMode === 'preview') {
			// In preview mode, use Vault.process to modify the file
			if (!view.file) return;
			await this.app.vault.process(view.file, (content) => {
				// Remove all bookmark markers with any preceding whitespace
				return content.replace(MARKER_CLEANUP_RE, '');
			});
		} else {
			// In source mode, use editor directly
			const content = editor.getValue();
			const cleanedContent = content.replace(MARKER_CLEANUP_RE, '');
			editor.setValue(cleanedContent);
		}

		// Update icon
		this.viewActionManager.updateActionIcon(view, 'bookmark');
	}

	private checkAndUpdateIcon(view: MarkdownView): void {
		const content = view.editor.getValue();
		const bookmarkState = this.bookmarkManager.findBookmark(content);

		// Check for multiple bookmarks and show notice to user if detected
		// (user must manually run "Clean up multiple" command to resolve)
		this.bookmarkManager.checkForMultipleBookmarks(content);

		const iconName = bookmarkState.hasBookmark ? 'bookmark-check' : 'bookmark';
		this.viewActionManager.updateActionIcon(view, iconName);
	}
}
