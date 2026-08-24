# MiMusik Web — Design Direction

## Three possible approaches

### Theme Name: Quiet Analog Atelier
**Very Brief Intro:** A restrained digital listening room inspired by archival record sleeves, tactile print stock, and a carefully organized personal collection. It is intimate, editorial, and deliberately unhurried.

**Probability:** 0.07

### Theme Name: Living Index
**Very Brief Intro:** A bright, highly structured library inspired by modern research tools and museum catalogues. It emphasizes clarity, beautiful metadata, and an optimistic workbench feeling.

**Probability:** 0.04

### Theme Name: Prism After Hours
**Very Brief Intro:** A nocturnal sound space with softened spectral color, depth layers, and reactive musical motion. It prioritizes atmosphere while avoiding overt cyberpunk styling.

**Probability:** 0.09

## Selected approach: Quiet Analog Atelier

### Design Movement
**Contemporary editorial minimalism** with the material restraint of Japanese record sleeve design and the clarity of a modern personal knowledge archive.

### Core Principles
1. **Music as a personal collection:** Every song is treated as a piece in a well-cared-for archive, not an anonymous row in a dashboard.
2. **Quiet hierarchy:** Large typographic anchors, low-contrast surfaces, and a single controlled accent let listening remain the focus.
3. **Tactile digital material:** Fine grain, paper-like translucency, deep charcoal panels, and subtly softened edges create depth without decorative excess.
4. **Intentional motion:** Changes feel like a record being placed, a sleeve being pulled from a shelf, or a cursor moving through a catalogue—brief, clear, and never noisy.

### Color Philosophy
The base is an **ink-black graphite** rather than pure black, so the interface feels settled and comfortable during long listening sessions. Surfaces step upward through smoked charcoal and warm ash to preserve information hierarchy. The ownable accent is **Oxide Mint**, a muted green with the character of aged studio hardware; it signals active playback, focused states, and progress without becoming a neon distraction. A parchment-like warm white is reserved for high-emphasis typography and album placeholders.

### Layout Paradigm
The desktop experience is a **listening desk**: a slim, fixed library rail on the left; a broad, asymmetric collection canvas; and a player that sits as a dedicated instrument at the base rather than a generic footer. On mobile, the collection becomes a vertically layered stack: header, active context, browse surface, then a persistent, thumb-friendly bottom player and navigation rail. Content is organized by editorial rhythm rather than a uniform card grid.

### Signature Elements
1. **The track rail:** A thin vertical mint rule and index numbers bring subtle record-catalogue character to selected lists and playback context.
2. **Sleeve field:** Album art and empty-state imagery sit inside softly shadowed, squared-off sleeves with slight tonal paper grain.
3. **Signal meter:** A quiet three-bar, Web Audio-driven visualizer appears beside the current track and becomes the app’s recurring playback signature.

### Interaction Philosophy
Controls should feel immediate and physical. Primary actions use a concise press response; list rows reveal utility only on focus or hover; queue, importer, and playlist editing appear in practical sheets rather than interruptive full-page transitions. Keyboard commands are fast and unanimated, while a deliberate selection or import receives a small, reassuring feedback moment.

### Animation
Use 120–220 ms ease-out transitions for buttons, list focus, navigation, and player state. Panels emerge with a 0.96-to-1 scale and 180–260 ms opacity transition. Track changes may crossfade cover art and gently draw the progress line, while the signal meter moves only when audio analysis is available. Respect `prefers-reduced-motion` by preserving state changes without nonessential movement.

### Typography System
**Space Grotesk** supplies distinctive, compact display hierarchy for section titles, album titles, and active-track information. **DM Sans** is the functional reading face for navigation, metadata, controls, and dense library lists. Section titles use tight tracking with assertive sizes; metadata uses more open tracking, smaller scale, and muted color. Numeric durations use tabular figures.

### Brand Essence
**MiMusik Web is an offline listening desk for people who value their local collection as much as the music itself.**

Personality: **considered, tactile, dependable**.

### Brand Voice
Headlines are calm and declarative. Calls to action name the concrete next action; microcopy anticipates the user’s intent without sounding automated.

Example lines:

> “Your library, close at hand.”

> “Bring in the records you already love.”

### Wordmark & Logo
The wordmark uses a compact, tightly tracked **MiMusik** lockup paired with a graphic mark: a rounded-square record sleeve split by a diagonal **Oxide Mint** signal notch. The mark has no letters, reads at favicon size, and doubles as a library badge.

### Signature Brand Color
**Oxide Mint — #8CB9A5**

## Style Decisions

Every primary collection state uses the listening-desk composition: a library rail, an asymmetric archive canvas, and a bottom player treated as an instrument. Oxide Mint is reserved for catalog signals, active states, progress, indices, and the brand notch. Empty states are editorial sleeve fields with a clear local-import action rather than passive dashboard blanks.
