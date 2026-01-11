(function() {
    // --- 1. INSTANT STYLE INJECTION (Fixes White Glitch before Iframe Loads) ---
    var styleId = 'tf-embed-css';
    if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        // Force iframe to be transparent and prevent layout shift
        style.innerHTML = `
            .trustflow-widget-container { width: 100%; position: relative; z-index: 1; min-height: 150px; display: block; }
            .trustflow-widget-iframe { width: 100%; border: none; display: block; background: transparent !important; }
        /* --- TRUSTFLOW POPUP STYLES --- */
            .tf-popup-wrapper {
                position: fixed !important;
                z-index: 2147483647 !important;
                max-width: 320px !important;
                width: auto !important;
                font-family: 'Inter', sans-serif !important;
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
                color: #1e293b !important; /* Default Text Color */
            }
            
            /* DARK THEME SUPPORT */
            .tf-popup-card.tf-dark {
                background: rgba(15, 23, 42, 0.95) !important; /* Slate 900 */
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: #f8fafc !important; /* Light Text */
            }
            .tf-popup-card.tf-dark strong { color: #f8fafc !important; }
            .tf-popup-card.tf-dark p { color: #cbd5e1 !important; } /* Muted Text */

            .tf-popup-card.tf-active {
                opacity: 1 !important;
                transform: translateY(0) scale(1) !important;
            }

            /* MOBILE FIX: Corner Only */
            @media (max-width: 768px) {
                .tf-popup-wrapper {
                   max-width: 280px !important;
                   max-width: 100% !important; /* <--- YE GALAT HAI */
                   bottom: 15px !important;
                    /* User ki position setting (left/right) respect karega */
                }
                .tf-popup-card { width: auto !important; }
            }
        `;
        document.head.appendChild(style);
    }
  
    function initTrustFlow() {
      // Search for scripts that haven't been processed yet
      // We do NOT use a global flag here because in SPAs (Next.js), the global flag persists but the DOM changes.
      var scripts = document.querySelectorAll('script[data-space-id]');
      
      scripts.forEach(function(script) {
          // Safety Check: If we already injected the container next to this script, stop.
          if (script.nextElementSibling && script.nextElementSibling.classList.contains('trustflow-widget-container')) {
              return;
          }
          // If we are in "body" mode (floating), check if the launcher exists
          if (script.getAttribute('data-placement') === 'body' && document.getElementById('tf-floating-launcher')) {
              return;
          }
  
          var spaceId = script.getAttribute('data-space-id');
          var placement = script.getAttribute('data-placement') || 'section'; 
          
          // --- YOUR ORIGINAL ATTRIBUTE PARSING (PRESERVED) ---
          var theme = script.getAttribute('data-theme') || 'light';
          var layout = script.getAttribute('data-layout') || 'grid';
          var cardTheme = script.getAttribute('data-card-theme');
          var corners = script.getAttribute('data-corners');
          var shadow = script.getAttribute('data-shadow');
          var border = script.getAttribute('data-border');
          var hoverEffect = script.getAttribute('data-hover-effect');
          var nameSize = script.getAttribute('data-name-size');
          var testimonialStyle = script.getAttribute('data-testimonial-style');
          var animation = script.getAttribute('data-animation');
          var speed = script.getAttribute('data-animation-speed');
  
          // Construct Base Widget URL
          // Using dynamic detection for baseUrl to work in any env (localhost or prod)
          var src = script.src || '';
          var baseUrl = src.indexOf('/embed.js') > -1 ? src.replace('/embed.js', '') : 'https://trustflow-nu.vercel.app'; 
          
          var params = new URLSearchParams();
          params.append('theme', theme);
          params.append('layout', layout);
          if (cardTheme) params.append('card-theme', cardTheme);
          if (corners) params.append('corners', corners);
          if (shadow) params.append('shadow', shadow);
          if (border) params.append('border', border);
          if (hoverEffect) params.append('hover-effect', hoverEffect);
          if (nameSize) params.append('name-size', nameSize);
          if (testimonialStyle) params.append('testimonial-style', testimonialStyle);
          if (animation) params.append('animation', animation);
          if (speed) params.append('speed', speed);
  
          var widgetUrl = baseUrl + '/widget/' + spaceId + '?' + params.toString();
          if (!window.TF_POPUPS_INITIALIZED) {
            window.TF_POPUPS_INITIALIZED = true;
            fetchAndInitPopups(spaceId, baseUrl);
          }
  
          if (placement === 'body') {
              renderFloatingWidget(widgetUrl, theme);
          } else {
              renderInlineWidget(script, widgetUrl);
          }
      });
    }
  
    // --- RENDERING FUNCTIONS ---
  
    function renderInlineWidget(scriptNode, url) {
        var container = document.createElement('div');
        container.className = 'trustflow-widget-container';
        // Styles are handled by the injected CSS class above for cleaner DOM
        
        if (scriptNode.parentNode) {
            scriptNode.parentNode.insertBefore(container, scriptNode.nextSibling);
        }
  
        var iframe = createIframe(url);
        container.appendChild(iframe);
  
        // Smart Resize Listener
        window.addEventListener('message', function(event) {
            if (event.data.type === 'trustflow-resize') {
                iframe.style.height = event.data.height + 'px';
            }
        });
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
        iframe.className = 'trustflow-widget-iframe'; // Uses the transparent CSS class
        iframe.allowTransparency = "true";
        return iframe;
    }
    // --- TRUSTFLOW POPUP ENGINE (Safe & Isolated) ---
 // --- TRUSTFLOW POPUP ENGINE (With Live Updates & VIP Priority) ---
    
    // 1. GLOBAL VARIABLES (Ye sabse upar hona zaroori hai)
    var globalPopupQueue = [];
    var isLoopRunning = false;
    var lastNewestId = null;  // Track latest ID
    var priorityItem = null;  // VIP Item store karne ke liye

    function fetchAndInitPopups(spaceId, baseUrl) {
        var apiUrl = baseUrl + '/api/spaces/' + spaceId + '/public-data'; 

        // Function jo data layega (isFirstLoad parameter ke saath)
        var fetchData = function(isFirstLoad) {
            fetch(apiUrl)
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data && data.widget_settings && data.widget_settings.popupsEnabled) {
                        // Yahan hum isFirstLoad pass kar rahe hain
                        updateQueue(data.testimonials, isFirstLoad);
                        
                        if (!isLoopRunning) {
                            runPopupLoop(data.widget_settings);
                        }
                    }
                })
                .catch(function(err) {
                    console.warn('TF Popups: Background update failed', err);
                });
        };

        // 2. Initial Run (True pass kiya, matlab pehli baar)
        fetchData(true);

        // 3. Live Update (Polling) - Har 30 Seconds me check karega (False pass kiya)
        setInterval(function() {
            fetchData(false);
        }, 100); 
    }

    // Helper: Naye data ko existing queue me merge karna
    function updateQueue(newTestimonials, isFirstLoad) {
        if (!newTestimonials) return;
        
        // Sirf Liked Wale aur Sort kiye hue
        var freshList = newTestimonials
            .filter(function(t) { return t.is_liked; })
            .sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

        if (freshList.length > 0) {
            var newest = freshList[0];
            
            // VIP LOGIC: Agar ye pehli load nahi hai, aur ID nayi hai -> Priority Set karo
            if (isFirstLoad === false && lastNewestId && newest.id !== lastNewestId) {
                console.log("🔥 New Testimonial Detected! VIP Mode On.");
                priorityItem = newest; 
            }
            
            // Latest ID update karo
            lastNewestId = newest.id;
        }

        // Queue Update
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

                // --- 👑 VIP LOGIC (Loop Todne Wala Hisa) ---
                if (priorityItem) {
                    item = priorityItem;
                    priorityItem = null; // VIP dikha diya, ab clear karo
                    currentIndex = 0;    // Index reset taki flow bana rahe
                } else {
                    // Normal Loop
                    currentIndex = currentIndex % globalPopupQueue.length;
                    item = globalPopupQueue[currentIndex];
                }

                // --- 1. SETUP IMAGES (Only for Popups) ---
                // Ye fallback image code ke andar hi hai (SVG), internet na ho tab bhi chalegi
                var safeFallback = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z' /%3E%3C/svg%3E";

                // Asli photo try karo, nahi to UI Avatar, nahi to SafeFallback
                var avatarUrl = item.respondent_photo_url;
                if (!avatarUrl) {
                    avatarUrl = 'https://ui-avatars.com/api/?background=random&color=fff&name=' + encodeURIComponent(item.respondent_name);
                }

                var card = document.createElement('div');
                var isDark = settings.cardTheme === 'dark'; 
                card.className = 'tf-popup-card' + (isDark ? ' tf-dark' : ''); 
                
                // --- 2. HTML GENERATION (Only for Popups) ---
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
                            <strong style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;">${item.respondent_name}</strong>
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
                requestAnimationFrame(function() { setTimeout(function() { card.classList.add('tf-active'); }, 50); });

                // Schedule NEXT
                var duration = (settings.popupDuration || 5) * 1000;
                var gap = (settings.popupGap || 10) * 1000;

                setTimeout(function() {
                    if (card) card.classList.remove('tf-active'); // Animation OUT
                    setTimeout(function() {
                        // Agar VIP nahi tha tabhi index badhao
                        if (!priorityItem) {
                            currentIndex++;
                        }
                        showNextPopup();
                    }, gap);
                }, duration);

            } catch (err) {
                console.warn('TF Popup recovered', err);
                setTimeout(showNextPopup, 5000);
            }
        }

        setTimeout(showNextPopup, (settings.popupDelay || 2) * 1000);
    }
  
    // --- AUTO-INITIALIZATION & SELF-HEALING ---
    
    // 1. Run immediately (Standard HTML)
    initTrustFlow();
  
    // 2. Watch for DOM changes (React/Next.js/SPAs)
    // This is the "Magic" that makes it work everywhere. If React re-renders and adds the script again, we catch it.
    var observer = new MutationObserver(function(mutations) {
        initTrustFlow();
    });
    
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();