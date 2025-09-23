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

	private toggleBookmark(view: MarkdownView): void {
		const editor = view.editor;
		const content = editor.getValue();
		const bookmarkState = this.bookmarkManager.findBookmark(content);

		if (bookmarkState.hasBookmark && bookmarkState.lineNumber !== null) {
			// Bookmark exists - jump to it, then remove after delay
			this.bookmarkManager.jumpToBookmark(editor, bookmarkState.lineNumber);

			// Wait 500ms before clearing bookmark to let user see the location
			setTimeout(() => {
				this.bookmarkManager.removeBookmark(editor);
				this.viewActionManager.updateActionIcon(view, 'bookmark');
			}, 500);
		} else {
			// No bookmark - set at current cursor position
			this.bookmarkManager.insertBookmark(editor);
			this.viewActionManager.updateActionIcon(view, 'bookmark-check');
		}
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
