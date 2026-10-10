[CONTEXT]
Design a clean, editorial developer-focused AI tool landing page for Hemory (a context-engine and private persistent memory layer for AI agents via MCP). The product captures ambient audio/interaction logs and wires searchable context directly into AI agents and developer tooling.

[OVERALL STYLE]
Visual style: Editorial Minimalist SaaS with warm tactile undertones and Swiss typographic clarity. Inspired by Linear, Raycast, and Anthropic. Mood: quiet confidence, technical, intelligent, restrained. Palette is grounded in warm off-white canvas with high-contrast soft charcoal typography and a distinctive terracotta/burnt rust accent for key actions.

[SCREEN TO GENERATE — ONE SCREEN: HERO & LANDING INTRO]
Generate the desktop hero and primary introduction landing page with this layout:
- Top Navigation Bar (Header):
  - Left: Hemory logo mark (minimalist 3-bar audio wave icon + wordmark 'Hemory' in semibold weight 600).
  - Center: Horizontal navigation links ('Home', 'Features', 'Pricing', 'Docs', 'Blog', 'About') with subtle hover underlines and muted neutral tone.
  - Right: Minimal 'Log in' text action button.
- Hero Section (Split Asymmetric Layout):
  - Eyebrow Badge: Monospace/spaced uppercase sans 'INTRODUCING — HEMORY' in muted warm gray.
  - Main Headline (H1): Massive editorial display heading (~64px, tight leading 1.05, tracking -0.03em) featuring two-tone color hierarchy:
    - Line 1-2: 'Hemory listens, always on —' in deep soft-black (#121212).
    - Line 3-4: 'wiring real memory into your agents' in muted stone gray (#71717A).
  - Content & Action Split Row (aligned with baseline rhythm):
    - Left column: Concise subheadline ('Everything you live through settles into a private, searchable memory — connected to your agents over MCP, unleashing memory's full potential.') in 16px regular body text, line-height 1.6.
    - Right column: Action pill grouping featuring Primary CTA 'Get Hemory ↗' (terracotta solid #C85A32, white text, 8px radius) alongside Secondary CTA 'See How It Works ↗' (subtle hairline border, soft hover background) + Platform compatibility subtext ('iOS + Android' in bold, followed by 'macOS, Windows, Linux, Web and Self-host coming soon' in 12px muted text).
- Bottom Ecosystem Strip (Integration Bar):
  - Subtle hairline top border divider.
  - Left label: 'WORKS WITH'.
  - Inline logos/badges: Claude Code, Codex, Gemini, Cursor, VS Code, OpenClaw, Hermes, and standard MCP clients.

[COMPONENTS]
Required components:
- Navbar: Fixed/sticky header with subtle 1px divider, generous horizontal padding (48px), transparent/backdrop-blur background.
- Split Headline Text Block: Dual-color H1 heading showing stateful contrast.
- Action Cluster: Grouped primary terracotta button, secondary outline button, and micro-typography platform note.
- Integration Ticker: Muted monochrome ecosystem partner ticker with grayscale SVG icons.

[DESIGN TOKENS]
Colors:
- Primary: #C85A32 (warm terracotta / burnt rust — used exclusively on primary CTA)
- Primary Hover: #B34E2A
- Background: #F7F6F2 (warm off-white / light canvas)
- Surface: #FFFFFF (pure crisp white for cards and floating menus)
- Surface-subtle: #EFECE6
- Text-primary: #121212 (soft charcoal black, 16.5:1 contrast on canvas — WCAG AAA)
- Text-secondary: #71717A (muted stone gray for two-tone headings and descriptions, 4.8:1 contrast — WCAG AA)
- Text-tertiary: #A1A1AA (captions, platform footnote)
- Border: #E5E2DC (warm hairline divider)

Typography:
- Headings: Geometric Grotesque Sans (Inter / Geist / Neue Montreal), H1: 64px, line-height: 1.05, letter-spacing: -0.03em, weight 600
- Eyebrow: 12px, letter-spacing: 0.12em, uppercase, weight 500
- Body: 16px, weight 400, line-height: 1.6
- Platform Footnote: 12px, line-height: 1.4, weight 400

Spacing: 8px base grid. Section padding: 64px vertical, container max-width: 1280px with 48px gutter.
Border radius: 8px for primary/secondary buttons, 12px for modal/cards, full pill (9999px) for status indicators.
Elevation: Flat-first philosophy; depth achieved through warm hairline borders (1px solid #E5E2DC) and subtle 1px border contrast instead of heavy drop shadows.

[CONTENT]
Hero eyebrow: 'INTRODUCING — HEMORY'
Headline Part 1: 'Hemory listens, always on —'
Headline Part 2: 'wiring real memory into your agents'
Subcopy: 'Everything you live through settles into a private, searchable memory — connected to your agents over MCP, unleashing memory's full potential.'
Primary CTA: 'Get Hemory ↗'
Secondary CTA: 'See How It Works ↗'
Platform Availability: 'iOS + Android'
Platform Coming Soon: 'macOS, Windows, Linux, Web and Self-host coming soon'

[INTERACTIONS]
- Primary button hover: Smooth transition to #B34E2A, slight arrow translation top-right by 2px.
- Secondary button hover: Background shift to #EFECE6.
- Navigation link hover: Color transition to #121212.

[RESPONSIVE]
Desktop-first (1280px container). On tablet (md: 768px), collapse action grouping into full-width column underneath description. On mobile (<640px), H1 scales to 38px, two-column action group stacks vertically with touch targets >= 48px.

[ACCESSIBILITY]
WCAG AAA compliance for #121212 text on #F7F6F2. All interactive elements have visible 2px keyboard focus ring with offset. Semantic markup: header, nav, main, section, footer.

[TECH OUTPUT]
Generate as Next.js 15 + React 19 + Tailwind CSS v4 using semantic HTML5 and clean CSS variables.

[RULES TO NEVER BREAK]
- Never use pure black (#000000) or cold blue-toned gray backgrounds.
- Never use heavy drop shadows or glassmorphism blurs.
- Always maintain the dual-tone contrast between the first and second half of the main headline.