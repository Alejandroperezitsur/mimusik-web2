# MiMusik Mobile UX Verification Notes

## Initial responsive finding

The first 320px capture exposed two search controls in the mobile header: the retained desktop trigger was overriding its utility class through the existing custom selector, while the new mobile action also rendered. The desktop trigger is now explicitly hidden below the desktop breakpoint. The follow-up 320px capture shows one intentional search icon on the right beside Library Care, without horizontal overflow or clipped bottom navigation.

The revised compact layout keeps the persistent mini-player below the safe bottom-navigation zone. The empty collection card remains readable at the narrowest requested width. Further sizes, interactive surfaces, and desktop regression remain to be verified.

## 375px and 390px captures

Both requested viewport captures preserve a single right-aligned search action, visible Library Care action, intact editorial card proportions, and readable collection labels. There is no observed horizontal overflow, clipped header text, or bottom-navigation collision in these empty-library captures. The compact player and bottom navigation are present in the viewport capture and remain separate in the 320px check.

## 412px and 430px captures

The larger phone widths preserve the same designed hierarchy: left brand, right-aligned search and utility controls, legible collection metadata, and an editorial empty-library card with no clipped corners or unexpected horizontal scrolling. The card scales without becoming visually oversized, and the page retains bottom space reserved for the fixed mobile navigation and player layers.

## Desktop regression capture

The desktop listening-desk capture retains the full-width search trigger, three desktop utility controls, asymmetric collection canvas, and desktop player layout. The mobile-only style rules do not visibly alter the desktop library presentation. The Library Care path mounted without a client error, although the current empty-library state leaves the same workspace shell as the main collection view in this static capture.

## Hash-routed mobile workspaces

The actual deployed-style hash paths `/#/care` and `/#/stats` were captured at 390px. Library Care renders its storage, maintenance, integrity, and backup cards as a readable single-column mobile workspace. The empty listening-log state remains legible with no offscreen controls or horizontal overflow. These route captures also confirm that the mobile header actions remain stable outside the main library view.

## Artwork diagnosis and correction

The original cover component made an independent object URL for every rendered use of a cover Blob and revoked it at each component cleanup. A single imported cover can be mounted by rows, search results, the mini-player, and the expanded player at the same time, so this created repeated URL churn and made a URL vulnerable to a sibling unmount. The original no-cover fallback also used an absolute image path that was not part of a GitHub Pages deployment.

`CoverArt` now acquires a shared, reference-counted URL per persisted cover Blob and releases it only after the final consumer has unmounted plus a short grace period. The fallback is now a local CSS artwork treatment rather than a managed-platform image path. The focused lifecycle test proves one URL is shared, retained while another consumer still exists, and finally revoked only after the grace period. The pre-existing database test proves cover Blobs survive a database close-and-reopen cycle.

## Mobile interaction correction

The header now uses a right-aligned mobile search action and a focused full-screen search surface, rather than exposing a centered compressed desktop field. The collapsed player has a five-pixel high-contrast progress rail, while the full player presents a 58px touch-safe waveform, elapsed time, remaining time, and total duration. The waveform supports tap and drag seeking through pointer capture. The mini-player has intentional player-only swipes: horizontal for next/previous and upward to expand; the full player uses horizontal transport swipes and downward close. Threshold tests reject short and diagonal movement to protect ordinary scrolling.

Safe-area padding is applied to the top header, expanded player, bottom navigation, mini-player, and workspace reserve space. PWA installation uses `beforeinstallprompt` only when supplied by the browser, hides after installation, and provides an iOS Add to Home Screen explanation rather than a nonfunctional install control.

## Remaining real-device boundary

This environment verified TypeScript, behavior tests, production PWA output, exact hash routes, and visual layouts from 320px through 430px plus desktop. It cannot inject a real tagged music file into the deployed GitHub Pages browser storage or simulate iOS Safari's native installation sheet. After the next GitHub Pages deployment, a real device must import one tagged audio file, close and reopen the browser, and confirm the returned artwork, mini-player, full-player, drag seek, and PWA install path before those physical-device conditions can be marked complete.
