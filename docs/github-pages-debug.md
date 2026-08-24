# GitHub Pages Preview Notes

The repository-path production build emitted `/MiMusik-Web/` asset URLs and returned HTTP 200 for the generated entry module in a local static preview. The first browser visit to `http://localhost:4173/MiMusik-Web/#/care` displayed a blank document despite the correct title and no reported browser console output. The next verification step is to isolate preview-only injected assets and ensure no managed-runtime script is included in the production Pages artifact.

Runtime inspection confirmed that the base-prefixed entry, metadata chunk, chart chunk, CSS, service-worker registration, manifest, and local icon were requested. The document was complete but the React root remained empty. The Pages build must exclude managed-only plugins.

After excluding those plugins, the GitHub Pages build reduced `index.html` to a normal static document with no managed-only references, but the local preview still left the React root empty and produced no console messages. The next isolated check is the application’s route hook, because the failure persists after the managed-only runtime is removed.

Clearing all preview-origin service-worker registrations and caches before reload did not change the empty-root result. The remaining issue is therefore not stale PWA cache state.

The apparent blank-page failure was isolated to `vite preview`, which serves the output at its filesystem root and does not remount a non-root Vite `base` path. A dedicated static verifier mounted `dist/public` beneath `/MiMusik-Web/`, matching GitHub Pages. At `http://localhost:4174/MiMusik-Web/#/care`, the application mounted successfully, loaded the base-prefixed modules and local SVG mark, opened the Library Care hash route, and initialized an empty IndexedDB-backed workspace. GitHub Pages routing and static asset behavior are therefore verified against the correct hosting shape.
