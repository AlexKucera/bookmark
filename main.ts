// ABOUTME: Main plugin entry point for Obsidian bookmark plugin
// ABOUTME: Coordinates bookmark functionality across views and handles lifecycle

import { MarkdownView, Plugin } from 'obsidian';
import { BookmarkManager } from './bookmarkManager';
import { ViewActionManager } from './viewActionManager';
import { GutterDecorationManager } from './gutterDecoration';

export default class BookmarkPlugin extends Plugin {
	private bookmarkManager: BookmarkManager;
	private viewActionManager: ViewActionManager;
	private gutterManager: GutterDecorationManager;

	async onload() {
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
			id: 'toggle-bookmark',
			name: 'Toggle bookmark',
			editorCallback: (_editor, view) => {
				if (view instanceof MarkdownView) {
					this.toggleBookmark(view);
				}
			}
		});

		// Add command to clean up multiple bookmarks
		this.addCommand({
			id: 'clean-bookmarks',
			name: 'Clean up multiple bookmarks',
			editorCallback: (editor, view) => {
				if (view instanceof MarkdownView) {
					this.cleanupMultipleBookmarks(editor, view);
				}
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
				this.toggleBookmark(view);
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
			setTimeout(async () => {
				const currentMode = view.getMode();

				if (currentMode === 'preview') {
					// In preview mode, temporarily switch to source to remove bookmark
					try {
						await view.setState({mode: 'source'}, {history: false});
						this.bookmarkManager.removeBookmark(editor);
						await view.setState({mode: 'preview'}, {history: false});
					} catch (error) {
						console.error('Failed to remove bookmark in preview mode:', error);
						// Fallback: try direct removal
						this.bookmarkManager.removeBookmark(editor);
					}
				} else {
					// Edit mode - direct removal
					this.bookmarkManager.removeBookmark(editor);
				}

				this.viewActionManager.updateActionIcon(view, 'bookmark');
			}, 500);
		} else {
			// No bookmark - set at visible line (works in both edit and preview modes)
			const mode = view.getMode();

			if (mode === 'preview') {
				// In preview mode, we need to temporarily switch to source mode to insert bookmark
				const visibleLine = this.getVisibleLineInPreview(view);
				console.log('Preview mode: setting bookmark at line', visibleLine);

				try {
					// Temporarily switch to source mode for bookmark insertion
					const currentMode = view.getMode();
					await view.setState({mode: 'source'}, {history: false});

					// Insert bookmark
					this.bookmarkManager.insertBookmark(editor, visibleLine);

					// Switch back to preview mode
					await view.setState({mode: 'preview'}, {history: false});

					console.log('Bookmark inserted successfully in preview mode');
				} catch (error) {
					console.error('Failed to insert bookmark in preview mode:', error);
					// Try direct insertion as fallback
					this.bookmarkManager.insertBookmark(editor, visibleLine);
				}
			} else {
				// In source/edit mode, use auto-detection
				console.log('Edit mode: using auto-detection');
				const detectedLine = this.bookmarkManager.getFirstVisibleLine(editor);
				console.log('Edit mode: detected line is', detectedLine);
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

			console.log('Preview scroll:', scroll, 'scrollHeight:', containerEl.scrollHeight);

			// Treat scroll as percentage if it's reasonable, otherwise as pixels
			let scrollPercentage: number;

			if (scroll <= 100) {
				// Likely already a percentage (0-100)
				scrollPercentage = scroll / 100;
				console.log('Treating scroll as percentage:', scroll + '%');
			} else {
				// Treat as pixel value
				scrollPercentage = scroll / containerEl.scrollHeight;
				console.log('Treating scroll as pixels');
			}

			// Estimate visible line based on scroll percentage
			const editor = view.editor;
			const totalLines = editor.lineCount();
			const estimatedLine = Math.floor(scrollPercentage * totalLines);

			console.log('Total lines:', totalLines, 'scroll %:', scrollPercentage, 'estimated line:', estimatedLine);

			// Ensure within bounds
			const finalLine = Math.min(Math.max(0, estimatedLine), totalLines - 1);
			return finalLine;
		} catch (e) {
			console.error('Error in getVisibleLineInPreview:', e);
		}

		console.log('Fallback to line 0');
		// Fallback to first line
		return 0;
	}

	private async cleanupMultipleBookmarks(editor: any, view: MarkdownView): Promise<void> {
		const currentMode = view.getMode();

		if (currentMode === 'preview') {
			// Switch to source mode for cleanup
			await view.setState({mode: 'source'}, {history: false});
		}

		// Remove all bookmark markers (both with and without spaces)
		const content = editor.getValue();
		const cleanedContent = content
			.replace(/\s*<!-- bookmark-marker -->/g, '')
			.replace(/<!-- bookmark-marker -->\s*/g, '');

		editor.setValue(cleanedContent);

		if (currentMode === 'preview') {
			// Switch back to preview mode
			await view.setState({mode: 'preview'}, {history: false});
		}

		// Update icon
		this.viewActionManager.updateActionIcon(view, 'bookmark');
	}

	private checkAndUpdateIcon(view: MarkdownView): void {
		const content = view.editor.getValue();
		const bookmarkState = this.bookmarkManager.findBookmark(content);

		// Check for multiple bookmarks
		if (this.bookmarkManager.checkForMultipleBookmarks(content)) {
			// Will be handled by BookmarkManager
		}

		const iconName = bookmarkState.hasBookmark ? 'bookmark-check' : 'bookmark';
		this.viewActionManager.updateActionIcon(view, iconName);
	}
}
