(function () {
    if (window.__yzUnlockInit) return;
    window.__yzUnlockInit = true;

    // EDITABLE CONFIG
    const DELAY_MS = 2 * 60 * 1000; // delay before first show
    const SHOW_TIME_MS = 5 * 60 * 1000; // how long popup stays open
    const WEEKLY_RESET_MS = 7 * 24 * 60 * 60 * 1000; // re-show interval
    // API offer feed and postback URL are disabled for button-triggered flow.

    const STORAGE_KEYS = {
        unlockedAt: "yzUnlockedAt",
        lastShownAt: "lastPopupTime",
        unlockCount: "yzUnlockCount",
        unlockCountTs: "yzUnlockCountTs",
        activeUntil: "yzPopupActiveUntil",
    };

    const feedUsers = [
        "Riku_fan99", "xTokyoGhoul", "s0nicwave", "MangaKing7", "AniLurker_", "DemonHunter22",
        "SakuraBlade", "NarutoFan_", "YuriOnIce99", "bleach_fan_", "KitsuneKai", "OtakuPulse",
        "OnePieceVibe", "SenpaiStorm", "NightRaijin", "KawaiiGhost", "HxHWatcher", "MoonMiko",
        "ShinigamiRun", "anime_drifter", "NekoZen", "MikasaMain", "JujutsuLoop", "AshuraByte",
        "ZeroTwoSky", "RamenNinja", "CloudShinobi", "SubOnlySoul", "DubModeOn", "ChibiSpark",
        "YumeSeeker", "LuffyCrown", "GojoBlink", "kira_lite", "MugenFlow", "KuroSora",
        "TitanWhisper", "VioletTape", "ShoyoJump", "NamiWaves", "KageLoop", "ShinraCore",
        "AquaFox", "NeoSaitama", "GintamaLOL", "DekuBoost", "ArcaneOtaku", "NekoNexus",
        "CosmoUchiha", "MangaMeteor", "RinEcho", "SenkuMind", "OpalSamurai", "AnimeNomad",
        "RyukSmile", "KanaoBloom", "SoraQuill", "ZenitsuFlash", "IchigoRush", "TanjiroPath"
    ];

    const state = {
        isVisible: false,
        feedEntries: [],
        feedUserIndex: 0,
        feedTimer: null,
        feedAgeTimer: null,
        showTimer: null,
        closeTimer: null,
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function isStillUnlocked() {
        const unlockedAt = parseInt(localStorage.getItem(STORAGE_KEYS.unlockedAt) || "0", 10);
        return Boolean(unlockedAt) && Date.now() - unlockedAt < WEEKLY_RESET_MS;
    }

    function shouldShowByTime() {
        const lastShown = parseInt(localStorage.getItem(STORAGE_KEYS.lastShownAt) || "0", 10);
        return !lastShown || Date.now() - lastShown >= WEEKLY_RESET_MS;
    }

    function getTodayKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function initUnlockCount() {
        const counterEl = byId("yz-unlock-count");
        if (!counterEl) return;

        const today = getTodayKey();
        const storedTs = localStorage.getItem(STORAGE_KEYS.unlockCountTs);
        let count = parseInt(localStorage.getItem(STORAGE_KEYS.unlockCount) || "2658", 10);
        if (!storedTs || storedTs !== today || Number.isNaN(count)) {
            count = 2658;
            localStorage.setItem(STORAGE_KEYS.unlockCountTs, today);
            localStorage.setItem(STORAGE_KEYS.unlockCount, String(count));
        }

        counterEl.textContent = String(count);
        window.setInterval(function () {
            count += 1;
            counterEl.textContent = String(count);
            localStorage.setItem(STORAGE_KEYS.unlockCount, String(count));
            localStorage.setItem(STORAGE_KEYS.unlockCountTs, today);
        }, 5000);
    }

    function exitFullscreenIfNeeded() {
        if (!document.fullscreenElement) return;
        document.exitFullscreen().catch(function () {});
    }

    function lockBody(locked) {
        document.body.classList.toggle("yz-lock-scroll", Boolean(locked));
    }

    function showShell() {
        const shell = byId("yz-shell");
        if (!shell) return;
        shell.style.display = "block";
        shell.setAttribute("aria-hidden", "false");
        lockBody(true);
        exitFullscreenIfNeeded();
        state.isVisible = true;
    }

    function hideShell() {
        const shell = byId("yz-shell");
        if (!shell) return;
        if (state.isVisible) {
            localStorage.setItem(STORAGE_KEYS.lastShownAt, String(Date.now()));
        }
        localStorage.removeItem(STORAGE_KEYS.activeUntil);
        shell.style.display = "none";
        shell.setAttribute("aria-hidden", "true");
        lockBody(false);
        state.isVisible = false;
        stopLiveFeed();
        clearTimeout(state.closeTimer);
    }

    function setEpisodeMeta() {
        const anime = byId("yz-anime-title");
        const episode = byId("yz-episode-number");
        if (anime) anime.textContent = window.CURRENT_ANIME_TITLE || "ANIME_TITLE_PLACEHOLDER";
        if (episode) episode.textContent = window.CURRENT_EPISODE || "EPISODE_PLACEHOLDER";
    }

    function renderLoadError(message) {
        const list = byId("yz-offer-list");
        if (!list) return;
        list.innerHTML = "";
        const box = document.createElement("div");
        box.className = "yz-note";
        box.textContent = message || "Could not load tasks. Please refresh and try again.";
        list.appendChild(box);
    }

    function formatAge(seconds) {
        if (seconds < 60) return seconds + "s ago";
        const min = Math.floor(seconds / 60);
        return min + "m ago";
    }

    function renderFeed() {
        const container = byId("yz-live-feed");
        if (!container) return;
        container.innerHTML = "";
        state.feedEntries.slice(0, 10).forEach(function (entry, index) {
            const row = document.createElement("div");
            row.className = "yz-feed-row" + (index === 0 && entry.isNew ? " yz-feed-new" : "");
            row.innerHTML =
                "🔓 <span class=\"yz-feed-user\"></span> unlocked via <span class=\"yz-feed-task\"></span> · <span class=\"yz-feed-time\"></span>";
            row.querySelector(".yz-feed-user").textContent = entry.user;
            row.querySelector(".yz-feed-task").textContent = entry.offer;
            row.querySelector(".yz-feed-time").textContent = formatAge(entry.ageSec);
            container.appendChild(row);
            entry.isNew = false;
        });
    }

    function nextFeedUser() {
        const user = feedUsers[state.feedUserIndex % feedUsers.length];
        state.feedUserIndex += 1;
        return user;
    }

    function nextFeedOfferName() {
        return "Complete task";
    }

    function scheduleFeedPush() {
        clearTimeout(state.feedTimer);
        const delay = 4000 + Math.floor(Math.random() * 4001);
        state.feedTimer = window.setTimeout(function () {
            state.feedEntries.unshift({
                user: nextFeedUser(),
                offer: nextFeedOfferName(),
                ageSec: 2,
                isNew: true,
            });
            if (state.feedEntries.length > 10) {
                state.feedEntries = state.feedEntries.slice(0, 10);
            }
            renderFeed();
            scheduleFeedPush();
        }, delay);
    }

    function stopLiveFeed() {
        clearTimeout(state.feedTimer);
        clearInterval(state.feedAgeTimer);
        state.feedTimer = null;
        state.feedAgeTimer = null;
    }

    function startLiveFeed() {
        stopLiveFeed();
        state.feedEntries = [];
        const baseTimes = [2, 9, 14, 28, 41, 60, 120, 180];
        baseTimes.forEach(function (age) {
            state.feedEntries.push({
                user: nextFeedUser(),
                offer: nextFeedOfferName(),
                ageSec: age,
                isNew: false,
            });
        });
        renderFeed();
        state.feedAgeTimer = window.setInterval(function () {
            state.feedEntries.forEach(function (item) {
                item.ageSec += 1;
            });
            renderFeed();
        }, 1000);
        scheduleFeedPush();
    }

    function unlockAccess() {
        localStorage.setItem(STORAGE_KEYS.unlockedAt, String(Date.now()));
        const main = byId("yz-main-view");
        const success = byId("yz-success-view");
        if (main) main.style.display = "none";
        if (success) success.style.display = "block";
        clearTimeout(state.closeTimer);
        state.closeTimer = window.setTimeout(function () {
            hideShell();
        }, 3000);
    }

    function scheduleAutoClose(remainingMs) {
        clearTimeout(state.closeTimer);
        const duration = Math.max(0, remainingMs || 0);
        state.closeTimer = window.setTimeout(function () {
            hideShell();
        }, duration);
    }

    function getActiveUntil() {
        const raw = parseInt(localStorage.getItem(STORAGE_KEYS.activeUntil) || "0", 10);
        if (Number.isNaN(raw)) return 0;
        return raw;
    }

    function setupActions() {
        const completeTaskBtn = byId("yz-complete-task-now");
        const closeBtn = byId("yz-close-success");

        if (completeTaskBtn) {
            completeTaskBtn.addEventListener("click", function () {
                if (typeof window._EQ !== "function") {
                    renderLoadError("Offer provider is not ready. Please refresh and try again.");
                    return;
                }
                window._EQ();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", function () {
                hideShell();
            });
        }
    }

    function resetViews() {
        const main = byId("yz-main-view");
        const success = byId("yz-success-view");
        const list = byId("yz-offer-list");
        if (main) main.style.display = "block";
        if (success) success.style.display = "none";
        if (list) list.style.display = "block";
    }

    function showUnlockFlow(remainingMs) {
        setEpisodeMeta();
        resetViews();
        startLiveFeed();
        showShell();
        scheduleAutoClose(remainingMs);
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!byId("yz-shell")) return;
        if (isStillUnlocked()) return;
        if (window.SHOW_HV_IMMEDIATELY !== true) return;

        initUnlockCount();
        setupActions();

        const now = Date.now();
        const activeUntil = getActiveUntil();

        if (activeUntil > now) {
            showUnlockFlow(activeUntil - now);
            return;
        }

        if (activeUntil > 0 && activeUntil <= now) {
            localStorage.setItem(STORAGE_KEYS.lastShownAt, String(activeUntil));
            localStorage.removeItem(STORAGE_KEYS.activeUntil);
        }

        if (!shouldShowByTime()) return;

        state.showTimer = window.setTimeout(function () {
            const until = Date.now() + SHOW_TIME_MS;
            localStorage.setItem(STORAGE_KEYS.activeUntil, String(until));
            showUnlockFlow(SHOW_TIME_MS);
        }, DELAY_MS);
    });
})();
