(function () {
    if (window.__yumeHumanVerificationInit) return;
    window.__yumeHumanVerificationInit = true;

    // Timing rules (same behavior model as AnimeOBT).
    const SHOW_TIME_MS = 5 * 60 * 1000;
    const FIRST_DELAY_MS = 120 * 1000;
    const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

    const STORAGE_KEYS = {
        popupStartTime: 'popupStartTime',
        lastPopupTime: 'lastPopupTime',
        commentBaseTimesData: 'commentBaseTimesData',
    };

    function getPopup() {
        return document.getElementById('human-verification-popup');
    }

    function hideWelcomePopupIfNeeded() {
        const welcomePopup = document.getElementById('welcome-popup');
        if (!welcomePopup) return;
        welcomePopup.classList.remove('active');
        welcomePopup.classList.add('hidden');
    }

    function showFallbackMessage(message) {
        const fallback = document.getElementById('verify-fallback-message');
        if (!fallback) return;
        fallback.textContent = message;
        fallback.style.display = 'block';
    }

    function clearFallbackMessage() {
        const fallback = document.getElementById('verify-fallback-message');
        if (!fallback) return;
        fallback.style.display = 'none';
        fallback.textContent = '';
    }

    function ensureSafeYkCallback() {
        if (typeof window._yk === 'function') return;
        window._yk = function () {
            showFallbackMessage('Verification service is temporarily unavailable. Please try again shortly.');
            console.warn('[HumanVerification] _yk callback is unavailable.');
        };
    }

    function exitFullscreen() {
        if (!document.fullscreenElement) return;
        document.exitFullscreen().catch(function (err) {
            console.warn('[HumanVerification] Error exiting fullscreen:', err);
        });
    }

    function resetOrientation() {
        if (!window.screen || !window.screen.orientation || !window.screen.orientation.type) return;
        if (!window.screen.orientation.type.startsWith('landscape')) return;
        if (typeof window.screen.orientation.lock !== 'function') return;
        window.screen.orientation.lock('portrait').catch(function (err) {
            console.warn('[HumanVerification] Error resetting orientation:', err);
        });
    }

    function resetToDefaultMode() {
        exitFullscreen();
        resetOrientation();
    }

    function toggleBodyLock(isOpen) {
        document.body.classList.toggle('hv-popup-open', Boolean(isOpen));
    }

    function buildCountryInstructions(countryName) {
        if (countryName === 'United States') {
            return '<div class="instruction-section"><h3>United States</h3><p>Open Verify Now and complete one listed task.</p><p>After completion, return to this page and refresh if needed.</p></div><div class="instruction-section"><h3>Need help?</h3><p>Please, feel free to <a href="https://form.jotform.com/250330360513442" target="_blank" rel="noopener noreferrer">Contact Us</a>.</p></div>';
        }
        if (countryName === 'United Kingdom') {
            return '<div class="instruction-section"><h3>United Kingdom</h3><p>Click Verify Now and choose one valid task.</p><p>Use accurate details while completing the task.</p></div><div class="instruction-section"><h3>Need help?</h3><p>Please <a href="https://form.jotform.com/250330360513442" target="_blank" rel="noopener noreferrer">Contact Us</a>.</p></div>';
        }
        if (countryName === 'Canada') {
            return '<div class="instruction-section"><h3>Canada</h3><p>Click Verify Now and complete one task to unlock access.</p><p>If one task fails, try another available one.</p></div><div class="instruction-section"><h3>Need help?</h3><p>Please <a href="https://form.jotform.com/250330360513442" target="_blank" rel="noopener noreferrer">Contact Us</a>.</p></div>';
        }
        if (countryName === 'Australia') {
            return '<div class="instruction-section"><h3>Australia</h3><p>Use Verify Now and finish one available task.</p><p>Keep this tab open until task completion.</p></div><div class="instruction-section"><h3>Need help?</h3><p>Please <a href="https://form.jotform.com/250330360513442" target="_blank" rel="noopener noreferrer">Contact Us</a>.</p></div>';
        }
        if (countryName === 'Bangladesh') {
            return '<div class="instruction-section"><h3>Bangladesh</h3><p>Click Verify Now and complete one available task.</p><p>Wait briefly after completion for verification to propagate.</p></div><div class="instruction-section"><h3>Need help?</h3><p>Please, feel free to <a href="https://form.jotform.com/250330360513442" target="_blank" rel="noopener noreferrer">Contact Us</a>.</p></div>';
        }
        return '<div class="instruction-section"><h3>Verification Steps</h3><p>Click Verify Now and complete one available task.</p><p>If it does not unlock instantly, wait a minute and retry.</p></div><div class="instruction-section"><h3>Need help?</h3><p>Please <a href="https://form.jotform.com/250330360513442" target="_blank" rel="noopener noreferrer">Contact Us</a>.</p></div>';
    }

    function showPopup() {
        const popup = getPopup();
        if (!popup) return;

        hideWelcomePopupIfNeeded();
        clearFallbackMessage();
        popup.style.display = 'block';
        toggleBodyLock(true);
        resetToDefaultMode();

        const instructionsContainer = document.getElementById('instructions-container');
        if (instructionsContainer) {
            instructionsContainer.style.display = 'none';
            fetch('https://api.ipgeolocation.io/ipgeo?apiKey=cd2aa73b09674eeba8749ba8419157b2')
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    const countryName = data && data.country_name ? data.country_name : '';
                    instructionsContainer.innerHTML = buildCountryInstructions(countryName);
                })
                .catch(function () {
                    instructionsContainer.innerHTML = buildCountryInstructions('');
                });
        }

        window.setTimeout(function () {
            popup.style.display = 'none';
            toggleBodyLock(false);
            localStorage.setItem(STORAGE_KEYS.lastPopupTime, String(Date.now()));
        }, SHOW_TIME_MS);
    }

    function shouldShowPopup(now) {
        const popupStartTime = localStorage.getItem(STORAGE_KEYS.popupStartTime);
        const lastPopupTime = localStorage.getItem(STORAGE_KEYS.lastPopupTime);

        if (!lastPopupTime || now - parseInt(lastPopupTime, 10) >= WEEKLY_INTERVAL_MS) {
            return true;
        }
        if (popupStartTime && now - parseInt(popupStartTime, 10) < SHOW_TIME_MS) {
            return true;
        }
        return false;
    }

    function setupPopupRules() {
        const popup = getPopup();
        const howToBtn = document.getElementById('how-to-btn');
        const verifyBtn = document.getElementById('verify-btn');
        if (!popup || !verifyBtn) return;

        ensureSafeYkCallback();

        verifyBtn.addEventListener('click', function () {
            if (typeof window._yk !== 'function') {
                showFallbackMessage('Verification service is temporarily unavailable. Please try again shortly.');
            } else {
                clearFallbackMessage();
            }
        });

        if (howToBtn) {
            howToBtn.addEventListener('click', function (event) {
                event.preventDefault();
                const container = document.getElementById('instructions-container');
                if (!container) return;
                container.style.display = container.style.display === 'block' ? 'none' : 'block';
            });
        }

        const now = Date.now();
        if (shouldShowPopup(now)) {
            const popupStartTime = localStorage.getItem(STORAGE_KEYS.popupStartTime);
            if (popupStartTime) {
                showPopup();
            } else {
                window.setTimeout(function () {
                    localStorage.setItem(STORAGE_KEYS.popupStartTime, String(Date.now()));
                    showPopup();
                }, FIRST_DELAY_MS);
            }
        }

        const observer = new MutationObserver(function () {
            if (popup.style.display === 'block') {
                toggleBodyLock(true);
                resetToDefaultMode();
                hideWelcomePopupIfNeeded();
            } else {
                toggleBodyLock(false);
            }
        });
        observer.observe(popup, { attributes: true, attributeFilter: ['style'] });
    }

    function setupCommentUiHelpers() {
        const seeMoreComments = document.getElementById('seeMoreComments');
        const premiumMessage = document.getElementById('premiumMessage');
        if (seeMoreComments && premiumMessage) {
            seeMoreComments.addEventListener('click', function () {
                premiumMessage.classList.add('show');
            });
        }
    }

    function setupCommentAutoScroll() {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;
        const scrollSpeed = 0.5;
        window.setInterval(function () {
            if (commentsList.scrollTop >= commentsList.scrollHeight - commentsList.clientHeight) {
                commentsList.scrollTop = 0;
            } else {
                commentsList.scrollTop += scrollSpeed;
            }
        }, 20);
    }

    function formatRelativeTime(secondsElapsed) {
        if (secondsElapsed < 60) {
            return secondsElapsed + ' second' + (secondsElapsed === 1 ? '' : 's') + ' ago';
        }
        if (secondsElapsed < 3600) {
            const minutes = Math.floor(secondsElapsed / 60);
            return minutes + ' minute' + (minutes === 1 ? '' : 's') + ' ago';
        }
        const hours = Math.floor(secondsElapsed / 3600);
        return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
    }

    function initializeDailyCommentBaseTimes() {
        const storedData = localStorage.getItem(STORAGE_KEYS.commentBaseTimesData);
        const today = new Date().toISOString().split('T')[0];
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                if (parsedData.lastReset === today && parsedData.baseTimes) {
                    return parsedData.baseTimes;
                }
            } catch (err) {
                console.warn('[HumanVerification] Failed to parse comment base times:', err);
            }
        }

        const baseTimes = {};
        const comments = document.querySelectorAll('#human-verification-popup .comment[data-comment-id][data-offset]');
        const now = Date.now();
        comments.forEach(function (comment) {
            const commentId = comment.getAttribute('data-comment-id');
            const offset = parseInt(comment.getAttribute('data-offset'), 10) * 1000;
            baseTimes[commentId] = now - offset;
        });

        localStorage.setItem(
            STORAGE_KEYS.commentBaseTimesData,
            JSON.stringify({ lastReset: today, baseTimes: baseTimes })
        );
        return baseTimes;
    }

    function updateCommentTimestamps(baseTimes) {
        const comments = document.querySelectorAll('#human-verification-popup .comment[data-comment-id]');
        const now = Date.now();
        comments.forEach(function (comment) {
            const commentId = comment.getAttribute('data-comment-id');
            const baseTime = baseTimes[commentId];
            if (!baseTime) return;
            const secondsElapsed = Math.floor((now - baseTime) / 1000);
            const timestampElem = comment.querySelector('.comment-timestamp');
            if (timestampElem) {
                timestampElem.textContent = formatRelativeTime(secondsElapsed);
            }
        });
    }

    function updateOnlineCounter() {
        const counterElem = document.getElementById('onlineCounter');
        if (!counterElem) return;
        const currentCount = parseInt(counterElem.textContent, 10) || 5993;
        const change = Math.floor(Math.random() * 11) - 5;
        let newCount = currentCount + change;
        if (newCount < 5993) newCount = 5993;
        counterElem.textContent = String(newCount);
    }

    function initSocialProof() {
        const baseTimes = initializeDailyCommentBaseTimes();
        updateCommentTimestamps(baseTimes);
        window.setInterval(function () {
            updateCommentTimestamps(baseTimes);
        }, 30000);
        window.setInterval(updateOnlineCounter, 5000);
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (!getPopup()) return;
        setupPopupRules();
        setupCommentUiHelpers();
        setupCommentAutoScroll();
        initSocialProof();
    });
})();
