// ABOUTME: Manages bookmark action buttons in view headers
// ABOUTME: Handles icon updates and button state tracking

import { IconName, MarkdownView, setIcon } from 'obsidian';
import { BOOKMARK_ICON } from './constants';

export class ViewActionManager {
    private actionElements: Map<MarkdownView, HTMLElement> = new Map();

    addActionToView(view: MarkdownView, callback: () => void): void {
        // Add the bookmark action to the view header
        const actionElement = view.addAction(
            BOOKMARK_ICON as IconName,
            'Set bookmark',
            () => {
                callback();
            }
        );

        // Store reference to the action element for later updates
        this.actionElements.set(view, actionElement);
    }

    updateActionIcon(view: MarkdownView, iconName: IconName): void {
        const actionElement = this.actionElements.get(view);
        if (actionElement) {
            // Clear existing icon
            const iconEl = actionElement.querySelector('.svg-icon');
            if (iconEl) {
                iconEl.remove();
            }

            // Set new icon
            setIcon(actionElement, iconName);

            // Update tooltip based on icon
            const title = iconName === 'bookmark' ? 'Set bookmark' : 'Jump to bookmark';
            actionElement.setAttribute('title', title);
            actionElement.setAttribute('aria-label', title);
        }
    }

    removeActionFromView(view: MarkdownView): void {
        const actionElement = this.actionElements.get(view);
        if (actionElement) {
            // Remove the action element from the DOM
            actionElement.remove();
            this.actionElements.delete(view);
        }
    }

    getActionElement(view: MarkdownView): HTMLElement | null {
        return this.actionElements.get(view) || null;
    }

    hasActionForView(view: MarkdownView): boolean {
        return this.actionElements.has(view);
    }
}