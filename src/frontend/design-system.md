# Frontend Design - SmartCondo

## Visual Identity

### Color Palette - "Urban Modern"
A deliberate departure from AI defaults, grounded in the urban architectural context of smart condominium management:

- **Primary Dark**: `#1A1F2E` - Deep charcoal representing building structure
- **Primary Light**: `#F5F7FA` - Clean off-white for readability
- **Accent Cyan**: `#00B8D9` - Technology/connectivity accent (not the typical green/vermilion)
- **Accent Warm**: `#F2A95C` - Warmth for notifications/alerts (not the typical terracotta)
- **Neutral Medium**: `#6B7280` - Secondary text/controls
- **Success Green**: `#22C55E` - Positive actions/confirmations
- **Error Red**: `#EF4444` - Errors/critical alerts

### Typography - "Inter State"
- **Display Font**: "Space Grotesk" - Bold, architectural, distinctive
- **Body Font**: "Inter" - Clean, readable, professional
- **Type Scale**: 
  - H1: 3rem (48px), weight 700
  - H2: 2rem (32px), weight 600
  - H3: 1.5rem (24px), weight 600
  - Body: 1rem (16px), weight 400
  - Caption: 0.875rem (14px), weight 500

### Layout Principles

#### Admin/Management Portal Layout
- **Sidebar Navigation**: Left-aligned, collapsible, with icon-only labels on hover
- **Content Area**: Left-aligned with max-width 1440px, 24px gutter
- **Grid System**: 12-column desktop, 2-column tablet, 1-column mobile
- **Spacing**: Consistent 4px base unit (4, 8, 12, 16, 20, 24, 28, 32)

#### Resident Portal Layout
- **Top Navigation**: Center-aligned brand, right-aligned user menu
- **Content Area**: Full-width with max-width 1200px, asymmetric spacing
- **Card Layout**: Variable height, no forced grid, content-driven
- **Mobile-First**: Hamburger menu, bottom navigation on small screens

### Design Avoidances (per skill guidance)

**NOT doing:**
- ❌ Warm cream background (#F4F1EA)
- ❌ High-contrast serif display with terracotta accent (#D97757)
- ❌ Near-black background with acid-green accent
- ❌ Broadsheet-style with hairline rules
- ❌ Identical rounded cards with soft grey shadow
- ❌ ALL-CAPS eyebrow labels
- ❌ Middle dot separators ('A · B · C')
- ❌ Spaced em dashes ('WORD — fragment')
- ❌ Tinted near-black for black (#0B0B0B, #111)
- ❌ Monospace for small data labels
- ❌ Arrow appended to link/button text ('→')

**DOING:**
- ✅ Deep charcoal primary with cyan accent (tech-forward)
- ✅ Space Grotesk + Inter typography combination
- ✅ Left-aligned content with deliberate spacing
- ✅ Motion that answers user action, not scattered effects
- ✅ Written content as design content, not decoration
- ✅ Empty states as invitations to act
- ✅ Failure states explaining what went wrong
- ✅ Active voice in UI text ("Save" not "Submit")

### Component Guidelines

#### Buttons
- Primary: Cyan background (#00B8D9), white text, 4px border-radius
- Secondary: Transparent, cyan border, cyan hover fill
- Ghost: White background, cyan text, subtle hover
- Danger: Red background (#EF4444), white text
- Small: 32px height, 12px padding horizontal
- Large: 44px height, 16px padding horizontal

#### Cards
- White background, 1px border from primary dark
- No shadow (avoid the "soft grey shadow" default)
- Variable height based on content
- Hover: border color intensifies to accent cyan

#### Tables
- Alternating row opacity (not color)
- Hover row with background tint (not full color change)
- Compact padding (compact vertical, standard horizontal)
- Status badges with color semantics

#### Forms
- Labels above inputs (not inside, not all-caps)
- Inline validation on blur
- Error messages specific, not vague
- Success states with checkmark icon + text

#### Empty States
- Illustrative icon (specific to context, not generic)
- Descriptive headline explaining what's missing
- Call-to-action button primary color
- No placeholder text like "No data available"

#### Error States
- Specific error title (not generic "Error")
- Explanation of what happened
- Action button to resolve
- No vague "Something went wrong" messages

### Responsive Breakpoints
- **Mobile**: < 640px - Single column, simplified navigation
- **Tablet**: 640px - 1024px - Two column grid, collapsible sidebar
- **Desktop**: 1024px+ - Full 12-column grid, persistent sidebar

### Motion Guidelines
- **Page load**: Single orchestrated moment (fade-in sequence)
- **User action**: Motion that shows what changed (expanding, confirming)
- **Respect reduced motion**: `prefers-reduced-motion` media query
- **No fade-and-slide-up on every section** (avoid AI default)

### Accessibility
- Color contrast: Minimum 4.5:1 for normal text, 3:1 for large text
- Focus visible: 2px outline in accent cyan on focus
- Keyboard navigation: Logical tab order, skip links
- ARIA labels on interactive elements
- Descriptive link text (not "click here", not icon-only without accessible name)

### Writing Guidelines (per skill)
- Active voice: "Save changes" not "Submit"
- Specific, legible to new users
- Cohesion and consistency in vocabulary
- Treat failure as direction, not mood
- Conversational tone, plain verbs, sentence case
- Each written element does exactly one job

### Icon System
- Custom line-icon set, not the default heroicons/boxicons
- Consistent stroke width (2px)
- SVGs with viewBox optimization
- Color: Current text color, hover to accent cyan

### Design Tokens (CSS Custom Properties)
```css
:root {
  --color-primary-dark: #1A1F2E;
  --color-primary-light: #F5F7FA;
  --color-accent-cyan: #00B8D9;
  --color-accent-warm: #F2A95C;
  --color-neutral-medium: #6B7280;
  --color-success: #22C55E;
  --color-error: #EF4444;
  --font-display: "Space Grotesk", sans-serif;
  --font-body: "Inter", sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

This design system is grounded in the Smart Condominium management context - technology, urban architecture, transparency, and control. Every choice serves the brief rather than being a AI default.