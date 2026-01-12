(function() {
    "use strict";

    // --- 1. CONFIGURATION & STATE ---
    var config = null; 
    var isWidgetRendered = false; 

    // --- 2. CSS STYLES (Styles wahi purane hain) ---
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
                .tf-popup-wrapper { max-width: 100% !important; bottom: 15px !important; }
                .tf-popup-card { width: auto !important; }
            }
        `;
        document.head.appendChild(style);
    }

    // --- 3. AUTO-DETECT CONFIGURATION (No Hardcoding) ---
    function getConfig() {
        if (config) return config;
        
        var script = document.querySelector('script[data-space-id]');
        if (!script) return null;

        var spaceId = script.getAttribute('data-space-id');
        
        // Auto-Detect Logic: Jahan se script load hui, wahi Base URL hai
        var scriptSrc = script.src || '';
        var baseUrl = scriptSrc.indexOf('/embed.js') > -1 ? scriptSrc.replace('/embed.js', '') : '';
        
        // Fallback for safety
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

    // --- 4. CORE ENGINE (With React Fix) ---
    function initTrustFlow() {
        var cfg = getConfig();
        if (!cfg) return;

        // FIX: Prevent double popups (check if inside iframe)
        if (window.self === window.top) {
            if (!window.TF_POPUPS_INITIALIZED) {
                window.TF_POPUPS_INITIALIZED = true;
                fetchAndInitPopups(cfg.spaceId, cfg.baseUrl, cfg);
            }
        }

        if (isWidgetRendered) return; 

        // 1. Floating Widget
        if (cfg.placement === 'body') {
            if (!document.getElementById('tf-floating-launcher')) {
                renderFloatingWidget(cfg.widgetUrl, cfg.theme);
                isWidgetRendered = true;
            }
            return;
        }

        // 2. Targeted DIV (REACT FIX)
        var targetDiv = document.getElementById('trustflow-widget');
        if (targetDiv) {
            if (!targetDiv.hasChildNodes()) {
                // console.log("TF: Widget injected via Target DIV");
                renderInsideDiv(targetDiv, cfg.widgetUrl);
                isWidgetRendered = true;
            }
            return;
        }

        // 3. Inline Script (HTML Normal Mode)
        if (cfg.scriptElement.parentNode && cfg.scriptElement.parentNode.tagName !== 'HEAD') {
            if (cfg.scriptElement.nextElementSibling && cfg.scriptElement.nextElementSibling.classList.contains('trustflow-widget-container')) {
                isWidgetRendered = true; 
                return;
            }
            renderInlineWidget(cfg.scriptElement, cfg.widgetUrl);
            isWidgetRendered = true;
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

    // --- POPUP LOGIC (Shuffle + VIP) ---
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
        var cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
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
            // VIP Logic: Agar load ke baad koi naya aaya
            if (isFirstLoad === false && lastNewestId && newest.id !== lastNewestId) {
                priorityItem = newest; 
                globalPopupQueue.push(newest); // Add to queue for future
            }
            // First Load: Shuffle everything
            if (isFirstLoad) {
                globalPopupQueue = shuffleArray(rawList);
            }
            lastNewestId = newest.id;
        }
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
            if (globalPopupQueue.length === 0) { return setTimeout(showNextPopup, 5000); }
            if (isPaused) return setTimeout(showNextPopup, 1000);

            try {
                var item;
                // VIP Check
                if (priorityItem) {
                    item = priorityItem;
                    priorityItem = null; 
                    // Note: currentIndex reset nahi kiya
                } else {
                    // Loop End Check -> Reshuffle
                    if (currentIndex >= globalPopupQueue.length) {
                        globalPopupQueue = shuffleArray(globalPopupQueue);
                        currentIndex = 0;
                    }
                    item = globalPopupQueue[currentIndex];
                    currentIndex++;
                }

                var safeFallback = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z' /%3E%3C/svg%3E";
                var avatarUrl = item.respondent_photo_url;
                if (!avatarUrl) { avatarUrl = 'https://ui-avatars.com/api/?background=random&color=fff&name=' + encodeURIComponent(item.respondent_name); }

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

    function renderFloatingWidget(url, theme) {
        var isDark = theme === 'dark';
        var launcher = document.createElement('div');
        launcher.id = 'tf-floating-launcher';
        Object.assign(launcher.style, {
            position: 'fixed', bottom: '20px', right: '20px', width: '60px', height: '60px',
            borderRadius: '30px', backgroundColor: isDark ? '#1e293b' : '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', zIndex: '2147483647',
            transition: 'transform 0.2s ease', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
        });
        launcher.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        var overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '2147483647', display: 'none',
            alignItems: 'center', justifyContent: 'center', opacity: '0',
            transition: 'opacity 0.3s ease', backdropFilter: 'blur(4px)'
        });
        var modalContent = document.createElement('div');
        Object.assign(modalContent.style, {
            width: '90%', maxWidth: '1000px', maxHeight: '85vh',
            backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden',
            position: 'relative', display: 'flex', flexDirection: 'column'
        });
        var header = document.createElement('div');
        Object.assign(header.style, { padding: '16px 24px', borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
        var title = document.createElement('h3');
        title.innerText = "Wall of Love";
        Object.assign(title.style, { margin: '0', fontFamily: 'sans-serif', fontWeight: '600', color: isDark ? '#f8fafc' : '#0f172a' });
        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        Object.assign(closeBtn.style, { background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#64748b' });
        var iframeContainer = document.createElement('div');
        Object.assign(iframeContainer.style, { flex: '1', overflowY: 'auto', padding: '0', WebkitOverflowScrolling: 'touch' });
        var iframe = createIframe(url);
        iframe.style.minHeight = '400px'; 
        iframe.style.height = '100%'; 
        header.appendChild(title); header.appendChild(closeBtn);
        iframeContainer.appendChild(iframe);
        modalContent.appendChild(header); modalContent.appendChild(iframeContainer);
        overlay.appendChild(modalContent);
        document.body.appendChild(launcher);
        document.body.appendChild(overlay);
        launcher.onclick = function() { overlay.style.display = 'flex'; setTimeout(function() { overlay.style.opacity = '1'; }, 10); };
        var closeAction = function() { overlay.style.opacity = '0'; setTimeout(function() { overlay.style.display = 'none'; }, 300); };
        closeBtn.onclick = closeAction;
        overlay.onclick = function(e) { if (e.target === overlay) closeAction(); };
    }

    // --- INITIALIZATION ---
    initTrustFlow();
    setInterval(initTrustFlow, 1000);

})();