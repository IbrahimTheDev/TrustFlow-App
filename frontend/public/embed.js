(function() {
    'use strict';
    
    // --- NAMESPACE ISOLATION ---
    // Prevent conflicts with other scripts
    window.__TrustFlow_v4__ = window.__TrustFlow_v4__ || {
        initialized: false,
        processedScripts: new Set(),
        processedDivs: new Set(),
        popupsInitialized: false,
        retryAttempts: new Map()
    };
    
    var TF = window.__TrustFlow_v4__;
    
    // --- 1. INSTANT STYLE INJECTION (Fixes White Glitch before Iframe Loads) ---
    var styleId = 'tf-embed-css';
    if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        // Force iframe to be transparent and prevent layout shift - All styles with !important for CSS isolation
        style.innerHTML = `
            .tf-widget-container { width: 100% !important; position: relative !important; z-index: 1 !important; min-height: 150px !important; display: block !important; }
            .tf-widget-iframe { width: 100% !important; border: none !important; display: block !important; background: transparent !important; }
        /* --- TRUSTFLOW POPUP STYLES --- */
            .tf-popup-wrapper {
                position: fixed !important;
                z-index: 2147483647 !important;
                max-width: 320px !important;
                width: auto !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                pointer-events: none !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
                transition: all 0.5s ease !important;
            }
            /* Positioning */
            .tf-popup-bottom-left { bottom: 20px !important; left: 20px !important; }
            .tf-popup-bottom-right { bottom: 20px !important; right: 20px !important; }

            /* Card Design */
            .tf-popup-card {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.5) !important;
                box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.15) !important;
                border-radius: 16px !important;
                padding: 12px 16px !important;
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                pointer-events: auto !important;
                cursor: default !important;
                opacity: 0 !important;
                transform: translateY(20px) scale(0.95) !important;
                transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
                color: #1e293b !important;
            }
            
            /* DARK THEME SUPPORT */
            .tf-popup-card.tf-dark {
                background: rgba(15, 23, 42, 0.95) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: #f8fafc !important;
            }
            .tf-popup-card.tf-dark strong { color: #f8fafc !important; }
            .tf-popup-card.tf-dark p { color: #cbd5e1 !important; }

            .tf-popup-card.tf-active {
                opacity: 1 !important;
                transform: translateY(0) scale(1) !important;
            }

            /* MOBILE FIX */
            @media (max-width: 768px) {
                .tf-popup-wrapper {
                   max-width: 280px !important;
                   bottom: 15px !important;
                }
                .tf-popup-card { width: auto !important; }
            }
        `;
        document.head.appendChild(style);
    }
  
    // --- MULTI-METHOD DETECTION & INITIALIZATION ---
    function initTrustFlow() {
        try {
            // Method 1: Process script tags with data-space-id
            processScriptTags();
            
            // Method 2: Process div elements with data-trustflow-space-id (React JSX fallback)
            processDivTags();
        } catch (err) {
            // Silent failure - don't break client sites
            if (console && console.warn) {
                console.warn('TrustFlow: Initialization error', err);
            }
        }
    }
    
    function processScriptTags() {
        // Find all script tags with data-space-id
        var scripts = document.querySelectorAll('script[data-space-id]:not([data-tf-done])');
        
        scripts.forEach(function(script) {
            try {
                var scriptId = script.src + script.getAttribute('data-space-id');
                
                // Check if already processed using namespace tracking
                if (TF.processedScripts.has(scriptId)) {
                    return;
                }
                
                // Mark as processing
                script.setAttribute('data-tf-done', 'true');
                TF.processedScripts.add(scriptId);
                
                // Safety Check: If we already injected the container next to this script, stop
                if (script.nextElementSibling && script.nextElementSibling.classList.contains('tf-widget-container')) {
                    return;
                }
                
                var placement = script.getAttribute('data-placement') || 'section';
                
                // If we are in "body" mode (floating), check if the launcher exists
                if (placement === 'body' && document.getElementById('tf-floating-launcher')) {
                    return;
                }
                
                var config = extractConfig(script);
                initWidget(config, script, null);
            } catch (err) {
                if (console && console.warn) {
                    console.warn('TrustFlow: Script processing error', err);
                }
            }
        });
    }
    
    function processDivTags() {
        // Find all div elements with data-trustflow-space-id (React JSX support)
        var divs = document.querySelectorAll('[data-trustflow-space-id]:not([data-tf-done])');
        
        divs.forEach(function(div) {
            try {
                var divId = div.getAttribute('data-trustflow-space-id');
                
                // Check if already processed
                if (TF.processedDivs.has(divId)) {
                    return;
                }
                
                // Mark as processing
                div.setAttribute('data-tf-done', 'true');
                TF.processedDivs.add(divId);
                
                // Check if already has iframe
                if (div.querySelector('.tf-widget-iframe')) {
                    return;
                }
                
                var config = extractConfig(div);
                config.spaceId = divId; // Override with div's space id
                initWidget(config, null, div);
            } catch (err) {
                if (console && console.warn) {
                    console.warn('TrustFlow: Div processing error', err);
                }
            }
        });
    }
    
    function extractConfig(element) {
        // Extract configuration from data attributes
        return {
            spaceId: element.getAttribute('data-space-id') || element.getAttribute('data-trustflow-space-id'),
            placement: element.getAttribute('data-placement') || 'section',
            theme: element.getAttribute('data-theme') || 'light',
            layout: element.getAttribute('data-layout') || 'grid',
            cardTheme: element.getAttribute('data-card-theme'),
            corners: element.getAttribute('data-corners'),
            shadow: element.getAttribute('data-shadow'),
            border: element.getAttribute('data-border'),
            hoverEffect: element.getAttribute('data-hover-effect'),
            nameSize: element.getAttribute('data-name-size'),
            testimonialStyle: element.getAttribute('data-testimonial-style'),
            animation: element.getAttribute('data-animation'),
            speed: element.getAttribute('data-animation-speed'),
            src: element.src || ''
        };
    }
    
    function initWidget(config, scriptNode, divNode) {
        var spaceId = config.spaceId;
        if (!spaceId) return;
        
        // Construct Base Widget URL
        // Using dynamic detection for baseUrl to work in any env (localhost or prod)
        var baseUrl = config.src.indexOf('/embed.js') > -1 
            ? config.src.replace('/embed.js', '') 
            : 'https://trustflow-nu.vercel.app';
        
        var params = new URLSearchParams();
        params.append('theme', config.theme);
        params.append('layout', config.layout);
        if (config.cardTheme) params.append('card-theme', config.cardTheme);
        if (config.corners) params.append('corners', config.corners);
        if (config.shadow) params.append('shadow', config.shadow);
        if (config.border) params.append('border', config.border);
        if (config.hoverEffect) params.append('hover-effect', config.hoverEffect);
        if (config.nameSize) params.append('name-size', config.nameSize);
        if (config.testimonialStyle) params.append('testimonial-style', config.testimonialStyle);
        if (config.animation) params.append('animation', config.animation);
        if (config.speed) params.append('speed', config.speed);
        
        var widgetUrl = baseUrl + '/widget/' + spaceId + '?' + params.toString();
        
        // Initialize popups only once
        if (!TF.popupsInitialized) {
            TF.popupsInitialized = true;
            fetchAndInitPopups(spaceId, baseUrl);
        }
        
        if (config.placement === 'body') {
            renderFloatingWidget(widgetUrl, config.theme);
        } else {
            renderInlineWidget(scriptNode || divNode, widgetUrl);
        }
    }
  
    // --- RENDERING FUNCTIONS ---
  
    function renderInlineWidget(node, url) {
        var container = document.createElement('div');
        container.className = 'tf-widget-container';
        
        if (node.parentNode) {
            // For script tags, insert after; for divs, insert inside
            if (node.tagName === 'SCRIPT') {
                node.parentNode.insertBefore(container, node.nextSibling);
            } else {
                // For div tags, append inside
                node.appendChild(container);
            }
        }
  
        var iframe = createIframe(url);
        container.appendChild(iframe);
  
        // Smart Resize Listener
        if (!TF.messageListenerAdded) {
            TF.messageListenerAdded = true;
            window.addEventListener('message', function(event) {
                try {
                    if (event.data.type === 'trustflow-resize') {
                        var iframes = document.querySelectorAll('.tf-widget-iframe');
                        iframes.forEach(function(ifr) {
                            if (ifr.contentWindow === event.source) {
                                ifr.style.height = event.data.height + 'px';
                            }
                        });
                    }
                } catch (err) {
                    // Silent failure
                }
            });
        }
    }
  
    function renderFloatingWidget(url, theme) {
        var isDark = theme === 'dark';
        
        // Launcher Button
        var launcher = document.createElement('div');
        launcher.id = 'tf-floating-launcher'; // ID to prevent duplicates
        Object.assign(launcher.style, {
            position: 'fixed', bottom: '20px', right: '20px', width: '60px', height: '60px',
            borderRadius: '30px', backgroundColor: isDark ? '#1e293b' : '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', zIndex: '2147483647',
            transition: 'transform 0.2s ease', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
        });
        launcher.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        
        // Overlay
        var overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '2147483647', display: 'none',
            alignItems: 'center', justifyContent: 'center', opacity: '0',
            transition: 'opacity 0.3s ease', backdropFilter: 'blur(4px)'
        });
  
        // Modal Content
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
  
        // Assemble
        header.appendChild(title); header.appendChild(closeBtn);
        iframeContainer.appendChild(iframe);
        modalContent.appendChild(header); modalContent.appendChild(iframeContainer);
        overlay.appendChild(modalContent);
        document.body.appendChild(launcher);
        document.body.appendChild(overlay);
  
        // Interactions
        launcher.onclick = function() { overlay.style.display = 'flex'; setTimeout(function() { overlay.style.opacity = '1'; }, 10); };
        var closeAction = function() { overlay.style.opacity = '0'; setTimeout(function() { overlay.style.display = 'none'; }, 300); };
        closeBtn.onclick = closeAction;
        overlay.onclick = function(e) { if (e.target === overlay) closeAction(); };
    }
  
    function createIframe(url) {
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.className = 'tf-widget-iframe';
        iframe.allowTransparency = "true";
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.display = 'block';
        iframe.style.background = 'transparent';
        return iframe;
    }
    // --- TRUSTFLOW POPUP ENGINE (With Live Updates & VIP Priority) ---
    
    // Global Variables for popup management
    var globalPopupQueue = [];
    var isLoopRunning = false;
    var lastNewestId = null;
    var priorityItem = null;

    function fetchAndInitPopups(spaceId, baseUrl) {
        var apiUrl = baseUrl + '/api/spaces/' + spaceId + '/public-data'; 

        // Function to fetch data with first-load flag
        var fetchData = function(isFirstLoad) {
            fetch(apiUrl)
                .then(function(res) { 
                    if (!res.ok) throw new Error('Network response failed: ' + res.status + ' ' + res.statusText);
                    return res.json(); 
                })
                .then(function(data) {
                    if (data && data.widget_settings && data.widget_settings.popupsEnabled) {
                        updateQueue(data.testimonials, isFirstLoad);
                        
                        if (!isLoopRunning) {
                            runPopupLoop(data.widget_settings);
                        }
                    }
                })
                .catch(function(err) {
                    // Silent failure - don't break client sites
                    if (console && console.warn) {
                        console.warn('TrustFlow: Popup fetch failed', err);
                    }
                });
        };

        // Initial Run (first load = true)
        fetchData(true);

        // Live Update (Polling) - Every 30 seconds (FIXED from 100ms)
        setInterval(function() {
            fetchData(false);
        }, 30000); // 30 seconds = 30000ms
    }

    // Helper: Merge new data into existing queue
    function updateQueue(newTestimonials, isFirstLoad) {
        if (!newTestimonials) return;
        
        // Only liked testimonials, sorted by creation date
        var freshList = newTestimonials
            .filter(function(t) { return t.is_liked; })
            .sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

        if (freshList.length > 0) {
            var newest = freshList[0];
            
            // VIP LOGIC: If not first load and ID is new -> Set Priority
            if (isFirstLoad === false && lastNewestId && newest.id !== lastNewestId) {
                priorityItem = newest; 
            }
            
            // Update latest ID
            lastNewestId = newest.id;
        }

        // Update Queue
        globalPopupQueue = freshList; 
    }

    function runPopupLoop(settings) {
        if (isLoopRunning) return; 
        isLoopRunning = true;

        var wrapperId = 'tf-popup-root';
        if (document.getElementById(wrapperId)) return;

        var wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.className = 'tf-popup-wrapper tf-popup-' + (settings.popupPosition || 'bottom-left');
        document.body.appendChild(wrapper);

        var currentIndex = 0;
        var isPaused = false;

        function showNextPopup() {
            if (!document.body.contains(wrapper)) {
                isLoopRunning = false;
                return; 
            }
            
            if (globalPopupQueue.length === 0) {
                return setTimeout(showNextPopup, 5000);
            }

            if (isPaused) return setTimeout(showNextPopup, 1000);

            try {
                var item;

                // VIP LOGIC: Priority item interrupts normal loop
                if (priorityItem) {
                    item = priorityItem;
                    priorityItem = null;
                    currentIndex = 0;
                } else {
                    // Normal Loop
                    currentIndex = currentIndex % globalPopupQueue.length;
                    item = globalPopupQueue[currentIndex];
                }

                // Fallback image (base64 SVG - works offline)
                var safeFallback = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z' /%3E%3C/svg%3E";

                // Try photo, fallback to UI Avatar, then safeFallback
                var avatarUrl = item.respondent_photo_url;
                if (!avatarUrl) {
                    avatarUrl = 'https://ui-avatars.com/api/?background=random&color=fff&name=' + encodeURIComponent(item.respondent_name || 'Anonymous');
                }

                var card = document.createElement('div');
                var isDark = settings.cardTheme === 'dark'; 
                card.className = 'tf-popup-card' + (isDark ? ' tf-dark' : ''); 
                
                // Card HTML
                card.innerHTML = `
                    <div style="position:relative; flex-shrink:0;">
                        <img src="${avatarUrl}" 
                             alt="User"
                             style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.1); display:block; background-color: #f1f5f9;"
                             onerror="this.onerror=null; this.src='${safeFallback}';">
                        <div style="position:absolute; bottom:-2px; right:-2px; background:#10b981; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>
                    </div>
                    <div style="display:flex; flex-direction:column; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <strong style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;">${item.respondent_name || 'Anonymous'}</strong>
                            <div style="display:flex; color:#fbbf24; font-size:12px;">${'★'.repeat(item.rating || 5)}</div>
                        </div>
                        <p style="font-size:12px; margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3;">${item.content || ''}</p>
                        <div style="font-size:10px; opacity:0.7; margin-top:4px; font-weight:500;">
                            ${settings.popupMessage || 'Verified Customer'} <span style="opacity:0.5">•</span> Just now
                        </div>
                    </div>
                `;

                card.onmouseenter = function() { isPaused = true; };
                card.onmouseleave = function() { isPaused = false; };

                wrapper.innerHTML = '';
                wrapper.appendChild(card);

                // Animation IN
                requestAnimationFrame(function() { 
                    setTimeout(function() { 
                        card.classList.add('tf-active'); 
                    }, 50); 
                });

                // Schedule NEXT
                var duration = (settings.popupDuration || 5) * 1000;
                var gap = (settings.popupGap || 10) * 1000;

                setTimeout(function() {
                    if (card) card.classList.remove('tf-active');
                    setTimeout(function() {
                        // Only increment if not VIP
                        if (!priorityItem) {
                            currentIndex++;
                        }
                        showNextPopup();
                    }, gap);
                }, duration);

            } catch (err) {
                // Silent recovery
                if (console && console.warn) {
                    console.warn('TrustFlow: Popup display error', err);
                }
                setTimeout(showNextPopup, 5000);
            }
        }

        setTimeout(showNextPopup, (settings.popupDelay || 2) * 1000);
    }
  
    // --- AUTO-INITIALIZATION & SELF-HEALING ---
    
    // Debounced initialization to prevent excessive calls
    var initTimer = null;
    var initDebounceMs = 300;
    
    function debouncedInit() {
        if (initTimer) {
            clearTimeout(initTimer);
        }
        initTimer = setTimeout(function() {
            initTrustFlow();
        }, initDebounceMs);
    }
    
    // Smart initialization with proper timing
    function smartInit() {
        // Method 1: Use document.currentScript if available (immediate execution)
        if (document.currentScript && document.currentScript.getAttribute('data-space-id')) {
            initTrustFlow();
        }
        
        // Method 2: Wait for DOM if still loading
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                // Use requestIdleCallback for React hydration if available, otherwise setTimeout
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(function() {
                        initTrustFlow();
                    });
                } else {
                    setTimeout(initTrustFlow, 100);
                }
            });
        } else {
            // DOM already loaded - use requestIdleCallback for React hydration
            if (window.requestIdleCallback) {
                window.requestIdleCallback(function() {
                    initTrustFlow();
                });
            } else {
                setTimeout(initTrustFlow, 100);
            }
        }
        
        // Method 3: Watch for DOM changes (React/Next.js/SPAs) with debouncing
        // This is the "Magic" that makes it work everywhere
        if (typeof MutationObserver !== 'undefined' && document.body) {
            var observer = new MutationObserver(function(mutations) {
                debouncedInit();
            });
            
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
        }
    }
    
    // Execute smart initialization
    smartInit();
    
    // Retry mechanism for React components that haven't mounted yet
    var maxRetries = 5;
    var retryDelay = 500;
    var retryCount = 0;
    
    function retryInit() {
        if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(function() {
                var hasPendingElements = document.querySelectorAll('script[data-space-id]:not([data-tf-done])').length > 0 ||
                                        document.querySelectorAll('[data-trustflow-space-id]:not([data-tf-done])').length > 0;
                if (hasPendingElements) {
                    initTrustFlow();
                    retryInit(); // Continue retrying
                }
            }, retryDelay * retryCount);
        }
    }
    
    // Start retry mechanism after initial delay
    setTimeout(retryInit, 1000);
})();