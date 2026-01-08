(function() {
  function initTrustFlow() {
    // Find all TrustFlow widget scripts that haven't been initialized yet
    var scripts = document.querySelectorAll('script[data-space-id]:not([data-tf-initialized])');
    
    scripts.forEach(function(script) {
        script.setAttribute('data-tf-initialized', 'true');

        var spaceId = script.getAttribute('data-space-id');
        var placement = script.getAttribute('data-placement') || 'section'; 
        
        // --- 1. RESTORED ALL ATTRIBUTE PARSING ---
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
        var baseUrl = script.src.replace('/embed.js', ''); 
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
      Object.assign(container.style, {
          width: '100%',
          position: 'relative',
          zIndex: '1',
          minHeight: '150px', // Prevents layout collapse while loading
          display: 'block'
      });
      
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
      iframe.style.width = '100%';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      iframe.style.backgroundColor = 'transparent'; 
      iframe.allowTransparency = "true";
      return iframe;
  }

  // --- AUTO-INITIALIZATION (Supports Dynamic Frameworks) ---
  // 1. Run immediately
  initTrustFlow();

  // 2. Watch for DOM changes (Fixes React/Next.js client-side navigation)
  // This observer detects when a new script tag is injected by a router
  var observer = new MutationObserver(function(mutations) {
      initTrustFlow();
  });
  
  if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
  } else {
      window.addEventListener('load', function() {
          observer.observe(document.body, { childList: true, subtree: true });
      });
  }

})();