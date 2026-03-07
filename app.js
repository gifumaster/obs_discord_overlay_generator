const sharedForm = document.querySelector("#shared-form");
const userList = document.querySelector("#user-list");
const userRowTemplate = document.querySelector("#user-row-template");
const addUserButton = document.querySelector("#add-user");
const saveJsonButton = document.querySelector("#save-json");
const loadJsonField = document.querySelector("#load-json");
const copyButton = document.querySelector("#copy-css");
const copyStatus = document.querySelector("#copy-status");
const output = document.querySelector("#css-output");
const resumeModal = document.querySelector("#resume-modal");
const resumeDescription = document.querySelector("#resume-description");
const resumePreviousButton = document.querySelector("#resume-previous");
const resumeNewButton = document.querySelector("#resume-new");
const previewCanvas = document.querySelector("#preview-canvas");
const previewEmptyState = document.querySelector("#preview-empty-state");
const userTabBar = document.querySelector("#user-tab-bar");
const userEmptyState = document.querySelector("#user-empty-state");
const tabSharedButton = document.querySelector("#tab-shared");
const tabUsersButton = document.querySelector("#tab-users");
const sharedPanel = document.querySelector("#panel-shared");
const usersPanel = document.querySelector("#panel-users");
const sharedAdvancedPanel = document.querySelector("#shared-advanced-panel");
const clipPresetField = document.querySelector("#clip-preset");
const clipLeftTopField = document.querySelector("#clip-left-top");
const clipRightTopField = document.querySelector("#clip-right-top");
const clipRightBottomField = document.querySelector("#clip-right-bottom");
const clipLeftBottomField = document.querySelector("#clip-left-bottom");
const sharedSizePresetField = document.querySelector("#shared-size-preset");
const sharedDisplayWidthField = document.querySelector("#shared-display-width");
const sharedDisplayHeightField = document.querySelector("#shared-display-height");
const frameColorField = document.querySelector("#frame-color");
const frameGlowColorField = document.querySelector("#frame-glow-color");
const frameStrokeWidthField = document.querySelector("#frame-stroke-width");
const frameGlowStrengthField = document.querySelector("#frame-glow-strength");

const CLIP_PRESETS = {
  light: { clipLeftTop: 18, clipRightTop: 100, clipRightBottom: 82, clipLeftBottom: 0 },
  medium: { clipLeftTop: 24, clipRightTop: 100, clipRightBottom: 76, clipLeftBottom: 0 },
  strong: { clipLeftTop: 30, clipRightTop: 100, clipRightBottom: 70, clipLeftBottom: 0 },
  extreme: { clipLeftTop: 36, clipRightTop: 100, clipRightBottom: 64, clipLeftBottom: 0 }
};

const SIZE_PRESETS = {
  small: { displayWidth: 72, displayHeight: 128, slotSpacing: 92 },
  medium: { displayWidth: 90, displayHeight: 160, slotSpacing: 108 },
  large: { displayWidth: 108, displayHeight: 192, slotSpacing: 126 },
  xlarge: { displayWidth: 126, displayHeight: 224, slotSpacing: 144 }
};

const SAMPLE_IMAGE_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 160">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#24324f"/>
      <stop offset="45%" stop-color="#1b2440"/>
      <stop offset="100%" stop-color="#12192c"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9bd6ff" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#6f8fff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#7bffe0" stop-opacity="0.18"/>
    </linearGradient>
    <linearGradient id="stripe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="90" height="160" rx="14" fill="url(#bg)"/>
  <rect x="10" y="10" width="70" height="140" rx="12" fill="url(#accent)" opacity="0.6"/>
  <path d="M18 16h34l-20 128H18z" fill="url(#stripe)" opacity="0.55"/>
  <path d="M48 10h22L42 150H20z" fill="#ffffff" opacity="0.08"/>
  <path d="M66 10h10L54 150H44z" fill="#9bd6ff" opacity="0.14"/>
</svg>
`)}`;
const LOCAL_DRAFT_KEY = "obs-discord-overlay-generator:last-state";
const LOCAL_DRAFT_VERSION = 1;

let nextUserNumber = 1;
let usersState = [];
let activeUserId = null;
let statusTimeoutId = null;
let localDraftSaveTimeoutId = null;

function setStatus(message = "", type = "info", persist = false) {
  if (statusTimeoutId) {
    clearTimeout(statusTimeoutId);
    statusTimeoutId = null;
  }

  copyStatus.textContent = message;
  copyStatus.classList.toggle("is-empty", !message);
  copyStatus.classList.toggle("is-error", type === "error");

  if (message && !persist) {
    statusTimeoutId = window.setTimeout(() => {
      copyStatus.textContent = "";
      copyStatus.classList.add("is-empty");
      copyStatus.classList.remove("is-error");
      statusTimeoutId = null;
    }, 2800);
  }
}

function setActiveTab(tabName) {
  const isShared = tabName === "shared";
  tabSharedButton.classList.toggle("is-active", isShared);
  tabUsersButton.classList.toggle("is-active", !isShared);
  tabSharedButton.setAttribute("aria-selected", String(isShared));
  tabUsersButton.setAttribute("aria-selected", String(!isShared));
  tabSharedButton.tabIndex = isShared ? 0 : -1;
  tabUsersButton.tabIndex = isShared ? -1 : 0;
  sharedPanel.hidden = !isShared;
  usersPanel.hidden = isShared;
  sharedPanel.classList.toggle("is-active", isShared);
  usersPanel.classList.toggle("is-active", !isShared);
}

function clampPercent(value, fallback) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, number));
}

function sanitizeSelectorValue(value, fallback) {
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/"/g, '\\"') : fallback;
}

function sanitizeSelector(selector, fallback) {
  const trimmed = selector.trim();
  return trimmed || fallback;
}

function normalizeHexColor(value, fallback) {
  const trimmed = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

function hexToRgba(value, alpha, fallback = "#ffffff") {
  const hex = normalizeHexColor(value, fallback).slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}

function clampFrameCoordinate(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scheduleLocalDraftSave() {
  if (localDraftSaveTimeoutId) {
    clearTimeout(localDraftSaveTimeoutId);
  }

  localDraftSaveTimeoutId = window.setTimeout(() => {
    localDraftSaveTimeoutId = null;

    try {
      localStorage.setItem(
        LOCAL_DRAFT_KEY,
        JSON.stringify({
          version: LOCAL_DRAFT_VERSION,
          savedAt: new Date().toISOString(),
          state: exportState()
        })
      );
    } catch (error) {
      // Ignore quota/storage failures and keep the editor usable.
    }
  }, 180);
}

function clearLocalDraft() {
  try {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
}

function readLocalDraft() {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.state || typeof parsed.state !== "object") {
      return null;
    }

    const hasShared = parsed.state.shared && typeof parsed.state.shared === "object";
    const hasUsers = Array.isArray(parsed.state.users) && parsed.state.users.length > 0;

    if (!hasShared || !hasUsers) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function closeResumeModal() {
  resumeModal.hidden = true;
}

function showResumeModal(draft) {
  const savedAtLabel = formatSavedAt(draft.savedAt);
  resumeDescription.textContent = savedAtLabel
    ? `A locally saved draft from ${savedAtLabel} is available.`
    : "A locally saved draft is available from your last visit.";
  resumeModal.hidden = false;
}

function initializeDefaultState() {
  usersState = [];
  activeUserId = null;
  nextUserNumber = 1;
  applyClipPreset("medium");
  applySharedSizePreset("medium");
  createUserRow({ label: "User 1", userId: "123456789012345678" });
  setActiveTab("shared");
  setStatus("");
  updateOutput();
}

function applyClipPreset(presetName) {
  const preset = CLIP_PRESETS[presetName];
  if (!preset) {
    return;
  }

  clipLeftTopField.value = String(preset.clipLeftTop);
  clipRightTopField.value = String(preset.clipRightTop);
  clipRightBottomField.value = String(preset.clipRightBottom);
  clipLeftBottomField.value = String(preset.clipLeftBottom);
}

function detectClipPreset() {
  const current = {
    clipLeftTop: clampPercent(clipLeftTopField.value, 24),
    clipRightTop: clampPercent(clipRightTopField.value, 100),
    clipRightBottom: clampPercent(clipRightBottomField.value, 76),
    clipLeftBottom: clampPercent(clipLeftBottomField.value, 0)
  };

  const matchedPreset = Object.entries(CLIP_PRESETS).find(([, preset]) =>
    preset.clipLeftTop === current.clipLeftTop &&
    preset.clipRightTop === current.clipRightTop &&
    preset.clipRightBottom === current.clipRightBottom &&
    preset.clipLeftBottom === current.clipLeftBottom
  );

  clipPresetField.value = matchedPreset ? matchedPreset[0] : "custom";
}

function readSharedSettings() {
  return {
    containerSelector: document.querySelector("#container-selector").value.trim() || ".voice_states",
    speakingClass: document.querySelector("#speaking-class").value.trim() || "wrapper_speaking",
    slotSpacing: Math.max(0, Number(document.querySelector("#slot-spacing").value) || 78),
    overlap: Math.max(0, Number(document.querySelector("#overlap").value) || 30),
    stackLeftPadding: Math.max(0, Number(document.querySelector("#stack-left-padding").value) || 18),
    zIndexBase: Number(document.querySelector("#z-index-base").value) || 10,
    minHeight: Math.max(1, Number(document.querySelector("#min-height").value) || 96),
    clipPreset: clipPresetField.value,
    clipLeftTop: clampPercent(clipLeftTopField.value, 24),
    clipRightTop: clampPercent(clipRightTopField.value, 100),
    clipRightBottom: clampPercent(clipRightBottomField.value, 76),
    clipLeftBottom: clampPercent(clipLeftBottomField.value, 0),
    bobDistance: Math.max(0, Number(document.querySelector("#bob-distance").value) || 4),
    bobDuration: Math.max(0.1, Number(document.querySelector("#bob-duration").value) || 0.6),
    resizeMaxWidth: Math.max(1, Number(document.querySelector("#resize-max-width").value) || 216),
    resizeMaxHeight: Math.max(1, Number(document.querySelector("#resize-max-height").value) || 384),
    sharedSizePreset: sharedSizePresetField.value,
    sharedDisplayWidth: Math.max(1, Number(sharedDisplayWidthField.value) || 90),
    sharedDisplayHeight: Math.max(1, Number(sharedDisplayHeightField.value) || 160),
    frameColor: normalizeHexColor(frameColorField.value, "#ffffff"),
    frameGlowColor: normalizeHexColor(frameGlowColorField.value, "#ffffff"),
    frameStrokeWidth: Math.max(0, Number(frameStrokeWidthField.value ?? 2)),
    frameGlowStrength: clampNumber(frameGlowStrengthField.value, 0.2, 3, 1),
    advancedOpen: sharedAdvancedPanel.open,
    enableGlow: document.querySelector("#enable-glow").checked,
    enableBobbing: document.querySelector("#enable-bobbing").checked
  };
}

function setSharedSettings(sharedSettings) {
  document.querySelector("#container-selector").value = sharedSettings.containerSelector || ".voice_states";
  document.querySelector("#speaking-class").value = sharedSettings.speakingClass || "wrapper_speaking";
  document.querySelector("#slot-spacing").value = String(sharedSettings.slotSpacing ?? 78);
  document.querySelector("#overlap").value = String(sharedSettings.overlap ?? 30);
  document.querySelector("#stack-left-padding").value = String(sharedSettings.stackLeftPadding ?? 18);
  document.querySelector("#z-index-base").value = String(sharedSettings.zIndexBase ?? 10);
  document.querySelector("#min-height").value = String(sharedSettings.minHeight ?? 96);
  document.querySelector("#resize-max-width").value = String(sharedSettings.resizeMaxWidth ?? 216);
  document.querySelector("#resize-max-height").value = String(sharedSettings.resizeMaxHeight ?? 384);
  sharedSizePresetField.value = sharedSettings.sharedSizePreset || "medium";
  sharedDisplayWidthField.value = String(sharedSettings.sharedDisplayWidth ?? 90);
  sharedDisplayHeightField.value = String(sharedSettings.sharedDisplayHeight ?? 160);
  frameColorField.value = normalizeHexColor(sharedSettings.frameColor, "#ffffff");
  frameGlowColorField.value = normalizeHexColor(sharedSettings.frameGlowColor, "#ffffff");
  frameStrokeWidthField.value = String(sharedSettings.frameStrokeWidth ?? 2);
  frameGlowStrengthField.value = String(sharedSettings.frameGlowStrength ?? 1);
  sharedAdvancedPanel.open = sharedSettings.advancedOpen ?? false;
  document.querySelector("#bob-distance").value = String(sharedSettings.bobDistance ?? 4);
  document.querySelector("#bob-duration").value = String(sharedSettings.bobDuration ?? 0.6);
  document.querySelector("#enable-glow").checked = sharedSettings.enableGlow ?? true;
  document.querySelector("#enable-bobbing").checked = sharedSettings.enableBobbing ?? true;

  if (sharedSettings.clipPreset && sharedSettings.clipPreset !== "custom" && CLIP_PRESETS[sharedSettings.clipPreset]) {
    clipPresetField.value = sharedSettings.clipPreset;
    applyClipPreset(sharedSettings.clipPreset);
  } else {
    clipLeftTopField.value = String(sharedSettings.clipLeftTop ?? 24);
    clipRightTopField.value = String(sharedSettings.clipRightTop ?? 100);
    clipRightBottomField.value = String(sharedSettings.clipRightBottom ?? 76);
    clipLeftBottomField.value = String(sharedSettings.clipLeftBottom ?? 0);
    detectClipPreset();
  }
}

function readUserRows() {
  return usersState.map(({ internalId, editorCard, ...user }) => ({ ...user }));
}

function buildSpeakingBlock(sharedSettings) {
  const lines = [];

  if (sharedSettings.enableGlow) {
    lines.push("  filter: brightness(1.34) saturate(0.72) contrast(1.08);");
  }

  if (sharedSettings.enableBobbing) {
    lines.push(`  animation: obsVoiceBob ${sharedSettings.bobDuration}s ease-in-out infinite;`);
  }

  if (lines.length === 0) {
    lines.push("  opacity: 1;");
  }

  return lines.join("\n");
}

function buildSpeakingFrameBlock(sharedSettings) {
  const lines = [];

  if (sharedSettings.enableBobbing) {
    lines.push(`  animation: obsVoiceBob ${sharedSettings.bobDuration}s ease-in-out infinite;`);
  }

  return lines.join("\n");
}

function buildClipFrameDataUrl(sharedSettings) {
  const strokeWidth = Math.max(0, Number(sharedSettings.frameStrokeWidth ?? 2));
  const halfStroke = strokeWidth / 2;
  const width = Math.max(1, sharedSettings.sharedDisplayWidth);
  const height = Math.max(1, sharedSettings.sharedDisplayHeight);
  const minX = halfStroke;
  const maxX = Math.max(halfStroke, width - halfStroke);
  const minY = halfStroke;
  const maxY = Math.max(halfStroke, height - halfStroke);
  const points = [
    `${clampFrameCoordinate((sharedSettings.clipLeftTop / 100) * width, minX, maxX)},${minY}`,
    `${clampFrameCoordinate((sharedSettings.clipRightTop / 100) * width, minX, maxX)},${minY}`,
    `${clampFrameCoordinate((sharedSettings.clipRightBottom / 100) * width, minX, maxX)},${maxY}`,
    `${clampFrameCoordinate((sharedSettings.clipLeftBottom / 100) * width, minX, maxX)},${maxY}`
  ].join(" ");
  if (strokeWidth === 0) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"></svg>`)}`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <polygon
    points="${points}"
    fill="none"
    stroke="${normalizeHexColor(sharedSettings.frameColor, "#ffffff")}"
    stroke-width="${strokeWidth}"
    stroke-linejoin="round"
  />
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildUserCss(sharedSettings, user) {
  const userId = sanitizeSelectorValue(user.userId, "USER_ID_HERE");
  const dataUrl = user.dataUrl || SAMPLE_IMAGE_DATA_URL;
  const frameDataUrl = buildClipFrameDataUrl(sharedSettings);
  const glowStrength = clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1);
  const nameGap = 6;
  const nameHeight = 26;
  const nameInset = 4;
  const displayWidth = sharedSettings.sharedDisplayWidth;
  const displayHeight = sharedSettings.sharedDisplayHeight;
  const clipPath =
    `polygon(${sharedSettings.clipLeftTop}% 0, ${sharedSettings.clipRightTop}% 0, ` +
    `${sharedSettings.clipRightBottom}% 100%, ${sharedSettings.clipLeftBottom}% 100%)`;
  const slotStep = Math.max(0, sharedSettings.slotSpacing - sharedSettings.overlap);
  const slotLeft = sharedSettings.stackLeftPadding + ((user.slotNumber - 1) * slotStep);
  const itemZIndex = sharedSettings.zIndexBase + user.slotNumber;
  const nameWidth = Math.max(36, Math.min(displayWidth - nameInset, slotStep || displayWidth) - nameInset);

  return `li[data-userid="${userId}"] {
  position: absolute;
  left: ${slotLeft}px;
  top: ${user.topOffset}px;
  width: ${displayWidth}px;
  min-height: ${Math.max(sharedSettings.minHeight, displayHeight + nameGap + nameHeight)}px;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  z-index: ${itemZIndex};
  overflow: visible !important;
}

li[data-userid="${userId}"] .voice_avatar {
  display: none !important;
}

li[data-userid="${userId}"] .voice_username {
  position: absolute;
  left: ${nameInset}px;
  top: ${displayHeight + nameGap}px;
  width: ${nameWidth}px;
  max-width: ${nameWidth}px;
  display: flex;
  justify-content: flex-start;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden;
}

li[data-userid="${userId}"] .voice_username > span {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

li[data-userid="${userId}"]::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: ${displayWidth}px;
  height: ${displayHeight}px;
  background: url("${dataUrl}") center / 100% 100% no-repeat;
  clip-path: ${clipPath};
  pointer-events: none;
  z-index: 10;
  filter: brightness(0.86) saturate(0.92);
  transition: filter 0.15s ease;
}

li[data-userid="${userId}"]::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: ${displayWidth}px;
  height: ${displayHeight}px;
  background: url("${frameDataUrl}") center / 100% 100% no-repeat;
  opacity: 0;
  pointer-events: none;
  z-index: 11;
  filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0));
  transition: opacity 0.15s ease, filter 0.15s ease;
}

li[data-userid="${userId}"].${sharedSettings.speakingClass}::before {
${buildSpeakingBlock(sharedSettings)}
}

li[data-userid="${userId}"].${sharedSettings.speakingClass}::after {
  opacity: 1;
  filter:
    drop-shadow(0 0 ${Math.max(1, Math.round(3 * glowStrength))}px ${hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.98 * glowStrength))})
    drop-shadow(0 0 ${Math.max(2, Math.round(8 * glowStrength))}px ${hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.72 * glowStrength))})
    drop-shadow(0 0 ${Math.max(4, Math.round(18 * glowStrength))}px ${hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.42 * glowStrength))});
${buildSpeakingFrameBlock(sharedSettings)}
}`;
}

function buildCss() {
  const sharedSettings = readSharedSettings();
  const users = readUserRows()
    .filter((user) => user.enabled)
    .map((user, index) => ({ ...user, slotNumber: index + 1 }));
  const speakingClass = sharedSettings.speakingClass.replace(/[^a-zA-Z0-9_-]/g, "") || "wrapper_speaking";
  const containerSelector = sanitizeSelector(sharedSettings.containerSelector, ".voice_states");
  const maxUserHeight = users.reduce(
    (currentMax, user) => Math.max(currentMax, sharedSettings.sharedDisplayHeight + Math.abs(user.topOffset)),
    sharedSettings.minHeight
  );
  const bobKeyframes = sharedSettings.enableBobbing ? `

@keyframes obsVoiceBob {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(calc(0px - ${sharedSettings.bobDistance}px));
  }
  100% {
    transform: translateY(0);
  }
}` : "";
  const userCssBlocks = users.map((user) => buildUserCss({ ...sharedSettings, speakingClass }, user)).join("\n\n");

  return `${containerSelector} {
  position: relative;
  min-height: ${Math.max(sharedSettings.minHeight, maxUserHeight)}px;
  overflow: visible !important;
}

${userCssBlocks}${bobKeyframes}
`;
}

function updateUserTitle(card) {
  const label = card.querySelector(".user-label").value.trim();
  card.querySelector(".user-card-title").textContent = label || "User";
}

function applySharedSizePreset(presetName) {
  const preset = SIZE_PRESETS[presetName];
  if (!preset) {
    return;
  }

  sharedDisplayWidthField.value = String(preset.displayWidth);
  sharedDisplayHeightField.value = String(preset.displayHeight);
  document.querySelector("#slot-spacing").value = String(preset.slotSpacing);
}

function detectSharedSizePreset() {
  const currentWidth = Math.max(1, Number(sharedDisplayWidthField.value) || 90);
  const currentHeight = Math.max(1, Number(sharedDisplayHeightField.value) || 160);
  const matchedPreset = Object.entries(SIZE_PRESETS).find(([, preset]) =>
    preset.displayWidth === currentWidth &&
    preset.displayHeight === currentHeight
  );

  sharedSizePresetField.value = matchedPreset ? matchedPreset[0] : "custom";
}

function updateOutput() {
  output.value = buildCss();
  renderPreview();
  scheduleLocalDraftSave();
}

function exportState() {
  return {
    version: 1,
    shared: readSharedSettings(),
    users: readUserRows()
  };
}

function importState(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Invalid JSON state.");
  }

  setSharedSettings(state.shared || {});
  usersState = [];
  nextUserNumber = 1;

  const users = Array.isArray(state.users) && state.users.length > 0
    ? state.users
    : [{ label: "User 1", userId: "" }];

  users.forEach((user) => createUserRow(user));
  activeUserId = usersState[0]?.internalId || null;
  renderUserTabs();
  renderActiveUserEditor();
  updateOutput();
}

function renderPreview() {
  const sharedSettings = readSharedSettings();
  const users = readUserRows()
    .filter((user) => user.enabled)
    .map((user, index) => ({ ...user, slotNumber: index + 1 }));
  const clipPath =
    `polygon(${sharedSettings.clipLeftTop}% 0, ${sharedSettings.clipRightTop}% 0, ` +
    `${sharedSettings.clipRightBottom}% 100%, ${sharedSettings.clipLeftBottom}% 100%)`;
  const frameDataUrl = buildClipFrameDataUrl(sharedSettings);
  const slotStep = Math.max(0, sharedSettings.slotSpacing - sharedSettings.overlap);
  const nameGap = 6;
  const labelHeight = 26;
  const nameInset = 4;
  previewCanvas.innerHTML = "";
  previewEmptyState.hidden = users.length > 0;

  if (users.length === 0) {
    previewCanvas.style.width = "100%";
    previewCanvas.style.height = "0";
    return;
  }

  const minTop = users.reduce((currentMin, user) => Math.min(currentMin, user.topOffset), 0);

  const width = users.reduce((currentMax, user) => {
    const left = sharedSettings.stackLeftPadding + ((user.slotNumber - 1) * slotStep);
    return Math.max(currentMax, left + sharedSettings.sharedDisplayWidth + 40);
  }, 280);
  const height = users.reduce((currentMax, user) => {
    const normalizedTop = user.topOffset - minTop;
    return Math.max(currentMax, normalizedTop + sharedSettings.sharedDisplayHeight + nameGap + labelHeight + 12);
  }, sharedSettings.minHeight + labelHeight + 12);

  previewCanvas.style.width = `${width}px`;
  previewCanvas.style.height = `${height}px`;

  users.forEach((user) => {
    const left = sharedSettings.stackLeftPadding + ((user.slotNumber - 1) * slotStep);
    const nameWidth = Math.max(
      36,
      Math.min(sharedSettings.sharedDisplayWidth - nameInset, slotStep || sharedSettings.sharedDisplayWidth) - nameInset
    );
    const card = document.createElement("div");
    const avatar = document.createElement("div");
    const frame = document.createElement("div");

    card.className = "preview-card";
    if (user.speaking) {
      card.classList.add("is-speaking");
    }
    if (user.speaking && sharedSettings.enableBobbing) {
      card.classList.add("is-bobbing");
    }

    card.style.left = `${left}px`;
    card.style.top = `${user.topOffset - minTop}px`;
    card.style.width = `${sharedSettings.sharedDisplayWidth}px`;
    card.style.height = `${sharedSettings.sharedDisplayHeight + nameGap + labelHeight}px`;
    card.style.zIndex = String(sharedSettings.zIndexBase + user.slotNumber);
    card.style.setProperty("--preview-bob-distance", `${sharedSettings.bobDistance}px`);
    card.style.setProperty("--preview-bob-duration", `${sharedSettings.bobDuration}s`);

    avatar.className = "preview-avatar";
    avatar.style.width = `${sharedSettings.sharedDisplayWidth}px`;
    avatar.style.height = `${sharedSettings.sharedDisplayHeight}px`;
    avatar.style.backgroundImage = `url("${user.dataUrl || SAMPLE_IMAGE_DATA_URL}")`;
    avatar.style.clipPath = clipPath;

    if (!sharedSettings.enableGlow) {
      avatar.style.filter = "none";
    }

    card.append(avatar);

    frame.className = "preview-frame";
    frame.style.width = `${sharedSettings.sharedDisplayWidth}px`;
    frame.style.height = `${sharedSettings.sharedDisplayHeight}px`;
    frame.style.backgroundImage = `url("${frameDataUrl}")`;
    frame.style.setProperty("--preview-frame-glow-near", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.98 * clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1))));
    frame.style.setProperty("--preview-frame-glow-mid", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.72 * clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1))));
    frame.style.setProperty("--preview-frame-glow-far", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.42 * clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1))));
    frame.style.setProperty("--preview-frame-glow-radius-near", `${Math.max(1, Math.round(3 * clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1)))}px`);
    frame.style.setProperty("--preview-frame-glow-radius-mid", `${Math.max(2, Math.round(8 * clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1)))}px`);
    frame.style.setProperty("--preview-frame-glow-radius-far", `${Math.max(4, Math.round(18 * clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1)))}px`);
    card.append(frame);

    const label = document.createElement("div");
    label.className = "preview-label";
    label.textContent = user.label || user.userId || "User";
    label.style.top = `${sharedSettings.sharedDisplayHeight + nameGap}px`;
    label.style.left = `${nameInset}px`;
    label.style.width = `${nameWidth}px`;
    label.style.maxWidth = `${nameWidth}px`;
    card.append(label);

    previewCanvas.append(card);
  });
}

function createUserRow(initialValues = {}) {
  const user = {
    internalId: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: initialValues.label || `User ${nextUserNumber}`,
    userId: initialValues.userId || "",
    topOffset: Number(initialValues.topOffset) || 0,
    enabled: initialValues.enabled ?? true,
    speaking: initialValues.speaking ?? false,
    dataUrl: initialValues.dataUrl || ""
  };

  usersState.push(user);
  const fragment = userRowTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".user-card");
  const labelField = card.querySelector(".user-label");
  const userIdField = card.querySelector(".user-id");
  const topOffsetField = card.querySelector(".top-offset");
  const enabledField = card.querySelector(".is-enabled");
  const speakingField = card.querySelector(".is-speaking");
  const dataUrlField = card.querySelector(".data-url");
  const fileField = card.querySelector(".image-file");
  const moveLeftButton = card.querySelector(".move-user-left");
  const moveRightButton = card.querySelector(".move-user-right");
  const removeButton = card.querySelector(".remove-user");

  labelField.value = user.label;
  userIdField.value = user.userId;
  topOffsetField.value = String(user.topOffset);
  enabledField.checked = user.enabled;
  speakingField.checked = user.speaking;
  dataUrlField.value = user.dataUrl;

  nextUserNumber += 1;
  updateUserTitle(card);
  card.dataset.internalId = user.internalId;
  card.classList.toggle("is-disabled", !user.enabled);

  card.addEventListener("input", (event) => {
    const targetUser = usersState.find((entry) => entry.internalId === user.internalId);
    if (!targetUser) {
      return;
    }

    if (event.target === labelField) {
      updateUserTitle(card);
    }
    targetUser.label = labelField.value.trim();
    targetUser.userId = userIdField.value.trim();
    targetUser.topOffset = Number(topOffsetField.value) || 0;
    targetUser.enabled = enabledField.checked;
    targetUser.speaking = speakingField.checked;
    targetUser.dataUrl = dataUrlField.value.trim();
    card.classList.toggle("is-disabled", !targetUser.enabled);
    setStatus("");
    renderUserTabs();
    updateOutput();
  });

  fileField.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await applyUserImageFile(user.internalId, dataUrlField, file);
    } catch (error) {
      setStatus("Image resize failed. Try a different file.", "error", true);
    } finally {
      fileField.value = "";
    }
  });

  card.addEventListener("paste", async (event) => {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();

    try {
      await applyUserImageFile(user.internalId, dataUrlField, file);
      setStatus("Pasted image from clipboard.");
    } catch (error) {
      setStatus("Clipboard image paste failed.", "error", true);
    }
  });

  moveLeftButton.addEventListener("click", () => {
    const index = usersState.findIndex((entry) => entry.internalId === user.internalId);
    if (index <= 0) {
      return;
    }

    [usersState[index - 1], usersState[index]] = [usersState[index], usersState[index - 1]];
    setStatus("");
    renderUserTabs();
    renderActiveUserEditor();
    updateOutput();
  });

  moveRightButton.addEventListener("click", () => {
    const index = usersState.findIndex((entry) => entry.internalId === user.internalId);
    if (index === -1 || index >= usersState.length - 1) {
      return;
    }

    [usersState[index], usersState[index + 1]] = [usersState[index + 1], usersState[index]];
    setStatus("");
    renderUserTabs();
    renderActiveUserEditor();
    updateOutput();
  });

  removeButton.addEventListener("click", () => {
    usersState = usersState.filter((entry) => entry.internalId !== user.internalId);
    if (activeUserId === user.internalId) {
      activeUserId = usersState[0]?.internalId || null;
    }
    setStatus("");
    renderUserTabs();
    renderActiveUserEditor();
    updateOutput();
  });

  activeUserId = user.internalId;

  user.editorCard = card;
  renderUserTabs();
  renderActiveUserEditor();
}

function renderUserTabs() {
  userTabBar.innerHTML = "";
  userEmptyState.hidden = usersState.length > 0;

  usersState.forEach((user, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "user-tab-button";
    button.setAttribute("role", "tab");
    button.id = `user-tab-${user.internalId}`;
    button.setAttribute("aria-controls", `user-panel-${user.internalId}`);
    const isActive = user.internalId === activeUserId;
    if (user.internalId === activeUserId) {
      button.classList.add("is-active");
    }
    button.classList.toggle("is-disabled-user", !user.enabled);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
    button.textContent = user.label || user.userId || `User ${usersState.indexOf(user) + 1}`;
    button.addEventListener("click", () => {
      activeUserId = user.internalId;
      renderUserTabs();
      renderActiveUserEditor();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + usersState.length) % usersState.length;
      activeUserId = usersState[nextIndex].internalId;
      renderUserTabs();
      renderActiveUserEditor();
      userTabBar.querySelector(".user-tab-button.is-active")?.focus();
    });
    userTabBar.append(button);
  });
}

function renderActiveUserEditor() {
  userList.innerHTML = "";
  const activeUser = usersState.find((user) => user.internalId === activeUserId);
  if (!activeUser?.editorCard) {
    return;
  }

  activeUser.editorCard.id = `user-panel-${activeUser.internalId}`;
  activeUser.editorCard.setAttribute("role", "tabpanel");
  activeUser.editorCard.setAttribute("aria-labelledby", `user-tab-${activeUser.internalId}`);

  const activeIndex = usersState.findIndex((user) => user.internalId === activeUser.internalId);
  const moveLeftButton = activeUser.editorCard.querySelector(".move-user-left");
  const moveRightButton = activeUser.editorCard.querySelector(".move-user-right");

  if (moveLeftButton) {
    moveLeftButton.disabled = activeIndex <= 0;
  }

  if (moveRightButton) {
    moveRightButton.disabled = activeIndex === -1 || activeIndex >= usersState.length - 1;
  }

  userList.append(activeUser.editorCard);
}

function resizeImageToDataUrl(file, maxWidth, maxHeight, mimeType = "image/png", quality = 0.92) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const widthRatio = maxWidth / image.width;
        const heightRatio = maxHeight / image.height;
        const scale = Math.min(widthRatio, heightRatio, 1);
        const targetWidth = Math.max(1, Math.round(image.width * scale));
        const targetHeight = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas 2D context is unavailable."));
          return;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        context.drawImage(image, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL(mimeType, quality));
      };

      image.onerror = () => reject(new Error("Failed to load image."));
      image.src = typeof reader.result === "string" ? reader.result : "";
    };

    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

async function applyUserImageFile(userInternalId, dataUrlField, file) {
  if (!file || !file.type.startsWith("image/")) {
    return false;
  }

  const sharedSettings = readSharedSettings();
  const resizedDataUrl = await resizeImageToDataUrl(
    file,
    sharedSettings.resizeMaxWidth,
    sharedSettings.resizeMaxHeight,
    "image/png"
  );

  dataUrlField.value = resizedDataUrl;
  const targetUser = usersState.find((entry) => entry.internalId === userInternalId);
  if (targetUser) {
    targetUser.dataUrl = resizedDataUrl;
  }

  setStatus("");
  updateOutput();
  return true;
}

sharedForm.addEventListener("input", (event) => {
  if ([clipLeftTopField, clipRightTopField, clipRightBottomField, clipLeftBottomField].includes(event.target)) {
    detectClipPreset();
  }
  if (event.target === sharedDisplayWidthField || event.target === sharedDisplayHeightField) {
    detectSharedSizePreset();
  }

  setStatus("");
  updateOutput();
});

clipPresetField.addEventListener("change", () => {
  if (clipPresetField.value !== "custom") {
    applyClipPreset(clipPresetField.value);
  }

  setStatus("");
  updateOutput();
});

sharedSizePresetField.addEventListener("change", () => {
  if (sharedSizePresetField.value !== "custom") {
    applySharedSizePreset(sharedSizePresetField.value);
  }

  setStatus("");
  updateOutput();
});

addUserButton.addEventListener("click", () => {
  createUserRow();
  setActiveTab("users");
  setStatus("");
  updateOutput();
});

tabSharedButton.addEventListener("click", () => {
  setActiveTab("shared");
});

tabUsersButton.addEventListener("click", () => {
  setActiveTab("users");
});

tabSharedButton.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    setActiveTab("users");
    tabUsersButton.focus();
  }
});

tabUsersButton.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setActiveTab("shared");
    tabSharedButton.focus();
  }
});

saveJsonButton.addEventListener("click", () => {
  const state = exportState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "obs-voice-css-config.json";
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("Saved JSON config.");
});

loadJsonField.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    importState(JSON.parse(text));
    setStatus("Loaded JSON config.");
  } catch (error) {
    setStatus("JSON load failed. Check the file format.", "error", true);
  } finally {
    loadJsonField.value = "";
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    setStatus("Copied CSS to clipboard.");
  } catch (error) {
    setStatus("Clipboard copy failed. Copy the CSS manually.", "error", true);
  }
});

resumePreviousButton.addEventListener("click", () => {
  const draft = readLocalDraft();
  if (draft?.state) {
    importState(draft.state);
    setStatus("Loaded previous local draft.");
  }
  closeResumeModal();
});

resumeNewButton.addEventListener("click", () => {
  clearLocalDraft();
  closeResumeModal();
  initializeDefaultState();
  setStatus("Started a new draft.");
});

const initialDraft = readLocalDraft();

if (initialDraft?.state) {
  showResumeModal(initialDraft);
} else {
  clearLocalDraft();
  initializeDefaultState();
}
