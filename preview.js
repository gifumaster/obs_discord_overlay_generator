window.OBSOverlayPreview = (() => {
  const previewCardElements = new Map();

  function getOrCreatePreviewCardElements(user, deps) {
    const existing = previewCardElements.get(user.internalId);
    if (existing) {
      return existing;
    }

    const card = document.createElement("div");
    const avatar = document.createElement("div");
    const frame = document.createElement("div");
    const label = document.createElement("div");

    card.className = "preview-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    avatar.className = "preview-avatar";
    frame.className = "preview-frame";
    label.className = "preview-label";
    card.addEventListener("click", () => {
      deps.selectUser(user.internalId);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      deps.selectUser(user.internalId);
    });

    card.append(avatar, frame, label);

    const created = { card, avatar, frame, label };
    previewCardElements.set(user.internalId, created);
    return created;
  }

  function renderPreview({
    buildClipFrameDataUrl,
    buildSpeakingFilterValue,
    clampNumber,
    hexToRgba,
    selectUser,
    previewCanvas,
    previewEmptyState,
    sampleImageDataUrl,
    sharedSettings,
    usersState
  }) {
    const users = usersState
      .filter((user) => user.enabled)
      .map((user, index) => ({
        internalId: user.internalId,
        label: user.label,
        userId: user.userId,
        topOffset: user.topOffset,
        enabled: user.enabled,
        speaking: user.speaking,
        dataUrl: user.dataUrl,
        slotNumber: index + 1
      }));
    const clipPath =
      `polygon(${sharedSettings.clipLeftTop}% 0, ${sharedSettings.clipRightTop}% 0, ` +
      `${sharedSettings.clipRightBottom}% 100%, ${sharedSettings.clipLeftBottom}% 100%)`;
    const frameDataUrl = buildClipFrameDataUrl(sharedSettings);
    const slotStep = Math.max(0, sharedSettings.slotSpacing - sharedSettings.overlap);
    const nameGap = 6;
    const labelHeight = 26;
    const nameInset = 4;
    previewEmptyState.hidden = users.length > 0;

    const liveIds = new Set(users.map((user) => user.internalId));
    previewCardElements.forEach((elements, internalId) => {
      if (!liveIds.has(internalId)) {
        elements.card.remove();
        previewCardElements.delete(internalId);
      }
    });

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
    const fragment = document.createDocumentFragment();

    users.forEach((user) => {
      const left = sharedSettings.stackLeftPadding + ((user.slotNumber - 1) * slotStep);
      const nameWidth = Math.max(
        36,
        Math.min(sharedSettings.sharedDisplayWidth - nameInset, slotStep || sharedSettings.sharedDisplayWidth) - nameInset
      );
      const { card, avatar, frame, label } = getOrCreatePreviewCardElements(user, { selectUser });
      const glowStrength = clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1);

      card.classList.toggle("is-speaking", user.speaking);
      card.classList.toggle("is-bobbing", user.speaking && sharedSettings.enableBobbing);
      card.setAttribute("aria-label", `${user.label || user.userId || "ユーザー"} の設定を開く`);

      card.style.left = `${left}px`;
      card.style.top = `${user.topOffset - minTop}px`;
      card.style.width = `${sharedSettings.sharedDisplayWidth}px`;
      card.style.height = `${sharedSettings.sharedDisplayHeight + nameGap + labelHeight}px`;
      card.style.zIndex = String(sharedSettings.zIndexBase + user.slotNumber);
      card.style.setProperty("--preview-bob-distance", `${sharedSettings.bobDistance}px`);
      card.style.setProperty("--preview-bob-duration", `${sharedSettings.bobDuration}s`);

      avatar.style.width = `${sharedSettings.sharedDisplayWidth}px`;
      avatar.style.height = `${sharedSettings.sharedDisplayHeight}px`;
      avatar.style.backgroundImage = `url("${user.dataUrl || sampleImageDataUrl}")`;
      avatar.style.clipPath = clipPath;
      avatar.style.removeProperty("filter");
      avatar.style.setProperty(
        "--preview-speaking-filter",
        sharedSettings.enableGlow
          ? buildSpeakingFilterValue(sharedSettings.speakingFilterStrength)
          : "brightness(0.86) saturate(0.92) contrast(1)"
      );

      frame.style.width = `${sharedSettings.sharedDisplayWidth}px`;
      frame.style.height = `${sharedSettings.sharedDisplayHeight}px`;
      frame.style.backgroundImage = `url("${frameDataUrl}")`;
      frame.style.setProperty("--preview-frame-glow-near", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.98 * glowStrength)));
      frame.style.setProperty("--preview-frame-glow-mid", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.72 * glowStrength)));
      frame.style.setProperty("--preview-frame-glow-far", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.42 * glowStrength)));
      frame.style.setProperty("--preview-frame-glow-radius-near", `${Math.max(1, Math.round(3 * glowStrength))}px`);
      frame.style.setProperty("--preview-frame-glow-radius-mid", `${Math.max(2, Math.round(8 * glowStrength))}px`);
      frame.style.setProperty("--preview-frame-glow-radius-far", `${Math.max(4, Math.round(18 * glowStrength))}px`);

      label.textContent = user.label || user.userId || "ユーザー";
      label.style.top = `${sharedSettings.sharedDisplayHeight + nameGap}px`;
      label.style.left = `${nameInset}px`;
      label.style.width = `${nameWidth}px`;
      label.style.maxWidth = `${nameWidth}px`;

      fragment.append(card);
    });

    previewCanvas.replaceChildren(fragment);
  }

  return {
    renderPreview
  };
})();
