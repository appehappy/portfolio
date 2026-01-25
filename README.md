# Personal Homepage

A design-led, static-first personal homepage designed as a calm, intentional artifact.

## Overview

This is a minimal, professional homepage built with vanilla HTML, CSS, and light JavaScript. The design prioritizes clarity, restraint, and good taste over feature density. It begins as a single static homepage and will later expand to include content feeds and a visual gallery.

## Design Principles

- **Static-first, progressive enhancement later**: Pure HTML/CSS foundation, JavaScript added only when it meaningfully enhances the experience
- **Design-led, not feature-led**: Visual and typographic decisions drive the architecture
- **Minimal dependencies**: Vanilla technologies only—no frameworks, no build processes
- **Print-inspired, human-scaled layout**: Generous whitespace, left-aligned content, decorative gridlines
- **Authored, not automated**: Content feels hand-crafted and intentionally placed

See [PROJECT_PHILOSOPHY.md](./PROJECT_PHILOSOPHY.md) for complete design principles and constraints.

## File Structure

```
portfolio/
├── index.html              # Main homepage
├── styles/
│   ├── tokens.css          # Design tokens (colors, spacing, typography)
│   ├── base.css            # Base styles and reset
│   └── layout.css          # Page layout and grid system
├── scripts/
│   └── main.js             # Placeholder for future progressive enhancement
├── assets/
│   ├── images/             # Images and illustrations
│   └── fonts/              # Web fonts (Ruder Plakat Maxi LL)
├── data/                   # Future: JSON feeds for BlueSky, Substack
├── README.md               # This file
└── PROJECT_PHILOSOPHY.md    # Design principles and project intent
```

### Styles

- **`tokens.css`**: All design values as CSS custom properties (colors, spacing, typography, layout)
- **`base.css`**: Minimal reset and base typography styles
- **`layout.css`**: Page frame, decorative gridlines, and content layout

### Scripts

- **`main.js`**: Placeholder for future progressive enhancement. Currently empty.

### Assets

- **`images/`**: Contains the hand-drawn illustration (SVG format)
- **`fonts/`**: Contains web font files (Ruder Plakat Maxi LL)

### Data

- **`data/`**: Reserved for future JSON feeds (BlueSky, Substack)

## Setup

No build process or dependencies required. Simply:

1. Open `index.html` in a web browser
2. Or serve via a local web server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (with http-server)
   npx http-server
   ```

## Visual System

### Colors
- Page background: `#FEF9ED` (warm cream)
- Decorative gridlines: `#E1DBC6` (subtle beige)
- Page border: `#1C211E` (dark green)
- Text: `#1C211E` (dark green)
- Links: `#4A7C7E` (muted teal)

### Typography
- Display font: Ruder Plakat Maxi LL (for name/headings)
- Body text: System font stack

### Layout
- Decorative vertical gridlines (not structural)
- Thick dark border framing the entire page
- Left-aligned content column with generous right margin
- Human-scaled spacing and typography

## Future Features

These features are anticipated architecturally but not yet implemented:

### BlueSky Feed
- Source: BlueSky public feed
- Ingested as JSON
- Rendered as short text blocks
- Chronological, limited count
- Styled identically to body copy

### Substack Feed
- Source: Substack RSS or JSON
- Long-form links + excerpts
- Displayed as authored objects, not cards

### Gallery / Visual Blog
- Small gallery for experiments and sketches
- Visual-first presentation
- Maintains authored, intentional aesthetic

## Development Notes

- All spacing uses design tokens—no magic numbers
- Gridlines are decorative (CSS background pattern), not structural
- No navigation elements (for now)
- No animations beyond essential interactions
- Font loading strategy for Ruder Plakat Maxi LL (web font or local files)

## Technology Stack

- HTML5
- CSS3 (with custom properties)
- Vanilla JavaScript (minimal, for future enhancement)

**Explicitly not using:**
- React, Vue, or other frameworks
- Tailwind or utility-first CSS
- Build processes or bundlers
- CMS or content management systems
- Analytics or SEO optimization tools
