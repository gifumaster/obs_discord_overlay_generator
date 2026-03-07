window.OBSOverlaySharedSettings = (() => {
  function clampPercent(value, fallback) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return fallback;
    }

    return Math.min(100, Math.max(0, number));
  }

  function applyClipPreset(presetName, deps) {
    const preset = deps.clipPresets[presetName];
    if (!preset) {
      return;
    }

    deps.clipLeftTopField.value = String(preset.clipLeftTop);
    deps.clipRightTopField.value = String(preset.clipRightTop);
    deps.clipRightBottomField.value = String(preset.clipRightBottom);
    deps.clipLeftBottomField.value = String(preset.clipLeftBottom);
  }

  function detectClipPreset(deps) {
    const current = {
      clipLeftTop: clampPercent(deps.clipLeftTopField.value, 24),
      clipRightTop: clampPercent(deps.clipRightTopField.value, 100),
      clipRightBottom: clampPercent(deps.clipRightBottomField.value, 76),
      clipLeftBottom: clampPercent(deps.clipLeftBottomField.value, 0)
    };

    const matchedPreset = Object.entries(deps.clipPresets).find(([, preset]) =>
      preset.clipLeftTop === current.clipLeftTop &&
      preset.clipRightTop === current.clipRightTop &&
      preset.clipRightBottom === current.clipRightBottom &&
      preset.clipLeftBottom === current.clipLeftBottom
    );

    deps.clipPresetField.value = matchedPreset ? matchedPreset[0] : "custom";
  }

  function readSharedSettings(deps) {
    return {
      containerSelector: deps.containerSelectorField.value.trim() || ".voice_states",
      speakingClass: deps.speakingClassField.value.trim() || "wrapper_speaking",
      slotSpacing: Math.max(0, Number(deps.slotSpacingField.value) || 78),
      overlap: Math.max(0, Number(deps.overlapField.value) || 30),
      stackLeftPadding: Math.max(0, Number(deps.stackLeftPaddingField.value) || 18),
      zIndexBase: Number(deps.zIndexBaseField.value) || 10,
      minHeight: deps.clampNumber(deps.minHeightField.value, 1, 480, 96),
      clipPreset: deps.clipPresetField.value,
      clipLeftTop: clampPercent(deps.clipLeftTopField.value, 24),
      clipRightTop: clampPercent(deps.clipRightTopField.value, 100),
      clipRightBottom: clampPercent(deps.clipRightBottomField.value, 76),
      clipLeftBottom: clampPercent(deps.clipLeftBottomField.value, 0),
      bobDistance: Math.max(0, Number(deps.bobDistanceField.value) || 4),
      bobDuration: Math.max(0.1, Number(deps.bobDurationField.value) || 0.6),
      resizeMaxWidth: Math.max(1, Number(deps.resizeMaxWidthField.value) || 216),
      resizeMaxHeight: Math.max(1, Number(deps.resizeMaxHeightField.value) || 384),
      sharedSizePreset: deps.sharedSizePresetField.value,
      sharedDisplayWidth: Math.max(1, Number(deps.sharedDisplayWidthField.value) || 90),
      sharedDisplayHeight: Math.max(1, Number(deps.sharedDisplayHeightField.value) || 160),
      frameColor: deps.normalizeHexColor(deps.frameColorField.value, "#ffffff"),
      frameGlowColor: deps.normalizeHexColor(deps.frameGlowColorField.value, "#ffffff"),
      frameStrokeWidth: Math.max(0, Number(deps.frameStrokeWidthField.value ?? 2)),
      frameGlowStrength: deps.clampNumber(deps.frameGlowStrengthField.value, 0.2, 3, 1),
      speakingFilterStrength: deps.clampNumber(deps.speakingFilterStrengthField.value, 0, 2, 0.5),
      advancedOpen: deps.sharedAdvancedPanel.open,
      enableGlow: deps.enableGlowField.checked,
      enableBobbing: deps.enableBobbingField.checked
    };
  }

  function setSharedSettings(sharedSettings, deps) {
    deps.containerSelectorField.value = sharedSettings.containerSelector || ".voice_states";
    deps.speakingClassField.value = sharedSettings.speakingClass || "wrapper_speaking";
    deps.slotSpacingField.value = String(sharedSettings.slotSpacing ?? 78);
    deps.overlapField.value = String(sharedSettings.overlap ?? 30);
    deps.stackLeftPaddingField.value = String(sharedSettings.stackLeftPadding ?? 18);
    deps.zIndexBaseField.value = String(sharedSettings.zIndexBase ?? 10);
    deps.minHeightField.value = String(deps.clampNumber(sharedSettings.minHeight, 1, 480, 96));
    deps.resizeMaxWidthField.value = String(sharedSettings.resizeMaxWidth ?? 216);
    deps.resizeMaxHeightField.value = String(sharedSettings.resizeMaxHeight ?? 384);
    deps.sharedSizePresetField.value = sharedSettings.sharedSizePreset || "medium";
    deps.sharedDisplayWidthField.value = String(sharedSettings.sharedDisplayWidth ?? 90);
    deps.sharedDisplayHeightField.value = String(sharedSettings.sharedDisplayHeight ?? 160);
    deps.frameColorField.value = deps.normalizeHexColor(sharedSettings.frameColor, "#ffffff");
    deps.frameGlowColorField.value = deps.normalizeHexColor(sharedSettings.frameGlowColor, "#ffffff");
    deps.frameStrokeWidthField.value = String(sharedSettings.frameStrokeWidth ?? 2);
    deps.frameGlowStrengthField.value = String(sharedSettings.frameGlowStrength ?? 1);
    deps.speakingFilterStrengthField.value = String(sharedSettings.speakingFilterStrength ?? 0.5);
    deps.sharedAdvancedPanel.open = sharedSettings.advancedOpen ?? false;
    deps.bobDistanceField.value = String(sharedSettings.bobDistance ?? 4);
    deps.bobDurationField.value = String(sharedSettings.bobDuration ?? 0.6);
    deps.enableGlowField.checked = sharedSettings.enableGlow ?? true;
    deps.enableBobbingField.checked = sharedSettings.enableBobbing ?? true;

    if (sharedSettings.clipPreset && sharedSettings.clipPreset !== "custom" && deps.clipPresets[sharedSettings.clipPreset]) {
      deps.clipPresetField.value = sharedSettings.clipPreset;
      applyClipPreset(sharedSettings.clipPreset, deps);
    } else {
      deps.clipLeftTopField.value = String(sharedSettings.clipLeftTop ?? 24);
      deps.clipRightTopField.value = String(sharedSettings.clipRightTop ?? 100);
      deps.clipRightBottomField.value = String(sharedSettings.clipRightBottom ?? 76);
      deps.clipLeftBottomField.value = String(sharedSettings.clipLeftBottom ?? 0);
      detectClipPreset(deps);
    }
  }

  function applySharedSizePreset(presetName, deps, includeSlotSpacing = false) {
    const preset = deps.sizePresets[presetName];
    if (!preset) {
      return;
    }

    deps.sharedDisplayWidthField.value = String(preset.displayWidth);
    deps.sharedDisplayHeightField.value = String(preset.displayHeight);

    if (includeSlotSpacing) {
      deps.slotSpacingField.value = String(preset.slotSpacing);
    }
  }

  function detectSharedSizePreset(deps) {
    const currentWidth = Math.max(1, Number(deps.sharedDisplayWidthField.value) || 90);
    const currentHeight = Math.max(1, Number(deps.sharedDisplayHeightField.value) || 160);
    const matchedPreset = Object.entries(deps.sizePresets).find(([, preset]) =>
      preset.displayWidth === currentWidth &&
      preset.displayHeight === currentHeight
    );

    deps.sharedSizePresetField.value = matchedPreset ? matchedPreset[0] : "custom";
  }

  function initializeDefaultState(deps) {
    deps.resetUsersState();
    deps.setActiveUserId(null);
    deps.resetNextUserNumber();
    applyClipPreset("medium", deps);
    applySharedSizePreset("medium", deps, true);
    deps.createUserRow({ label: "ユーザー 1", userId: "123456789012345678" });
    deps.setActiveTab("shared");
    deps.setStatus("");
    deps.updateOutput({ immediate: true });
  }

  return {
    applyClipPreset,
    applySharedSizePreset,
    detectClipPreset,
    detectSharedSizePreset,
    initializeDefaultState,
    readSharedSettings,
    setSharedSettings
  };
})();
