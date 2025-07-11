# Youtube Screenshot Monkey

YouTube screenshot helper userscript for ViolentMonkey / TamperMonkey / GreaseMonkey that provides video frame grabbing with minimal UI changes. Or it can remove all video player UI elements to make a screenshot manually.

## Features

### Screenshot Capture

-   **Full-size screenshots**: Capture videos at their native resolution (press `[`)
-   **Viewport screenshots**: Capture exactly what you see on screen (press `]`)
-   **UI handling**: Disables video overlays to take screenshots manually

### Interactive Screenshot Strip

-   **Thumbnails**: All captured screenshots are listed in a horizontal strip below the video in order they are taken
-   **One-click actions**: Save or copy any screenshot with dedicated buttons
-   **Modal preview**: Click any screenshot thumbnail to view it full-size
-   **Clickable timestamps**: Jump to exact video moments by clicking timestamp overlays

### Save & Copy Options

-   **Download images**: Save screenshots as PNG image files
-   **Clipboard support**: Copy images directly to clipboard for instant use
-   **File naming**: Filenames include video title, timestamp, and resolution

### URL Management

-   **Video metadata copying**: Copy video URL with title and duration (press `'`)
-   **Timestamp URLs**: Navigate to specific moments via clickable thumbnail timestamp links

### User Experience

-   **Clean interface**: Minimal, YouTube-native styling that doesn't interfere with viewing
-   **Keyboard shortcuts**: Fast access to all features via key combinations that not conflict with default ones
-   **Context awareness**: Ignores keypresses when typing in input fields

## Keyboard Shortcuts

| Key          | Action                           |
| ------------ | -------------------------------- |
| <kbd>[</kbd> | Capture full-size screenshot     |
| <kbd>]</kbd> | Capture viewport-size screenshot |
| <kbd>P</kbd> | Toggle video UI visibility       |
| <kbd>'</kbd> | Copy video link with metadata    |

## How to Use

1. **Install the userscript** in your preferred userscript manager
2. **Navigate to any YouTube video**
3. **Capture screenshots** using `[` (full-size) or `]` (viewport-size)
4. **View your screenshots** in the strip that appears below the video
5. **Click thumbnails** to preview full-size images in a modal
6. **Use action buttons** to save 💾 or copy 📋 individual screenshots
7. **Click timestamps** to jump to specific video moments
8. **Toggle UI visibility** with `P` for cleaner screenshots

## Installation

1. Install a userscript manager:

    - [ViolentMonkey](https://violentmonkey.github.io/) (recommended)
    - [TamperMonkey](https://www.tampermonkey.net/)
    - [GreaseMonkey](https://www.greasespot.net/)

2. Click the userscript file to install, or copy the code into a new userscript

3. Enable the script and navigate to YouTube
