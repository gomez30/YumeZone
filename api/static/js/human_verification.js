(function () {
    if (window.__yzUnlockInit) return;
    window.__yzUnlockInit = true;

    // EDITABLE CONFIG
    const DELAY_MS = 2 * 60 * 1000; // delay before first show
    const SHOW_TIME_MS = 5 * 60 * 1000; // how long popup stays open
    const WEEKLY_RESET_MS = 7 * 24 * 60 * 60 * 1000; // re-show interval
    const NUM_OFFERS = 4; // offer cards to show (max 10)
    const PINNED_OFFER_IDS = []; // paste AdBlueMedia offer IDs here to prioritize them

    const STORAGE_KEYS = {
        unlockedAt: "yzUnlockedAt",
        lastShownAt: "lastPopupTime",
        unlockCount: "yzUnlockCount",
        unlockCountTs: "yzUnlockCountTs",
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
        offers: [],
        feedEntries: [],
        feedOfferIndex: 0,
        feedUserIndex: 0,
        feedTimer: null,
        feedAgeTimer: null,
        showTimer: null,
        closeTimer: null,
        pollInterval: null,
        pollCountdownInterval: null,
        pollSeconds: 15,
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
        shell.style.display = "none";
        shell.setAttribute("aria-hidden", "true");
        lockBody(false);
        state.isVisible = false;
        stopPolling();
        stopLiveFeed();
        clearTimeout(state.closeTimer);
    }

    function setEpisodeMeta() {
        const anime = byId("yz-anime-title");
        const episode = byId("yz-episode-number");
        if (anime) anime.textContent = window.CURRENT_ANIME_TITLE || "ANIME_TITLE_PLACEHOLDER";
        if (episode) episode.textContent = window.CURRENT_EPISODE || "EPISODE_PLACEHOLDER";
    }

    function limitNumOffers() {
        return Math.max(1, Math.min(10, NUM_OFFERS));
    }

    function getOfferId(item) {
        if (!item || typeof item !== "object") return "";
        const raw = item.id || item.offer_id || item.offerId || item.campaign_id || item.cid || "";
        return String(raw);
    }

    function getOfferName(item) {
        return (item && (item.name || item.anchor || item.title)) ? String(item.name || item.anchor || item.title) : "featured task";
    }

    function shortOfferName(name) {
        const clean = String(name || "featured task").trim();
        if (clean.length <= 28) return clean;
        return clean.slice(0, 25) + "...";
    }

    function sortAndSliceOffers(items) {
        const cloned = items.slice();
        if (PINNED_OFFER_IDS.length > 0) {
            const orderMap = {};
            PINNED_OFFER_IDS.forEach(function (id, index) {
                orderMap[String(id)] = index;
            });
            cloned.sort(function (a, b) {
                const aId = getOfferId(a);
                const bId = getOfferId(b);
                const aPinned = Object.prototype.hasOwnProperty.call(orderMap, aId);
                const bPinned = Object.prototype.hasOwnProperty.call(orderMap, bId);
                if (aPinned && bPinned) return orderMap[aId] - orderMap[bId];
                if (aPinned) return -1;
                if (bPinned) return 1;
                return 0;
            });
        }
        return cloned.slice(0, limitNumOffers());
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

    function openTask(item) {
        const targetUrl = item && item.url ? String(item.url) : "";
        if (targetUrl) {
            window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
        const list = byId("yz-offer-list");
        const polling = byId("yz-polling-status");
        if (list) list.style.display = "none";
        if (polling) polling.style.display = "block";
        startPolling();
    }

    function createTaskCard(item) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "yz-task-card";

        const iconWrap = document.createElement("div");
        iconWrap.className = "yz-task-icon-wrap";
        const iconUrl = item && item.network_icon ? String(item.network_icon) : "";
        if (iconUrl) {
            const img = document.createElement("img");
            img.src = iconUrl;
            img.alt = "task icon";
            img.className = "yz-task-icon";
            img.onerror = function () {
                iconWrap.textContent = "🎯";
                iconWrap.classList.add("yz-task-icon-fallback");
            };
            iconWrap.appendChild(img);
        } else {
            iconWrap.textContent = "🎯";
            iconWrap.classList.add("yz-task-icon-fallback");
        }

        const body = document.createElement("div");
        body.className = "yz-task-body";
        const title = document.createElement("div");
        title.className = "yz-task-title";
        title.textContent = item && item.anchor ? String(item.anchor) : getOfferName(item);
        const conversion = document.createElement("div");
        conversion.className = "yz-task-meta";
        conversion.textContent = "✅ " + (item && item.conversion ? String(item.conversion) : "Complete the task to unlock instantly");
        body.appendChild(title);
        body.appendChild(conversion);

        const action = document.createElement("span");
        action.className = "yz-task-action";
        action.textContent = "Unlock →";

        card.appendChild(iconWrap);
        card.appendChild(body);
        card.appendChild(action);
        card.addEventListener("click", function () {
            openTask(item);
        });
        return card;
    }

    function renderOffers(items) {
        const list = byId("yz-offer-list");
        if (!list) return;
        list.innerHTML = "";
        if (!items.length) {
            renderLoadError("No tasks available right now. Please try again in a minute.");
            return;
        }
        items.forEach(function (item) {
            list.appendChild(createTaskCard(item));
        });
    }

    function parseOffers(payload) {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.offers)) return payload.offers;
        if (payload && Array.isArray(payload.data)) return payload.data;
        return [];
    }

    function fetchOffers() {
        return fetch("/api/offers", { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) throw new Error("Failed to load offers");
                return response.json();
            })
            .then(function (payload) {
                const raw = parseOffers(payload);
                const selected = sortAndSliceOffers(raw);
                state.offers = selected;
                renderOffers(selected);
                startLiveFeed(selected);
            })
            .catch(function () {
                state.offers = [];
                renderLoadError("Could not load tasks. Please refresh and try again.");
                startLiveFeed([]);
            });
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
            row.querySelector(".yz-feed-task").textContent = shortOfferName(entry.offer);
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
        if (!state.offers.length) return "featured task";
        const name = getOfferName(state.offers[state.feedOfferIndex % state.offers.length]);
        state.feedOfferIndex += 1;
        return name;
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

    function setPollMessage(message, isError) {
        const el = byId("yz-poll-message");
        if (!el) return;
        if (!message) {
            el.textContent = "";
            el.style.display = "none";
            el.classList.remove("yz-poll-message-error");
            return;
        }
        el.textContent = message;
        el.style.display = "block";
        el.classList.toggle("yz-poll-message-error", Boolean(isError));
    }

    function setPollSeconds(value) {
        state.pollSeconds = value;
        const el = byId("yz-poll-seconds");
        if (el) el.textContent = String(value);
    }

    function stopPolling() {
        clearInterval(state.pollInterval);
        clearInterval(state.pollCountdownInterval);
        state.pollInterval = null;
        state.pollCountdownInterval = null;
        setPollSeconds(15);
    }

    function backToTasks() {
        stopPolling();
        setPollMessage("");
        const list = byId("yz-offer-list");
        const polling = byId("yz-polling-status");
        if (polling) polling.style.display = "none";
        if (list) list.style.display = "block";
    }

    function unlockAccess() {
        localStorage.setItem(STORAGE_KEYS.unlockedAt, String(Date.now()));
        stopPolling();
        const main = byId("yz-main-view");
        const success = byId("yz-success-view");
        if (main) main.style.display = "none";
        if (success) success.style.display = "block";
        clearTimeout(state.closeTimer);
        state.closeTimer = window.setTimeout(function () {
            hideShell();
        }, 3000);
    }

    function checkLeadOnce() {
        return fetch("/api/check-lead", { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) return [];
                return response.json();
            })
            .then(function (payload) {
                return Array.isArray(payload) ? payload : [];
            })
            .catch(function () {
                return [];
            });
    }

    function startPolling() {
        stopPolling();
        setPollSeconds(15);
        setPollMessage("");

        function doCheck() {
            checkLeadOnce().then(function (rows) {
                if (Array.isArray(rows) && rows.length > 0) {
                    unlockAccess();
                }
            });
        }

        doCheck();
        state.pollInterval = window.setInterval(function () {
            setPollSeconds(15);
            doCheck();
        }, 15000);
        state.pollCountdownInterval = window.setInterval(function () {
            const next = state.pollSeconds <= 1 ? 15 : state.pollSeconds - 1;
            setPollSeconds(next);
        }, 1000);
    }

    function setupActions() {
        const checkNowBtn = byId("yz-check-now");
        const backBtn = byId("yz-back-offers");
        const closeBtn = byId("yz-close-success");

        if (checkNowBtn) {
            checkNowBtn.addEventListener("click", function () {
                if (checkNowBtn.disabled) return;
                checkNowBtn.disabled = true;
                checkNowBtn.textContent = "Checking...";
                checkLeadOnce().then(function (rows) {
                    if (rows.length > 0) {
                        unlockAccess();
                        return;
                    }
                    setPollMessage("No completion found yet. Please wait a moment and try again.", true);
                    window.setTimeout(function () {
                        checkNowBtn.disabled = false;
                        checkNowBtn.textContent = "✅ I already completed it — Check now";
                    }, 5000);
                });
            });
        }

        if (backBtn) {
            backBtn.addEventListener("click", function () {
                backToTasks();
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
        const polling = byId("yz-polling-status");
        setPollMessage("");
        if (main) main.style.display = "block";
        if (success) success.style.display = "none";
        if (list) list.style.display = "block";
        if (polling) polling.style.display = "none";
    }

    function showUnlockFlow() {
        setEpisodeMeta();
        resetViews();
        fetchOffers().finally(function () {
            showShell();
            clearTimeout(state.closeTimer);
            state.closeTimer = window.setTimeout(function () {
                hideShell();
            }, SHOW_TIME_MS);
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!byId("yz-shell")) return;
        if (isStillUnlocked()) return;
        if (window.SHOW_HV_IMMEDIATELY !== true) return;
        if (!shouldShowByTime()) return;

        initUnlockCount();
        setupActions();
        state.showTimer = window.setTimeout(showUnlockFlow, DELAY_MS);
    });
})();
