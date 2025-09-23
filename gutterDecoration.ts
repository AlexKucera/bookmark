// ABOUTME: Creates and manages CodeMirror line decorations for bookmarks
// ABOUTME: Shows bookmark styling on bookmarked lines using line decorations

import { Extension, StateEffect, StateField } from '@codemirror/state';
import { EditorView, ViewUpdate, ViewPlugin, Decoration, DecorationSet, PluginValue } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { BOOKMARK_MARKER } from './constants';

// State effect for updating bookmark decorations
const updateBookmarkEffect = StateEffect.define<{ lineNumber: number; hasBookmark: boolean }>();

// View plugin to manage bookmark line decorations
class BookmarkDecorationPlugin implements PluginValue {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        // Map decorations through document changes
        if (update.docChanged) {
            this.decorations = this.decorations.map(update.changes);
        }

        // Handle bookmark effects
        for (let effect of update.transactions.flatMap(tr => tr.effects)) {
            if (effect.is(updateBookmarkEffect)) {
                this.decorations = this.buildDecorationsFromEffect(update.view, effect.value);
            }
        }

        // Rebuild decorations if document changed (to sync with markers)
        if (update.docChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    destroy() {}

    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const content = view.state.doc.toString();
        const lines = content.split('\n');

        lines.forEach((lineContent, index) => {
            if (lineContent.includes(BOOKMARK_MARKER)) {
                try {
                    const line = view.state.doc.line(index + 1);
                    if (line) {
                        // Add line decoration for the bookmark icon
                        builder.add(
                            line.from,
                            line.from,
                            Decoration.line({ class: 'cm-bookmark-line' })
                        );

                        // Hide the bookmark marker text
                        const markerStart = lineContent.indexOf(BOOKMARK_MARKER);
                        if (markerStart !== -1) {
                            const absoluteMarkerStart = line.from + markerStart;
                            const absoluteMarkerEnd = absoluteMarkerStart + BOOKMARK_MARKER.length;

                            builder.add(
                                absoluteMarkerStart,
                                absoluteMarkerEnd,
                                Decoration.mark({ class: 'cm-bookmark-marker-hidden' })
                            );
                        }
                    }
                } catch (e) {
                    // Line might not exist, skip
                }
            }
        });

        return builder.finish();
    }

    buildDecorationsFromEffect(view: EditorView, effect: { lineNumber: number; hasBookmark: boolean }): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        if (effect.hasBookmark) {
            try {
                const line = view.state.doc.line(effect.lineNumber + 1);
                if (line) {
                    builder.add(
                        line.from,
                        line.from,
                        Decoration.line({ class: 'cm-bookmark-line' })
                    );
                }
            } catch (e) {
                // Line might not exist, skip
            }
        }

        return builder.finish();
    }
}

// Create the view plugin
const bookmarkDecorationPlugin = ViewPlugin.fromClass(BookmarkDecorationPlugin, {
    decorations: (plugin: BookmarkDecorationPlugin) => plugin.decorations,
});

export class GutterDecorationManager {
    createBookmarkGutter(): Extension {
        return [bookmarkDecorationPlugin];
    }

    updateBookmarkDecoration(view: EditorView, lineNumber: number, hasBookmark: boolean): void {
        view.dispatch({
            effects: [updateBookmarkEffect.of({ lineNumber, hasBookmark })]
        });
    }

    // Helper method to sync decorations with document content
    syncWithDocument(view: EditorView): void {
        // The view plugin will automatically sync when document changes
        // No manual sync needed
    }
}