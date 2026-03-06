const sharedForm = document.querySelector("#shared-form");
const userList = document.querySelector("#user-list");
const userRowTemplate = document.querySelector("#user-row-template");
const addUserButton = document.querySelector("#add-user");
const saveJsonButton = document.querySelector("#save-json");
const loadJsonField = document.querySelector("#load-json");
const copyButton = document.querySelector("#copy-css");
const copyStatus = document.querySelector("#copy-status");
const output = document.querySelector("#css-output");
const previewCanvas = document.querySelector("#preview-canvas");
const userTabBar = document.querySelector("#user-tab-bar");
const tabSharedButton = document.querySelector("#tab-shared");
const tabUsersButton = document.querySelector("#tab-users");
const sharedPanel = document.querySelector("#panel-shared");
const usersPanel = document.querySelector("#panel-users");
const clipPresetField = document.querySelector("#clip-preset");
const clipLeftTopField = document.querySelector("#clip-left-top");
const clipRightTopField = document.querySelector("#clip-right-top");
const clipRightBottomField = document.querySelector("#clip-right-bottom");
const clipLeftBottomField = document.querySelector("#clip-left-bottom");
const sharedSizePresetField = document.querySelector("#shared-size-preset");
const sharedDisplayWidthField = document.querySelector("#shared-display-width");
const sharedDisplayHeightField = document.querySelector("#shared-display-height");

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

let nextUserNumber = 1;
let usersState = [];
let activeUserId = null;

function setActiveTab(tabName) {
  const isShared = tabName === "shared";
  tabSharedButton.classList.toggle("is-active", isShared);
  tabUsersButton.classList.toggle("is-active", !isShared);
  tabSharedButton.setAttribute("aria-selected", String(isShared));
  tabUsersButton.setAttribute("aria-selected", String(!isShared));
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
    enableGlow: document.querySelector("#enable-glow").checked,
    enableBobbing: document.querySelector("#enable-bobbing").checked
  };
}

function setSharedSettings(sharedSettings) {
  document.querySelector("#container-selector").value = sharedSettings.containerSelector || ".voice_states";
  document.querySelector("#speaking-class").value = sharedSettings.speakingClass || "wrapper_speaking";
  document.querySelector("#slot-spacing").value = String(sharedSettings.slotSpacing ?? 78);
  document.querySelector("#overlap").value = String(sharedSettings.overlap ?? 30);
  document.querySelector("#z-index-base").value = String(sharedSettings.zIndexBase ?? 10);
  document.querySelector("#min-height").value = String(sharedSettings.minHeight ?? 96);
  document.querySelector("#resize-max-width").value = String(sharedSettings.resizeMaxWidth ?? 216);
  document.querySelector("#resize-max-height").value = String(sharedSettings.resizeMaxHeight ?? 384);
  sharedSizePresetField.value = sharedSettings.sharedSizePreset || "medium";
  sharedDisplayWidthField.value = String(sharedSettings.sharedDisplayWidth ?? 90);
  sharedDisplayHeightField.value = String(sharedSettings.sharedDisplayHeight ?? 160);
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

function buildUserCss(sharedSettings, user) {
  const userId = sanitizeSelectorValue(user.userId, "USER_ID_HERE");
  const dataUrl = user.dataUrl || "data:image/png;base64,PASTE_IMAGE_HERE";
  const nameGap = 6;
  const nameHeight = 26;
  const nameInset = 4;
  const displayWidth = sharedSettings.sharedDisplayWidth;
  const displayHeight = sharedSettings.sharedDisplayHeight;
  const clipPath =
    `polygon(${sharedSettings.clipLeftTop}% 0, ${sharedSettings.clipRightTop}% 0, ` +
    `${sharedSettings.clipRightBottom}% 100%, ${sharedSettings.clipLeftBottom}% 100%)`;
  const slotStep = Math.max(0, sharedSettings.slotSpacing - sharedSettings.overlap);
  const slotLeft = (user.slotNumber - 1) * slotStep;
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

li[data-userid="${userId}"].${sharedSettings.speakingClass}::before {
${buildSpeakingBlock(sharedSettings)}
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
    transform: translateY(-50%);
  }
  50% {
    transform: translateY(calc(-50% - ${sharedSettings.bobDistance}px));
  }
  100% {
    transform: translateY(-50%);
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
  const slotStep = Math.max(0, sharedSettings.slotSpacing - sharedSettings.overlap);
  const nameGap = 6;
  const labelHeight = 26;
  const nameInset = 4;
  previewCanvas.innerHTML = "";
  const minTop = users.reduce((currentMin, user) => Math.min(currentMin, user.topOffset), 0);

  const width = users.reduce((currentMax, user) => {
    const left = (user.slotNumber - 1) * slotStep;
    return Math.max(currentMax, left + sharedSettings.sharedDisplayWidth + 40);
  }, 280);
  const height = users.reduce((currentMax, user) => {
    const normalizedTop = user.topOffset - minTop;
    return Math.max(currentMax, normalizedTop + sharedSettings.sharedDisplayHeight + nameGap + labelHeight + 12);
  }, sharedSettings.minHeight + labelHeight + 12);

  previewCanvas.style.width = `${width}px`;
  previewCanvas.style.height = `${height}px`;

  users.forEach((user) => {
    const left = (user.slotNumber - 1) * slotStep;
    const nameWidth = Math.max(
      36,
      Math.min(sharedSettings.sharedDisplayWidth - nameInset, slotStep || sharedSettings.sharedDisplayWidth) - nameInset
    );
    const card = document.createElement("div");
    const avatar = document.createElement("div");

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
    avatar.style.backgroundImage = user.dataUrl ? `url("${user.dataUrl}")` : "none";
    avatar.style.clipPath = clipPath;

    if (!sharedSettings.enableGlow) {
      avatar.style.filter = "none";
    }

    card.append(avatar);

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
    copyStatus.textContent = "";
    renderUserTabs();
    updateOutput();
  });

  fileField.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const sharedSettings = readSharedSettings();

    try {
      dataUrlField.value = await resizeImageToDataUrl(
        file,
        sharedSettings.resizeMaxWidth,
        sharedSettings.resizeMaxHeight,
        "image/png"
      );
      const targetUser = usersState.find((entry) => entry.internalId === user.internalId);
      if (targetUser) {
        targetUser.dataUrl = dataUrlField.value;
      }
      copyStatus.textContent = "";
      updateOutput();
    } catch (error) {
      copyStatus.textContent = "Image resize failed. Try a different file.";
    }
  });

  moveLeftButton.addEventListener("click", () => {
    const index = usersState.findIndex((entry) => entry.internalId === user.internalId);
    if (index <= 0) {
      return;
    }

    [usersState[index - 1], usersState[index]] = [usersState[index], usersState[index - 1]];
    copyStatus.textContent = "";
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
    copyStatus.textContent = "";
    renderUserTabs();
    renderActiveUserEditor();
    updateOutput();
  });

  removeButton.addEventListener("click", () => {
    usersState = usersState.filter((entry) => entry.internalId !== user.internalId);
    if (activeUserId === user.internalId) {
      activeUserId = usersState[0]?.internalId || null;
    }
    copyStatus.textContent = "";
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

  usersState.forEach((user) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "user-tab-button";
    if (user.internalId === activeUserId) {
      button.classList.add("is-active");
    }
    button.textContent = user.label || user.userId || `User ${usersState.indexOf(user) + 1}`;
    button.addEventListener("click", () => {
      activeUserId = user.internalId;
      renderUserTabs();
      renderActiveUserEditor();
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

sharedForm.addEventListener("input", (event) => {
  if ([clipLeftTopField, clipRightTopField, clipRightBottomField, clipLeftBottomField].includes(event.target)) {
    detectClipPreset();
  }
  if (event.target === sharedDisplayWidthField || event.target === sharedDisplayHeightField) {
    detectSharedSizePreset();
  }

  copyStatus.textContent = "";
  updateOutput();
});

clipPresetField.addEventListener("change", () => {
  if (clipPresetField.value !== "custom") {
    applyClipPreset(clipPresetField.value);
  }

  copyStatus.textContent = "";
  updateOutput();
});

sharedSizePresetField.addEventListener("change", () => {
  if (sharedSizePresetField.value !== "custom") {
    applySharedSizePreset(sharedSizePresetField.value);
  }

  copyStatus.textContent = "";
  updateOutput();
});

addUserButton.addEventListener("click", () => {
  createUserRow();
  copyStatus.textContent = "";
  updateOutput();
});

tabSharedButton.addEventListener("click", () => {
  setActiveTab("shared");
});

tabUsersButton.addEventListener("click", () => {
  setActiveTab("users");
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
  copyStatus.textContent = "Saved JSON config.";
});

loadJsonField.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    importState(JSON.parse(text));
    copyStatus.textContent = "Loaded JSON config.";
  } catch (error) {
    copyStatus.textContent = "JSON load failed. Check the file format.";
  } finally {
    loadJsonField.value = "";
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    copyStatus.textContent = "Copied CSS to clipboard.";
  } catch (error) {
    copyStatus.textContent = "Clipboard copy failed. Copy the CSS manually.";
  }
});

applyClipPreset("medium");
applySharedSizePreset("medium");
createUserRow({ label: "User 1", userId: "123456789012345678" });
setActiveTab("shared");
updateOutput();
