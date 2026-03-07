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
const speakingFilterStrengthField = document.querySelector("#speaking-filter-strength");
const containerSelectorField = document.querySelector("#container-selector");
const speakingClassField = document.querySelector("#speaking-class");
const slotSpacingField = document.querySelector("#slot-spacing");
const overlapField = document.querySelector("#overlap");
const stackLeftPaddingField = document.querySelector("#stack-left-padding");
const zIndexBaseField = document.querySelector("#z-index-base");
const minHeightField = document.querySelector("#min-height");
const resizeMaxWidthField = document.querySelector("#resize-max-width");
const resizeMaxHeightField = document.querySelector("#resize-max-height");
const bobDistanceField = document.querySelector("#bob-distance");
const bobDurationField = document.querySelector("#bob-duration");
const enableGlowField = document.querySelector("#enable-glow");
const enableBobbingField = document.querySelector("#enable-bobbing");
const {
  buildClipFrameDataUrl,
  buildCssOutput,
  buildSpeakingFilterValue,
  clampNumber,
  hexToRgba,
  normalizeHexColor
} = window.OBSOverlayCssGenerator;
const {
  clearLocalDraft,
  exportState: exportAppState,
  formatSavedAt,
  importState: importAppState,
  readLocalDraft,
  scheduleLocalDraftSave
} = window.OBSOverlayStateIO;
const { renderPreview: renderPreviewPanel } = window.OBSOverlayPreview;
const { openImageCropper } = window.OBSOverlayImageCropper;
const {
  createUserRow: createUserRowPanel,
  renderActiveUserEditor: renderActiveUserEditorPanel,
  renderUserTabs: renderUserTabsPanel
} = window.OBSOverlayUserEditor;
const {
  applyClipPreset: applyClipPresetPanel,
  applySharedSizePreset: applySharedSizePresetPanel,
  detectClipPreset: detectClipPresetPanel,
  detectSharedSizePreset: detectSharedSizePresetPanel,
  initializeDefaultState: initializeDefaultStatePanel,
  readSharedSettings: readSharedSettingsPanel,
  setSharedSettings: setSharedSettingsPanel
} = window.OBSOverlaySharedSettings;

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
let nextUserNumber = 1;
let usersState = [];
let activeUserId = null;
let statusTimeoutId = null;
let outputFrameRequestId = 0;

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

function closeResumeModal() {
  resumeModal.hidden = true;
}

function showResumeModal(draft) {
  const savedAtLabel = formatSavedAt(draft.savedAt);
  resumeDescription.textContent = savedAtLabel
    ? `${savedAtLabel} に保存されたローカル下書きがあります。`
    : "前回保存されたローカル下書きがあります。";
  resumeModal.hidden = false;
}

function initializeDefaultState() {
  return initializeDefaultStatePanel({
    applyClipPreset,
    applySharedSizePreset,
    createUserRow,
    resetNextUserNumber: () => {
      nextUserNumber = 1;
    },
    resetUsersState,
    setActiveTab,
    setActiveUserId: (value) => {
      activeUserId = value;
    },
    setStatus,
    updateOutput
  });
}

function applyClipPreset(presetName) {
  return applyClipPresetPanel(presetName, {
    clipLeftTopField,
    clipLeftBottomField,
    clipPresets: CLIP_PRESETS,
    clipRightBottomField,
    clipRightTopField
  });
}

function detectClipPreset() {
  return detectClipPresetPanel({
    clipLeftTopField,
    clipLeftBottomField,
    clipPresetField,
    clipPresets: CLIP_PRESETS,
    clipRightBottomField,
    clipRightTopField
  });
}

function readSharedSettings() {
  return readSharedSettingsPanel({
    bobDistanceField,
    bobDurationField,
    clampNumber,
    clipLeftTopField,
    clipLeftBottomField,
    clipPresetField,
    clipRightBottomField,
    clipRightTopField,
    containerSelectorField,
    enableBobbingField,
    enableGlowField,
    frameColorField,
    frameGlowColorField,
    frameGlowStrengthField,
    frameStrokeWidthField,
    minHeightField,
    normalizeHexColor,
    overlapField,
    resizeMaxHeightField,
    resizeMaxWidthField,
    sharedAdvancedPanel,
    sharedDisplayHeightField,
    sharedDisplayWidthField,
    sharedSizePresetField,
    slotSpacingField,
    speakingClassField,
    speakingFilterStrengthField,
    stackLeftPaddingField,
    zIndexBaseField
  });
}

function setSharedSettings(sharedSettings) {
  return setSharedSettingsPanel(sharedSettings, {
    applyClipPreset,
    bobDistanceField,
    bobDurationField,
    clampNumber,
    clipLeftTopField,
    clipLeftBottomField,
    clipPresetField,
    clipPresets: CLIP_PRESETS,
    clipRightBottomField,
    clipRightTopField,
    containerSelectorField,
    detectClipPreset,
    enableBobbingField,
    enableGlowField,
    frameColorField,
    frameGlowColorField,
    frameGlowStrengthField,
    frameStrokeWidthField,
    minHeightField,
    normalizeHexColor,
    overlapField,
    resizeMaxHeightField,
    resizeMaxWidthField,
    sharedAdvancedPanel,
    sharedDisplayHeightField,
    sharedDisplayWidthField,
    sharedSizePresetField,
    slotSpacingField,
    speakingClassField,
    speakingFilterStrengthField,
    stackLeftPaddingField,
    zIndexBaseField
  });
}

function readUserRows() {
  return usersState.map(({ internalId, editorCard, ...user }) => ({ ...user }));
}

function resetUsersState() {
  usersState = [];
  nextUserNumber = 1;
}

function applySharedSizePreset(presetName) {
  return applySharedSizePresetPanel(presetName, {
    sharedDisplayHeightField,
    sharedDisplayWidthField,
    sizePresets: SIZE_PRESETS,
    slotSpacingField
  });
}

function detectSharedSizePreset() {
  return detectSharedSizePresetPanel({
    sharedDisplayHeightField,
    sharedDisplayWidthField,
    sharedSizePresetField,
    sizePresets: SIZE_PRESETS
  });
}

function flushOutputUpdate() {
  outputFrameRequestId = 0;
  output.value = buildCssOutput(readSharedSettings(), readUserRows(), SAMPLE_IMAGE_DATA_URL);
  renderPreview();
  scheduleLocalDraftSave(() => exportState());
}

function updateOutput({ immediate = false } = {}) {
  if (immediate) {
    if (outputFrameRequestId) {
      cancelAnimationFrame(outputFrameRequestId);
      outputFrameRequestId = 0;
    }
    flushOutputUpdate();
    return;
  }

  if (outputFrameRequestId) {
    return;
  }

  outputFrameRequestId = requestAnimationFrame(() => {
    flushOutputUpdate();
  });
}

function exportState() {
  return exportAppState(readSharedSettings, readUserRows);
}

function importState(state) {
  return importAppState(state, {
    createUserRow,
    getUsersState: () => usersState,
    renderActiveUserEditor,
    renderUserTabs,
    resetUsersState,
    setActiveUserId: (value) => {
      activeUserId = value;
    },
    setSharedSettings,
    updateOutput
  });
}

function renderPreview() {
  return renderPreviewPanel({
    buildClipFrameDataUrl,
    buildSpeakingFilterValue,
    clampNumber,
    hexToRgba,
    previewCanvas,
    previewEmptyState,
    sampleImageDataUrl: SAMPLE_IMAGE_DATA_URL,
    sharedSettings: readSharedSettings(),
    usersState
  });
}

function createUserRow(initialValues = {}) {
  return createUserRowPanel(initialValues, {
    applyUserImageFile,
    getActiveUserId: () => activeUserId,
    getNextUserNumber: () => nextUserNumber,
    getUsersState: () => usersState,
    incrementNextUserNumber: () => {
      nextUserNumber += 1;
    },
    openUserImageCropper,
    renderActiveUserEditor,
    renderUserTabs,
    setActiveUserId: (value) => {
      activeUserId = value;
    },
    setStatus,
    setUsersState: (value) => {
      usersState = value;
    },
    updateOutput,
    userRowTemplate,
    userTabBar
  });
}

function renderUserTabs() {
  return renderUserTabsPanel({
    getActiveUserId: () => activeUserId,
    getUsersState: () => usersState,
    renderActiveUserEditor,
    renderUserTabs,
    setActiveUserId: (value) => {
      activeUserId = value;
    },
    setStatus,
    updateOutput,
    userEmptyState,
    userTabBar
  });
}

function renderActiveUserEditor() {
  return renderActiveUserEditorPanel({
    getActiveUserId: () => activeUserId,
    getUsersState: () => usersState,
    userList
  });
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

async function openUserImageCropper(userInternalId, dataUrlField) {
  const targetUser = usersState.find((entry) => entry.internalId === userInternalId);
  const sourceDataUrl = dataUrlField.value.trim() || targetUser?.dataUrl || "";

  if (!sourceDataUrl) {
    setStatus("先に画像を読み込んでください。", "error", true);
    return false;
  }

  const sharedSettings = readSharedSettings();
  const croppedDataUrl = await openImageCropper({
    sourceDataUrl,
    aspectRatio: Math.max(1, sharedSettings.sharedDisplayWidth) / Math.max(1, sharedSettings.sharedDisplayHeight)
  });

  if (!croppedDataUrl) {
    return false;
  }

  dataUrlField.value = croppedDataUrl;
  if (targetUser) {
    targetUser.dataUrl = croppedDataUrl;
  }

  setStatus("画像をトリミングしました。");
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
  setStatus("JSON設定を保存しました。");
});

loadJsonField.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    importState(JSON.parse(text));
    setStatus("JSON設定を読み込みました。");
  } catch (error) {
    setStatus("JSONの読み込みに失敗しました。ファイル内容を確認してください。", "error", true);
  } finally {
    loadJsonField.value = "";
  }
});

copyButton.addEventListener("click", async () => {
  try {
    updateOutput({ immediate: true });
    await navigator.clipboard.writeText(output.value);
    setStatus("CSSをクリップボードにコピーしました。");
  } catch (error) {
    setStatus("クリップボードへのコピーに失敗しました。手動でコピーしてください。", "error", true);
  }
});

resumePreviousButton.addEventListener("click", () => {
  const draft = readLocalDraft();
  if (draft?.state) {
    importState(draft.state);
    setStatus("前回のローカル下書きを読み込みました。");
  }
  closeResumeModal();
});

resumeNewButton.addEventListener("click", () => {
  clearLocalDraft();
  closeResumeModal();
  initializeDefaultState();
  setStatus("新しい状態を開始しました。");
});

const initialDraft = readLocalDraft();

if (initialDraft?.state) {
  showResumeModal(initialDraft);
} else {
  clearLocalDraft();
  initializeDefaultState();
}

