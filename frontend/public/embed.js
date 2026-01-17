(function() {
    "use strict";

    // --- 1. CONFIGURATION & STATE ---
    var config = null; 
    // Note: 'isWidgetRendered' hata diya taaki SPA me wapas aane par widget reload ho sake.

    // --- 2. SAFE EXECUTION ENGINE ---
    function autoStart() {
        if (window.TF_LOADED) return;
        
        // Wait for page load + extra delay for React Hydration
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(initEngine, 1000);
        } else {
            window.addEventListener('load', function() {
                setTimeout(initEngine, 2000);
            });
        }
    }

    function initEngine() {
        if (window.TF_LOADED) return;
        window.TF_LOADED = true;

        injectStyles(); 
        initTrustFlow(); 
        // Watcher: Har 1 second check karega (SPA Navigation & Empty Divs ke liye)
        setInterval(initTrustFlow, 1000); 
    }

    // --- 3. CSS STYLES ---
    function injectStyles() {
        var styleId = 'tf-embed-css';
        if (!document.getElementById(styleId)) {
            var style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .trustflow-widget-container { width: 100%; position: relative; z-index: 1; min-height: 150px; display: block; }
                .trustflow-widget-iframe { width: 100%; border: none; display: block; background: transparent !important; }
                .tf-popup-wrapper { 
                    position: fixed !important; z-index: 2147483647 !important; 
                    max-width: 320px !important; width: auto !important;
                    font-family: 'Inter', sans-serif !important; pointer-events: none !important;
                    display: flex !important; flex-direction: column !important; gap: 10px !important;
                    transition: all 0.5s ease !important;
                }
                .tf-popup-bottom-left { bottom: 20px !important; left: 20px !important; }
                .tf-popup-bottom-right { bottom: 20px !important; right: 20px !important; }
                .tf-popup-card {
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.5) !important;
                    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.15) !important;
                    border-radius: 16px !important; padding: 12px 16px !important;
                    display: flex !important; align-items: center !important; gap: 12px !important;
                    pointer-events: auto !important; cursor: default !important;
                    opacity: 0 !important; transform: translateY(20px) scale(0.95) !important;
                    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    color: #1e293b !important;
                }
                .tf-popup-card.tf-dark {
                    background: rgba(15, 23, 42, 0.95) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: #f8fafc !important;
                }
                .tf-popup-card.tf-dark strong { color: #f8fafc !important; }
                .tf-popup-card.tf-dark p { color: #cbd5e1 !important; }
                .tf-popup-card.tf-active { opacity: 1 !important; transform: translateY(0) scale(1) !important; }
                @media (max-width: 768px) {
                    .tf-popup-wrapper { max-width: 64% !important; bottom: 15px !important; }
                    .tf-popup-card { width: auto !important; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // --- 4. CONFIG PARSER ---
    function getConfig() {
        if (config) return config;
        
        var script = document.querySelector('script[data-space-id]');
        if (!script) return null;

        var spaceId = script.getAttribute('data-space-id');
        
        // Auto-Detect Logic
        var scriptSrc = script.src || '';
        var baseUrl = scriptSrc.indexOf('/embed.js') > -1 ? scriptSrc.replace('/embed.js', '') : '';
        if (!baseUrl) { baseUrl = window.location.origin; }

        var params = new URLSearchParams();
        params.append('theme', script.getAttribute('data-theme') || 'light');
        params.append('layout', script.getAttribute('data-layout') || 'grid');

        ['card-theme', 'corners', 'shadow', 'border', 'hover-effect', 'name-size', 
         'testimonial-style', 'animation', 'speed'].forEach(function(attr) {
            var val = script.getAttribute('data-' + attr);
            if (val) params.append(attr, val);
        });

        config = {
            scriptElement: script,
            spaceId: spaceId,
            baseUrl: baseUrl,
            widgetUrl: baseUrl + '/widget/' + spaceId + '?' + params.toString(),
            theme: script.getAttribute('data-theme') || 'light',
            placement: script.getAttribute('data-placement') || 'section',
            cardTheme: script.getAttribute('data-card-theme'),
            popupPosition: script.getAttribute('data-popup-position')
        };
        return config;
    }

    // --- 5. CORE ENGINE (SPA Fix & Vanilla Fallback) ---
    function initTrustFlow() {
        var cfg = getConfig();
        if (!cfg) return;

        // A. Popups Init (Only Once Globally)
        // Iframe check removed as per your request for easier testing
        if (!window.TF_POPUPS_INITIALIZED) {
            window.TF_POPUPS_INITIALIZED = true;
            fetchAndInitPopups(cfg.spaceId, cfg.baseUrl, cfg);
        }

        // B. Widget Injection Logic (Runs on Interval)
        
        // 1. Check Floating Widget
        if (cfg.placement === 'body') {
            if (!document.getElementById('tf-floating-launcher')) {
                renderFloatingWidget(cfg.widgetUrl, cfg.theme);
            }
            // Floating widget persists, but check others too if needed
        }

        // 2. Check Targeted DIV (Primary Method)
        var targetDiv = document.getElementById('trustflow-widget');
        if (targetDiv) {
            // Fix #1: SPA Refresh - Check if div exists BUT is empty
            if (!targetDiv.hasChildNodes()) {
                // console.log("TF: Found empty target div, rendering...");
                renderInsideDiv(targetDiv, cfg.widgetUrl);
            }
            // Agar Target Div mil gaya, to Inline check mat karo.
            return; 
        }

        // 3. Inline Script Fallback (Fix #2: Vanilla HTML)
        // Ye tabhi chalega jab Target Div nahi milega aur script Body mein hogi
        if (cfg.scriptElement.parentNode && cfg.scriptElement.parentNode.tagName !== 'HEAD') {
            // Check: Kya script ke bagal mein widget already hai?
            if (cfg.scriptElement.nextElementSibling && cfg.scriptElement.nextElementSibling.classList.contains('trustflow-widget-container')) {
                // Already rendered, do nothing
            } else {
                // console.log("TF: No Target Div, rendering Inline...");
                renderInlineWidget(cfg.scriptElement, cfg.widgetUrl);
            }
        }
    }

    // --- RENDER FUNCTIONS ---
    function renderInsideDiv(container, url) {
        container.classList.add('trustflow-widget-container');
        container.appendChild(createIframe(url));
    }
    function renderInlineWidget(scriptNode, url) {
        var container = document.createElement('div');
        container.className = 'trustflow-widget-container';
        scriptNode.parentNode.insertBefore(container, scriptNode.nextSibling);
        container.appendChild(createIframe(url));
    }
    function createIframe(url) {
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.className = 'trustflow-widget-iframe';
        iframe.allowTransparency = "true";
        iframe.setAttribute('loading', 'lazy');
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'trustflow-resize') {
                iframe.style.height = event.data.height + 'px';
            }
        });
        return iframe;
    }

    // --- POPUP LOGIC ---
    var globalPopupQueue = [];
    var isLoopRunning = false;
    var lastNewestId = null;
    var priorityItem = null; 

    function shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }

    function fetchAndInitPopups(spaceId, baseUrl, settings) {
        var cleanBase = 'https://refactored-barnacle-q7j55jp956wvh9j9r-8000.app.github.dev'; // Kept hardcoded as requested
        var apiUrl = cleanBase + '/api/spaces/' + spaceId + '/public-data'; 
        
        var fetchData = function(isFirstLoad) {
            fetch(apiUrl)
                .then(function(res) { 
                    if (!res.ok) throw new Error("API Error");
                    return res.json(); 
                })
                .then(function(data) {
                    if (data && data.widget_settings && data.widget_settings.popupsEnabled) {
                        updateQueue(data.testimonials, isFirstLoad);
                        if (!isLoopRunning) { 
                            runPopupLoop(data.widget_settings, settings); 
                        }
                    }
                    // Store CTA selector in global scope for analytics module
                    if (data && data.cta_selector !== undefined) {
                        window.TF_CTA_SELECTOR = data.cta_selector;
                    }
                    // Initialize analytics after fetching CTA selector
                    if (isFirstLoad && !window.TF_ANALYTICS_INITIALIZED) {
                        initAnalyticsModule(spaceId, cleanBase);
                    }
                })
                .catch(function(err) { /* Silent Fail */ });
        };
        fetchData(true);
        setInterval(function() { fetchData(false); }, 30000); 
    }

    function updateQueue(newTestimonials, isFirstLoad) {
        if (!newTestimonials) return;
        var rawList = newTestimonials.filter(function(t) { return t.is_liked; })
            .sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

        if (rawList.length > 0) {
            var newest = rawList[0];
            if (isFirstLoad === false && lastNewestId && newest.id !== lastNewestId) {
                priorityItem = newest; 
                globalPopupQueue.push(newest); 
            }
            if (isFirstLoad) {
                globalPopupQueue = shuffleArray(rawList);
            }
            lastNewestId = newest.id;
        }
    }

    // Helper: Fix #3 Check Visibility
    function isWidgetVisibleOnPage() {
        return document.getElementById('trustflow-widget') || 
               document.getElementById('tf-floating-launcher') ||
               document.querySelector('.trustflow-widget-container');
    }

    function runPopupLoop(apiSettings, scriptSettings) {
        if (isLoopRunning) return; 
        isLoopRunning = true;
        
        var theme = scriptSettings.cardTheme || apiSettings.cardTheme || 'light';
        var position = scriptSettings.popupPosition || apiSettings.popupPosition || 'bottom-left';
        var wrapperId = 'tf-popup-root';
        if (document.getElementById(wrapperId)) return;

        var wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.className = 'tf-popup-wrapper tf-popup-' + position;
        document.body.appendChild(wrapper);

        var currentIndex = 0; 
        var isPaused = false;

        function showNextPopup() {
            if (!document.body.contains(wrapper)) { isLoopRunning = false; return; }

            // --- Fix #3: Visibility Check ---
            // Agar widget is page par nahi hai, to popup skip karo aur thodi der baad check karo
            if (!isWidgetVisibleOnPage()) {
                return setTimeout(showNextPopup, 2000);
            }
            // --------------------------------

            if (globalPopupQueue.length === 0) { return setTimeout(showNextPopup, 5000); }
            if (isPaused) return setTimeout(showNextPopup, 1000);

            try {
                var item;
                if (priorityItem) {
                    item = priorityItem;
                    priorityItem = null; 
                } else {
                    if (currentIndex >= globalPopupQueue.length) {
                        globalPopupQueue = shuffleArray(globalPopupQueue);
                        currentIndex = 0;
                    }
                    item = globalPopupQueue[currentIndex];
                    currentIndex++;
                }

                var safeFallback = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z' /%3E%3C/svg%3E";
                var avatarUrl = item.respondent_photo_url;
                if (!avatarUrl) { avatarUrl = 'https://ui-avatars.com/api/?background=random&color=fff&name=' + encodeURIComponent(item.respondent_name[0]); }

                var card = document.createElement('div');
                var isDark = theme === 'dark'; 
                card.className = 'tf-popup-card' + (isDark ? ' tf-dark' : ''); 
                
                card.innerHTML = `
                    <div style="position:relative; flex-shrink:0;">
                        <img src="${avatarUrl}" alt="User" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.1); display:block; background-color: #f1f5f9;" onerror="this.onerror=null; this.src='${safeFallback}';">
                        <div style="position:absolute; bottom:-2px; right:-2px; background:#10b981; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>
                    </div>
                    <div style="display:flex; flex-direction:column; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <strong style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;">${item.respondent_name}</strong>
                            <div style="display:flex; color:#fbbf24; font-size:12px;">${'★'.repeat(item.rating || 5)}</div>
                        </div>
                        <p style="font-size:12px; margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3;">${item.content || ''}</p>
                        <div style="font-size:10px; opacity:0.7; margin-top:4px; font-weight:500;">
                            ${apiSettings.popupMessage || 'Verified Customer'} <span style="opacity:0.5">•</span> Just now
                        </div>
                    </div>`;

                card.onmouseenter = function() { isPaused = true; };
                card.onmouseleave = function() { isPaused = false; };
                wrapper.innerHTML = ''; wrapper.appendChild(card);
                requestAnimationFrame(function() { setTimeout(function() { card.classList.add('tf-active'); }, 50); });

                var duration = (apiSettings.popupDuration || 5) * 1000;
                var gap = (apiSettings.popupGap || 10) * 1000;
                setTimeout(function() {
                    if (card) card.classList.remove('tf-active');
                    setTimeout(function() { showNextPopup(); }, gap);
                }, duration);

            } catch (err) { setTimeout(showNextPopup, 5000); }
        }
        setTimeout(showNextPopup, (apiSettings.popupDelay || 2) * 1000);
    }

    // --- STARTUP LOGIC ---
    autoStart();

    // =====================================================
    // --- ANALYTICS TRACKING MODULE (ISOLATED) ---
    // This module is completely independent and will not
    // affect any existing iframe/hydration/popup logic.
    // =====================================================

    /**
     * Initialize Analytics Module
     * - Tracks impressions (widget views)
     * - Tracks conversions (CTA clicks)
     * @param {string} spaceId - The space ID
     * @param {string} baseUrl - The API base URL
     */
    function initAnalyticsModule(spaceId, baseUrl) {
        try {
            // Prevent double initialization
            if (window.TF_ANALYTICS_INITIALIZED) return;
            window.TF_ANALYTICS_INITIALIZED = true;

            var trackUrl = baseUrl + '/api/track';

            // --- 1. IMPRESSION TRACKING (Smart Check) ---
            // Only fire impression if widget/popup is visible on this page.
            // This prevents tracking on pages like Login/Signup where widget isn't shown.
            //
            // DEV NOTE: To enable "Global Page Tracking" for all pages:
            // Uncomment the next line and comment out the visibility check
            // trackMetric(trackUrl, spaceId, 'impression', {});
            
            function checkAndTrackImpression() {
                try {
                    var widgetExists = document.getElementById('trustflow-widget') ||
                                       document.getElementById('tf-floating-launcher') ||
                                       document.querySelector('.trustflow-widget-container');
                    
                    // Also track if popups are enabled (even without visible widget)
                    var cfg = getConfig();
                    var popupsEnabled = cfg && window.TF_POPUPS_INITIALIZED;

                    if (widgetExists || popupsEnabled) {
                        // Track impression only once per session
                        var sessionKey = 'tf_impression_' + spaceId;
                        if (!sessionStorage.getItem(sessionKey)) {
                            trackMetric(trackUrl, spaceId, 'impression', {
                                url: window.location.href,
                                referrer: document.referrer || 'direct'
                            });
                            sessionStorage.setItem(sessionKey, '1');
                        }
                    }
                } catch (e) {
                    // Silent fail - never crash the widget
                }
            }

            // Run impression check after a short delay (let widget render)
            setTimeout(checkAndTrackImpression, 2000);

            // --- 2. CONVERSION TRACKING (Global Click Listener) ---
            // Uses capture phase (true) to catch clicks before they bubble
            // This ensures tracking works even in React/SPA apps with re-renders
            
            function setupConversionTracking() {
                try {
                    document.addEventListener('click', function(event) {
                        try {
                            var target = event.target;
                            if (!target) return;

                            // Walk up the DOM tree to find clicked element or parent
                            var clickedEl = target.closest ? target.closest('a, button, [role="button"]') : target;
                            if (!clickedEl) clickedEl = target;

                            // Get CTA selector from API (stored in fetchAndInitPopups)
                            // Fallback to data attribute if no custom selector
                            var ctaSelector = window.TF_CTA_SELECTOR || '[data-tf-conversion="true"]';
                            
                            // Check if clicked element matches the CTA selector
                            var isConversion = false;
                            
                            try {
                                // Check if the clicked element matches the selector
                                if (clickedEl.matches && clickedEl.matches(ctaSelector)) {
                                    isConversion = true;
                                }
                                // Also check parents (in case user clicks inner span/icon)
                                if (!isConversion && target.closest) {
                                    var matchingParent = target.closest(ctaSelector);
                                    if (matchingParent) {
                                        isConversion = true;
                                    }
                                }
                            } catch (selectorError) {
                                // Invalid selector - fallback to data attribute only
                                if (clickedEl.hasAttribute && clickedEl.hasAttribute('data-tf-conversion')) {
                                    isConversion = true;
                                }
                            }

                            if (isConversion) {
                                // --- NAVIGATION SAFETY FIX ---
                                // Use sendBeacon with Blob to ensure tracking completes
                                // even when user is immediately redirected
                                trackMetric(trackUrl, spaceId, 'conversion', {
                                    url: window.location.href,
                                    element: clickedEl.tagName || 'unknown',
                                    text: (clickedEl.innerText || '').substring(0, 50)
                                });
                            }
                        } catch (clickError) {
                            // Silent fail
                        }
                    }, true); // 'true' = capture phase for better SPA support
                } catch (e) {
                    // Silent fail
                }
            }

            setupConversionTracking();

            // --- 3. SPA NAVIGATION LOOP ---
            // Re-check for widget/CTA existence periodically
            // Handles React route changes without page reload
            var lastUrl = window.location.href;
            
            setInterval(function() {
                try {
                    var currentUrl = window.location.href;
                    if (currentUrl !== lastUrl) {
                        lastUrl = currentUrl;
                        // URL changed (SPA navigation) - recheck impression
                        // Clear session flag to allow new impression on new page
                        var sessionKey = 'tf_impression_' + spaceId;
                        sessionStorage.removeItem(sessionKey);
                        
                        // Delay to let new page render
                        setTimeout(checkAndTrackImpression, 1500);
                    }
                } catch (e) {
                    // Silent fail
                }
            }, 1000);

        } catch (initError) {
            // Analytics module failed - widget continues to work normally
            console.warn('TrustFlow Analytics: Init failed', initError);
        }
    }

    /**
     * Track a metric event
     * Uses navigator.sendBeacon with Blob for reliable delivery
     * even when page is navigating away
     * 
     * @param {string} url - The tracking endpoint URL
     * @param {string} spaceId - The space ID
     * @param {string} eventType - 'impression' or 'conversion'
     * @param {object} metadata - Additional event data
     */
    function trackMetric(url, spaceId, eventType, metadata) {
        try {
            var payload = {
                space_id: spaceId,
                event_type: eventType,
                metadata: metadata || {}
            };

            // Use sendBeacon for reliable delivery during navigation
            // Blob ensures Content-Type is application/json
            if (navigator.sendBeacon) {
                var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
            } else {
                // Fallback for older browsers
                var xhr = new XMLHttpRequest();
                xhr.open('POST', url, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(payload));
            }
        } catch (e) {
            // Silent fail - tracking should never break the widget
        }
    }

})();