window.OBSOverlayCssGenerator = (() => {
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

  function lerpNumber(start, end, amount) {
    return start + ((end - start) * amount);
  }

  function buildSpeakingFilterValue(strengthValue) {
    const strength = clampNumber(strengthValue, 0, 2, 1);
    const brightness = lerpNumber(0.86, 1.34, strength);
    const saturate = lerpNumber(0.92, 0.72, strength);
    const contrast = lerpNumber(1, 1.08, strength);
    return `brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)}) contrast(${contrast.toFixed(3)})`;
  }

  function buildSpeakingBlock(sharedSettings) {
    const lines = [];

    if (sharedSettings.enableGlow) {
      lines.push(`  filter: ${buildSpeakingFilterValue(sharedSettings.speakingFilterStrength)};`);
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

  function buildUserCss(sharedSettings, user, sampleImageDataUrl) {
    const userId = sanitizeSelectorValue(user.userId, "USER_ID_HERE");
    const dataUrl = user.dataUrl || sampleImageDataUrl;
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

  function buildCssOutput(sharedSettings, users, sampleImageDataUrl) {
    const enabledUsers = users
      .filter((user) => user.enabled)
      .map((user, index) => ({ ...user, slotNumber: index + 1 }));
    const speakingClass = sharedSettings.speakingClass.replace(/[^a-zA-Z0-9_-]/g, "") || "wrapper_speaking";
    const containerSelector = sanitizeSelector(sharedSettings.containerSelector, ".voice_states");
    const maxUserHeight = enabledUsers.reduce(
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
    const userCssBlocks = enabledUsers
      .map((user) => buildUserCss({ ...sharedSettings, speakingClass }, user, sampleImageDataUrl))
      .join("\n\n");

    return `${containerSelector} {
  position: relative;
  min-height: ${Math.max(sharedSettings.minHeight, maxUserHeight)}px;
  overflow: visible !important;
}

${userCssBlocks}${bobKeyframes}
`;
  }

  return {
    buildClipFrameDataUrl,
    buildCssOutput,
    buildSpeakingFilterValue,
    clampNumber,
    hexToRgba,
    normalizeHexColor
  };
})();
