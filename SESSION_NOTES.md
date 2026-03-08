# Session Notes

## Project
- OBS Discord overlay generator
- GitHub Pages single-page app
- Purpose: generate custom CSS for Discord Streamkit Overlay and preview it locally

## Current UI Layout
- Top: Preview panel
  - Heading is `プレビュー`
  - `Live Stack` heading is removed
  - Sticky on desktop
- Bottom left: Settings panel
  - Tabs: `共通設定` / `ユーザー設定`
  - `読込` / `保存` buttons on the right side of the tab row
- Bottom right: Generated CSS panel
  - Main action is `CSSをコピー`
  - `Paste Into OBS` heading is removed
- Bottom left corner: version label
- Bottom right corner: small Discord Streamkit link

## Current Main Behavior
- `Shared` was renamed to `共通設定`
- `Generator` heading is removed
- `Generated CSS` subheading `Paste Into OBS` is removed
- `Preview` subheading `Live Stack` is removed
- User editing is tab-based
- `Add User` creates a new user and switches to the Users tab
- User ordering uses left/right move buttons
- `表示する` is controlled from the user tab checkbox, not on the card body
- User tabs are horizontally scrollable
- User tab look is an integrated checkbox-like style
- Image `Data URL` textarea is hidden in the UI
- Images support both file import and clipboard paste

## Preview / CSS Behavior
- Preview and generated CSS are kept aligned as much as possible
- `発話時に明るくする`
  - affects both preview and generated CSS
  - when OFF, the normal slightly dark appearance still remains
- `発話時揺らす`
  - affects both preview and generated CSS
- Speaking frame supports:
  - frame stroke color
  - frame glow color
  - frame stroke width
  - frame glow strength
- White frame follows bobbing animation
- `Frame Stroke Width = 0` is allowed
- `Stack Left Padding` exists to avoid left-edge clipping of glow/frame
- `重なり幅` is hidden from the UI
  - hidden input remains for internal compatibility
- `最小高さ` upper bound is `480`

## Image Preset Behavior
- Image size preset changes display width and display height
- Changing image preset no longer overwrites `slotSpacing`
- Default initialization still applies preset-based default `slotSpacing`

## Image Import Behavior
- `取込画像の最大幅` is in the advanced `画像` section
- Imported images are resized using `resizeMaxWidth` / `resizeMaxHeight`
- Saved state keeps `dataUrl`

## JSON / Local Draft
- `JSON読込` / `JSON保存` are in the settings toolbar
- Last draft is best-effort saved to localStorage
- Local draft key: `obs-discord-overlay-generator:last-state`
- On startup, if a valid previous draft exists, do not auto-load it
- Show modal choices instead:
  - `前回の続きを使う`
  - `新規作成`
- If saved data is missing, broken, or too empty, do not show the modal
- localStorage failures such as quota errors are silently ignored
- No save-failure warning is shown currently

## Japanese Copy Policy
- UI text is primarily Japanese
- Wording prefers clarity of use over literal translation
- Internal keys, JSON keys, and class names remain English

## File Structure
- [app.js](G:\Codex\discord\app.js)
  - glue layer
  - DOM references
  - top-level event wiring
  - calls into the specialized modules
- [css-generator.js](G:\Codex\discord\css-generator.js)
  - generated CSS builder
  - speaking filter calculation
  - frame SVG data URL generation
  - shared color/clamp helpers used by CSS generation
- [state-io.js](G:\Codex\discord\state-io.js)
  - export / import
  - local draft read/save/clear
  - saved time formatting
- [preview.js](G:\Codex\discord\preview.js)
  - preview DOM reuse
  - preview render logic
- [user-editor.js](G:\Codex\discord\user-editor.js)
  - user tab DOM reuse
  - user card creation
  - user editor UI event handling
- [shared-settings.js](G:\Codex\discord\shared-settings.js)
  - shared form read / set
  - preset application
  - preset detection
  - default state initialization

## Design Intent
- `app.js` should stay thin and act mainly as the integration layer
- Small changes should usually touch one focused module
- Script loading remains plain browser scripts with `window.*` exports
- No `type="module"` migration has been done

## Current Notes
- Be careful with PowerShell write operations because encoding can break Japanese text
- Prefer `apply_patch` for edits
- Keep files UTF-8
- Changes that affect both preview and generated CSS may require touching multiple modules

## Current Status
- No major known functional issue at hand
- Latest behavior change: image preset changes do not overwrite `slotSpacing`
- Added image cropping flow:
  - per-user `トリミング` button in the user editor
  - modal crop UI with drag and zoom
  - output is saved back into the user's `dataUrl`
  - crop aspect ratio follows `sharedDisplayWidth / sharedDisplayHeight`
- Added help flow:
  - `使い方` button in the settings toolbar
  - modal with the shortest usage steps from setup to OBS paste
- Updated shared image size presets upward:
  - `small` now matches the old `large`
  - `medium` now matches the old `xlarge`
  - `large` is one step larger than the old `xlarge`
  - `xlarge` was moved up as well to preserve ordering
