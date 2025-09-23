// ABOUTME: Core bookmark management logic for setting, finding, and removing bookmarks
// ABOUTME: Handles marker insertion and detection in markdown content

import { Editor, MarkdownView, Notice } from 'obsidian';
import { BOOKMARK_MARKER, BookmarkState } from './constants';

interface ScrollInfo {
    top: number;
    clientHeight?: number;
    scrollHeight?: number;
    height?: number;
}

interface CodeMirrorEditor {
    dom?: HTMLElement;
}

interface ExtendedEditor extends Editor {
    cm?: CodeMirrorEditor;
    containerEl?: HTMLElement;
}

export class BookmarkManager {
    findBookmark(content: string): BookmarkState {
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].contains(BOOKMARK_MARKER)) {
                return {
                    hasBookmark: true,
                    lineNumber: i
                };
            }
        }

        return {
            hasBookmark: false,
            lineNumber: null
        };
    }

    getFirstVisibleLine(editor: Editor): number {
        try {
            // For edit mode, use percentage-based approach like preview mode
            const scrollInfo = editor.getScrollInfo() as ScrollInfo;
            const totalLines = editor.lineCount();

            // Get scroll information - try multiple properties to find total content height
            const scrollTop = scrollInfo.top;
            const viewportHeight = scrollInfo.clientHeight || 600;

            // Try to get total document height from CodeMirror
            let totalContentHeight = scrollInfo.scrollHeight || scrollInfo.height || viewportHeight;

            // Try alternative methods to get document height
            if (totalContentHeight <= viewportHeight) {
                // Try to get the actual document height from various DOM elements
                try {
                    // Try CodeMirror 6 approach first
                    const editorView = (editor as ExtendedEditor).cm;
                    if (editorView && editorView.dom) {
                        totalContentHeight = editorView.dom.scrollHeight || totalContentHeight;
                    }

                    // If that doesn't work, try to find the scroll container
                    if (totalContentHeight <= viewportHeight) {
                        const containerEl = (editor as ExtendedEditor).containerEl;
                        if (containerEl) {
                            const scrollEl = containerEl.querySelector('.cm-editor') ||
                                           containerEl.querySelector('.cm-scroller') ||
                                           containerEl.querySelector('[contenteditable]');
                            if (scrollEl) {
                                totalContentHeight = scrollEl.scrollHeight || totalContentHeight;
                            }
                        }
                    }
                } catch (e) {
                    // Silently handle scroll height detection errors
                }
            }


            // Calculate scroll percentage
            let scrollPercentage: number;
            if (totalContentHeight > viewportHeight) {
                // Calculate percentage of total scrollable area
                const maxScroll = totalContentHeight - viewportHeight;
                scrollPercentage = scrollTop / maxScroll;
            } else {
                // Document fits in viewport, estimate based on line distribution
                // If scrollTop > 0 but no scrollable area, estimate percentage
                scrollPercentage = Math.min(scrollTop / (totalLines * 34), 1); // assume ~34px per line
            }

            // Convert percentage to line number
            const estimatedLine = Math.floor(scrollPercentage * totalLines);


            // Ensure within bounds
            return Math.min(Math.max(0, estimatedLine), totalLines - 1);
        } catch (e) {
            console.error('Error in getFirstVisibleLine:', e);
        }

        // Fallback to line 0
        return 0;
    }

    insertBookmark(editor: Editor, lineNumber?: number): void {
        // Preserve current scroll position
        const scrollInfo = editor.getScrollInfo();
        const originalScrollTop = scrollInfo.top;

        // Get visible line if lineNumber not provided
        if (lineNumber === undefined) {
            lineNumber = this.getFirstVisibleLine(editor);
        }

        // Protect against YAML frontmatter
        lineNumber = this.avoidFrontmatter(editor, lineNumber);

        const line = editor.getLine(lineNumber);

        // Check if we're in a code block and handle appropriately
        if (this.isInCodeBlock(editor, lineNumber)) {
            // Find the start of the code block and insert marker before it
            const codeBlockStart = this.findCodeBlockStart(editor, lineNumber);
            if (codeBlockStart > 0) {
                const prevLine = editor.getLine(codeBlockStart - 1);
                editor.setLine(codeBlockStart - 1, prevLine + ' ' + BOOKMARK_MARKER);
            } else {
                // Insert at the beginning of the document (after frontmatter)
                const safeLine = this.avoidFrontmatter(editor, 0);
                const firstLine = editor.getLine(safeLine);
                editor.setLine(safeLine, BOOKMARK_MARKER + ' ' + firstLine);
            }
        } else {
            // Insert at the end of the current line
            editor.setLine(lineNumber, line + ' ' + BOOKMARK_MARKER);
        }

        // Restore original scroll position after a brief delay
        setTimeout(() => {
            editor.scrollTo(null, originalScrollTop);
        }, 10);
    }

    removeBookmark(editor: Editor): void {
        // Find the bookmark and remove it using targeted edits to preserve scroll position
        const bookmarkState = this.findBookmark(editor.getValue());
        if (bookmarkState.hasBookmark && bookmarkState.lineNumber !== null) {
            const lineContent = editor.getLine(bookmarkState.lineNumber);
            const markerIndex = lineContent.indexOf(BOOKMARK_MARKER);

            if (markerIndex !== -1) {
                // Remove the marker and any preceding space
                let startPos = markerIndex;
                if (startPos > 0 && lineContent[startPos - 1] === ' ') {
                    startPos--; // Include the space before the marker
                }

                const newLineContent = lineContent.slice(0, startPos) + lineContent.slice(markerIndex + BOOKMARK_MARKER.length);
                editor.setLine(bookmarkState.lineNumber, newLineContent);
            }
        }
    }

    avoidFrontmatter(editor: Editor, lineNumber: number): number {
        // Check if document starts with YAML frontmatter
        const firstLine = editor.getLine(0);
        if (firstLine === '---') {
            // Find the end of frontmatter
            for (let i = 1; i <= editor.lastLine(); i++) {
                const line = editor.getLine(i);
                if (line === '---') {
                    // If we're trying to insert in frontmatter, place after it
                    if (lineNumber <= i) {
                        return Math.min(i + 1, editor.lastLine());
                    }
                    break;
                }
            }
        }
        return lineNumber;
    }

    jumpToBookmark(editor: Editor, lineNumber: number, view?: MarkdownView): void {
        const pos = { line: lineNumber, ch: 0 };

        // Check if we have view context and are in preview mode
        if (view && view.getMode && view.getMode() === 'preview') {
            // In preview mode, calculate scroll position and use preview scroll
            try {
                const totalLines = editor.lineCount();
                const scrollPercentage = lineNumber / totalLines;
                const targetScroll = scrollPercentage * 100; // Convert to percentage


                // Use preview mode scrolling
                view.previewMode.applyScroll(targetScroll);
            } catch (e) {
                console.error('Error jumping to bookmark in preview mode:', e);
            }
        } else {
            // Edit mode - use editor methods
            editor.setCursor(pos);

            // Delay scrollIntoView to ensure cursor is set first
            setTimeout(() => {
                editor.scrollIntoView({ from: pos, to: pos }, true);
            }, 50);
        }
    }

    checkForMultipleBookmarks(content: string): boolean {
        const matches = content.match(new RegExp(BOOKMARK_MARKER, 'g'));
        const hasMultiple = matches && matches.length > 1;

        if (hasMultiple) {
            new Notice('Warning: Multiple bookmarks found. Please clean up manually.', 5000);
        }

        return !!hasMultiple;
    }

    // MARK: - Private Helper Methods

    private isInCodeBlock(editor: Editor, lineNumber: number): boolean {
        const line = editor.getLine(lineNumber);
        return line.startsWith('```') || this.isInsideCodeBlock(editor, lineNumber);
    }

    private isInsideCodeBlock(editor: Editor, lineNumber: number): boolean {
        let codeBlockCount = 0;

        // Count code block markers from start to current line
        for (let i = 0; i <= lineNumber; i++) {
            const line = editor.getLine(i);
            if (line.startsWith('```')) {
                codeBlockCount++;
            }
        }

        // If odd number of code block markers, we're inside a code block
        return codeBlockCount % 2 === 1;
    }

    private findCodeBlockStart(editor: Editor, lineNumber: number): number {
        // Search backwards for the opening ```
        for (let i = lineNumber; i >= 0; i--) {
            const line = editor.getLine(i);
            if (line.startsWith('```')) {
                return i;
            }
        }
        return 0;
    }
}