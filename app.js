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
const clipPresetField = document.querySelector("#clip-preset");
const clipLeftTopField = document.querySelector("#clip-left-top");
const clipRightTopField = document.querySelector("#clip-right-top");
const clipRightBottomField = document.querySelector("#clip-right-bottom");
const clipLeftBottomField = document.querySelector("#clip-left-bottom");

const CLIP_PRESETS = {
  light: { clipLeftTop: 18, clipRightTop: 100, clipRightBottom: 82, clipLeftBottom: 0 },
  medium: { clipLeftTop: 24, clipRightTop: 100, clipRightBottom: 76, clipLeftBottom: 0 },
  strong: { clipLeftTop: 30, clipRightTop: 100, clipRightBottom: 70, clipLeftBottom: 0 },
  extreme: { clipLeftTop: 36, clipRightTop: 100, clipRightBottom: 64, clipLeftBottom: 0 }
};

let nextUserNumber = 1;

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
  return Array.from(userList.querySelectorAll(".user-card")).map((card) => ({
    label: card.querySelector(".user-label").value.trim(),
    userId: card.querySelector(".user-id").value.trim(),
    slotNumber: Math.max(1, Number(card.querySelector(".slot-number").value) || 1),
    topOffset: Number(card.querySelector(".top-offset").value) || 0,
    displayWidth: Math.max(1, Number(card.querySelector(".display-width").value) || 54),
    displayHeight: Math.max(1, Number(card.querySelector(".display-height").value) || 96),
    paddingLeft: Math.max(0, Number(card.querySelector(".padding-left").value) || 60),
    dataUrl: card.querySelector(".data-url").value.trim(),
    enabled: card.querySelector(".is-enabled").checked,
    speaking: card.querySelector(".is-speaking").checked
  }));
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
  const clipPath =
    `polygon(${sharedSettings.clipLeftTop}% 0, ${sharedSettings.clipRightTop}% 0, ` +
    `${sharedSettings.clipRightBottom}% 100%, ${sharedSettings.clipLeftBottom}% 100%)`;
  const slotStep = Math.max(0, sharedSettings.slotSpacing - sharedSettings.overlap);
  const slotLeft = (user.slotNumber - 1) * slotStep;
  const itemZIndex = sharedSettings.zIndexBase + user.slotNumber;

  return `li[data-userid="${userId}"] {
  position: absolute;
  left: ${slotLeft}px;
  top: ${user.topOffset}px;
  min-height: ${sharedSettings.minHeight}px;
  padding-left: ${user.paddingLeft}px;
  z-index: ${itemZIndex};
  overflow: visible !important;
}

li[data-userid="${userId}"] .voice_avatar {
  display: none !important;
}

li[data-userid="${userId}"]::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: ${user.displayWidth}px;
  height: ${user.displayHeight}px;
  transform: translateY(-50%);
  background: url("${dataUrl}") center / 100% 100% no-repeat;
  clip-path: ${clipPath};
  pointer-events: none;
  z-index: 10;
  transition: filter 0.15s ease;
}

li[data-userid="${userId}"].${sharedSettings.speakingClass}::before {
${buildSpeakingBlock(sharedSettings)}
}`;
}

function buildCss() {
  const sharedSettings = readSharedSettings();
  const users = readUserRows().filter((user) => user.enabled);
  const speakingClass = sharedSettings.speakingClass.replace(/[^a-zA-Z0-9_-]/g, "") || "wrapper_speaking";
  const containerSelector = sanitizeSelector(sharedSettings.containerSelector, ".voice_states");
  const maxUserHeight = users.reduce(
    (currentMax, user) => Math.max(currentMax, user.displayHeight + Math.abs(user.topOffset)),
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
  userList.innerHTML = "";
  nextUserNumber = 1;

  const users = Array.isArray(state.users) && state.users.length > 0
    ? state.users
    : [{ label: "User 1", slotNumber: 1, userId: "" }];

  users.forEach((user) => createUserRow(user));
  updateOutput();
}

function renderPreview() {
  const sharedSettings = readSharedSettings();
  const users = readUserRows()
    .filter((user) => user.enabled)
    .sort((left, right) => left.slotNumber - right.slotNumber);
  const clipPath =
    `polygon(${sharedSettings.clipLeftTop}% 0, ${sharedSettings.clipRightTop}% 0, ` +
    `${sharedSettings.clipRightBottom}% 100%, ${sharedSettings.clipLeftBottom}% 100%)`;
  const slotStep = Math.max(0, sharedSettings.slotSpacing - sharedSettings.overlap);
  previewCanvas.innerHTML = "";
  const minTop = users.reduce((currentMin, user) => Math.min(currentMin, user.topOffset), 0);

  const width = users.reduce((currentMax, user) => {
    const left = (user.slotNumber - 1) * slotStep;
    return Math.max(currentMax, left + user.displayWidth + 40);
  }, 280);
  const height = users.reduce((currentMax, user) => {
    const normalizedTop = user.topOffset - minTop;
    return Math.max(currentMax, normalizedTop + user.displayHeight + 12);
  }, sharedSettings.minHeight + 12);

  previewCanvas.style.width = `${width}px`;
  previewCanvas.style.height = `${height}px`;

  users.forEach((user) => {
    const left = (user.slotNumber - 1) * slotStep;
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
    card.style.width = `${user.displayWidth}px`;
    card.style.height = `${user.displayHeight}px`;
    card.style.zIndex = String(sharedSettings.zIndexBase + user.slotNumber);
    card.style.setProperty("--preview-bob-distance", `${sharedSettings.bobDistance}px`);

    avatar.className = "preview-avatar";
    avatar.style.width = `${user.displayWidth}px`;
    avatar.style.height = `${user.displayHeight}px`;
    avatar.style.backgroundImage = user.dataUrl ? `url("${user.dataUrl}")` : "none";
    avatar.style.clipPath = clipPath;

    if (!sharedSettings.enableGlow) {
      avatar.style.filter = "none";
    }

    card.append(avatar);

    previewCanvas.append(card);
  });
}

function createUserRow(initialValues = {}) {
  const fragment = userRowTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".user-card");
  const labelField = card.querySelector(".user-label");
  const userIdField = card.querySelector(".user-id");
  const slotField = card.querySelector(".slot-number");
  const topOffsetField = card.querySelector(".top-offset");
  const widthField = card.querySelector(".display-width");
  const heightField = card.querySelector(".display-height");
  const paddingLeftField = card.querySelector(".padding-left");
  const enabledField = card.querySelector(".is-enabled");
  const speakingField = card.querySelector(".is-speaking");
  const dataUrlField = card.querySelector(".data-url");
  const fileField = card.querySelector(".image-file");
  const removeButton = card.querySelector(".remove-user");

  labelField.value = initialValues.label || `User ${nextUserNumber}`;
  userIdField.value = initialValues.userId || "";
  slotField.value = String(initialValues.slotNumber || nextUserNumber);
  topOffsetField.value = String(initialValues.topOffset || 0);
  widthField.value = String(initialValues.displayWidth || 54);
  heightField.value = String(initialValues.displayHeight || 96);
  paddingLeftField.value = String(initialValues.paddingLeft || 60);
  enabledField.checked = initialValues.enabled ?? true;
  speakingField.checked = initialValues.speaking ?? false;
  dataUrlField.value = initialValues.dataUrl || "";

  nextUserNumber += 1;
  updateUserTitle(card);

  card.addEventListener("input", (event) => {
    if (event.target === labelField) {
      updateUserTitle(card);
    }
    copyStatus.textContent = "";
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
      copyStatus.textContent = "";
      updateOutput();
    } catch (error) {
      copyStatus.textContent = "Image resize failed. Try a different file.";
    }
  });

  removeButton.addEventListener("click", () => {
    card.remove();
    copyStatus.textContent = "";
    updateOutput();
  });

  userList.append(card);
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

addUserButton.addEventListener("click", () => {
  createUserRow();
  copyStatus.textContent = "";
  updateOutput();
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
createUserRow({ label: "User 1", slotNumber: 1, userId: "123456789012345678" });
updateOutput();
