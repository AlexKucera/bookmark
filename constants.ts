// ABOUTME: Constants and type definitions for the bookmark plugin
// ABOUTME: Includes marker format, icon names, and shared interfaces

export const BOOKMARK_MARKER = '<!-- bookmark-marker -->';
export const BOOKMARK_ICON = 'bookmark';
export const BOOKMARK_CHECK_ICON = 'bookmark-check';

export interface BookmarkState {
    hasBookmark: boolean;
    lineNumber: number | null;
}

export interface BookmarkInfo {
    lineNumber: number;
    lineContent: string;
}