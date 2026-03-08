window.OBSOverlayStateIO = (() => {
  const LOCAL_DRAFT_KEY = "obs-discord-overlay-generator:last-state";
  const LOCAL_DRAFT_VERSION = 1;
  const DRAFT_IMAGE_DB_NAME = "obs-discord-overlay-generator";
  const DRAFT_IMAGE_STORE_NAME = "draft-images";
  const DRAFT_IMAGE_RECORD_KEY = LOCAL_DRAFT_KEY;
  let localDraftSaveTimeoutId = null;

  function supportsIndexedDb() {
    return typeof indexedDB !== "undefined";
  }

  function openDraftImageDb() {
    if (!supportsIndexedDb()) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DRAFT_IMAGE_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DRAFT_IMAGE_STORE_NAME)) {
          database.createObjectStore(DRAFT_IMAGE_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
    });
  }

  function withDraftImageStore(mode, callback) {
    return openDraftImageDb().then((database) => {
      if (!database) {
        return null;
      }

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(DRAFT_IMAGE_STORE_NAME, mode);
        const store = transaction.objectStore(DRAFT_IMAGE_STORE_NAME);

        transaction.oncomplete = () => {
          database.close();
          resolve(transaction.__result ?? null);
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error("IndexedDB transaction failed."));
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("IndexedDB transaction aborted."));
        };

        callback(store, transaction);
      });
    });
  }

  function saveDraftImagesToIndexedDb(images) {
    return withDraftImageStore("readwrite", (store, transaction) => {
      store.put(images, DRAFT_IMAGE_RECORD_KEY);
      transaction.__result = true;
    });
  }

  function readDraftImagesFromIndexedDb() {
    return withDraftImageStore("readonly", (store, transaction) => {
      const request = store.get(DRAFT_IMAGE_RECORD_KEY);
      request.onsuccess = () => {
        transaction.__result = Array.isArray(request.result) ? request.result : null;
      };
    });
  }

  function clearDraftImagesFromIndexedDb() {
    return withDraftImageStore("readwrite", (store, transaction) => {
      store.delete(DRAFT_IMAGE_RECORD_KEY);
      transaction.__result = true;
    });
  }

  function buildLocalDraftState(readSharedSettings, readUserRows) {
    const draftImages = [];
    const users = readUserRows().map((user) => {
      const trimmedDataUrl = typeof user.dataUrl === "string" ? user.dataUrl.trim() : "";
      const nextUser = { ...user };

      if (trimmedDataUrl) {
        nextUser.hasDraftImage = true;
        nextUser.draftImageIndex = draftImages.length;
        draftImages.push(trimmedDataUrl);
      } else {
        nextUser.hasDraftImage = false;
      }

      delete nextUser.dataUrl;
      return nextUser;
    });

    return {
      state: {
        version: 1,
        shared: readSharedSettings(),
        users
      },
      draftImages
    };
  }

  function mergeDraftImagesIntoState(state, draftImages) {
    if (!state || typeof state !== "object") {
      return state;
    }

    const safeDraftImages = Array.isArray(draftImages) ? draftImages : [];
    const users = Array.isArray(state.users) ? state.users : [];

    return {
      ...state,
      users: users.map((user) => {
        const nextUser = { ...user };
        const imageIndex = Number.isInteger(nextUser.draftImageIndex)
          ? nextUser.draftImageIndex
          : Number(nextUser.draftImageIndex);

        if (nextUser.hasDraftImage && Number.isInteger(imageIndex) && typeof safeDraftImages[imageIndex] === "string") {
          nextUser.dataUrl = safeDraftImages[imageIndex];
        } else {
          nextUser.dataUrl = "";
        }

        delete nextUser.hasDraftImage;
        delete nextUser.draftImageIndex;
        return nextUser;
      })
    };
  }

  function exportState(readSharedSettings, readUserRows) {
    return {
      version: 1,
      shared: readSharedSettings(),
      users: readUserRows()
    };
  }

  function importState(state, handlers) {
    if (!state || typeof state !== "object") {
      throw new Error("Invalid JSON state.");
    }

    handlers.setSharedSettings(state.shared || {});
    handlers.resetUsersState();

    const users = Array.isArray(state.users) && state.users.length > 0
      ? state.users
      : [{ label: "ユーザー 1", userId: "" }];

    users.forEach((user) => handlers.createUserRow(user));
    handlers.setActiveUserId(handlers.getUsersState()[0]?.internalId || null);
    handlers.renderUserTabs();
    handlers.renderActiveUserEditor();
    handlers.updateOutput({ immediate: true });
  }

  function scheduleLocalDraftSave(readSharedSettings, readUserRows, delay = 180) {
    if (localDraftSaveTimeoutId) {
      clearTimeout(localDraftSaveTimeoutId);
    }

    localDraftSaveTimeoutId = window.setTimeout(() => {
      localDraftSaveTimeoutId = null;

      try {
        const saveDraftPromise = Promise.resolve().then(async () => {
          const savedAt = new Date().toISOString();
          const indexedDbAvailable = supportsIndexedDb();

          if (!indexedDbAvailable) {
            localStorage.setItem(
              LOCAL_DRAFT_KEY,
              JSON.stringify({
                version: LOCAL_DRAFT_VERSION,
                savedAt,
                state: exportState(readSharedSettings, readUserRows)
              })
            );
            return;
          }

          const { state, draftImages } = buildLocalDraftState(readSharedSettings, readUserRows);

          try {
            await saveDraftImagesToIndexedDb(draftImages);
            localStorage.setItem(
              LOCAL_DRAFT_KEY,
              JSON.stringify({
                version: LOCAL_DRAFT_VERSION,
                savedAt,
                state
              })
            );
          } catch (error) {
            localStorage.setItem(
              LOCAL_DRAFT_KEY,
              JSON.stringify({
                version: LOCAL_DRAFT_VERSION,
                savedAt,
                state: exportState(readSharedSettings, readUserRows)
              })
            );
          }
        });

        saveDraftPromise.catch(() => {
          // Ignore quota/storage failures and keep the editor usable.
        });
      } catch (error) {
        // Ignore quota/storage failures and keep the editor usable.
      }
    }, delay);
  }

  async function clearLocalDraft() {
    try {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    } catch (error) {
      // Ignore storage failures.
    }

    try {
      await clearDraftImagesFromIndexedDb();
    } catch (error) {
      // Ignore IndexedDB failures.
    }
  }

  async function readLocalDraft() {
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

      const needsDraftImages = Array.isArray(parsed.state.users)
        && parsed.state.users.some((user) => user?.hasDraftImage);

      if (!needsDraftImages) {
        return parsed;
      }

      try {
        const draftImages = await readDraftImagesFromIndexedDb();
        return {
          ...parsed,
          state: mergeDraftImagesIntoState(parsed.state, draftImages)
        };
      } catch (error) {
        return {
          ...parsed,
          state: mergeDraftImagesIntoState(parsed.state, null)
        };
      }
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

  return {
    clearLocalDraft,
    exportState,
    formatSavedAt,
    importState,
    readLocalDraft,
    scheduleLocalDraftSave
  };
})();
