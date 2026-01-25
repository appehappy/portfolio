# Project Philosophy

This site is a personal, professional homepage designed as a calm, intentional artifact.

## Principles

- **Static-first, progressive enhancement later**: Begin with pure HTML/CSS, add JavaScript only when it meaningfully enhances the experience
- **Design-led, not feature-led**: Visual and typographic decisions drive the architecture, not feature requirements
- **Minimal dependencies**: Vanilla HTML, CSS, and light JavaScript only. No frameworks, no build processes, no bundlers
- **Print-inspired, human-scaled layout**: Generous whitespace, left-aligned content column, decorative gridlines, framed page aesthetic
- **Content should feel authored, not automated**: Hand-crafted placement, intentional spacing, visual elements that feel deliberately placed rather than templated

## Technology Constraints

- Vanilla HTML, CSS, and light JavaScript only
- No React, Vue, or other frameworks
- No Tailwind or utility-first CSS
- No build process or bundlers
- No CMS or content management systems

## Visual System

### Colors
- Page background: `#FEF9ED` (warm cream)
- Decorative gridlines: `#E1DBC6` (subtle beige)
- Page border: `#1C211E` (dark green)
- Text: `#1C211E` or dark gray variant
- Links: `#4A7C7E` (muted teal)

### Typography
- Display font: Ruder Plakat Maxi LL (for name/headings)
- Body text: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)

### Layout
- Decorative gridlines (not structural)
- Thick dark border framing the entire page
- Left-aligned content column with generous right margin
- Human-scaled spacing and typography

## Architectural Principles

- **Design tokens over hard-coded values**: All colors, spacing, and typography defined as CSS custom properties
- **Separation of concerns**: Clear file structure separating content, styles, scripts, and assets
- **Scalable structure**: File organization anticipates future features without implementing them
- **Semantic HTML**: Meaningful markup that supports both current and future content

## Non-goals (for now)

- SEO optimization
- Analytics
- CMS integrations
- Complex animation frameworks
- Navigation systems
- Responsive design beyond basic considerations

## Future Content Feeds

These features are anticipated architecturally but not yet implemented:

### BlueSky
- Source: BlueSky public feed
- Ingested as JSON
- Rendered as short text blocks
- Chronological, limited count
- Styled identically to body copy

### Substack
- Source: Substack RSS or JSON
- Long-form links + excerpts
- Displayed as authored objects, not cards

### Gallery / Visual Blog
- Small gallery for experiments and sketches
- Visual-first presentation
- Maintains authored, intentional aesthetic
