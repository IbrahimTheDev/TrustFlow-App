(function() {
  // Find all TrustFlow widget scripts
  var scripts = document.querySelectorAll('script[data-space-id]');
  
  scripts.forEach(function(script) {
    var spaceId = script.getAttribute('data-space-id');
    var theme = script.getAttribute('data-theme') || 'light';
    var layout = script.getAttribute('data-layout') || 'grid';
    
    // Find the widget container
    var container = document.getElementById('trustflow-widget');
    if (!container) {
      // Create container if it doesn't exist
      container = document.createElement('div');
      container.id = 'trustflow-widget';
      script.parentNode.insertBefore(container, script.nextSibling);
    }
    
    // Create iframe
    var iframe = document.createElement('iframe');
    var baseUrl = script.src.replace('/embed.js', '');
    iframe.src = baseUrl + '/widget?spaceId=' + spaceId + '&theme=' + theme + '&layout=' + layout;
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.minHeight = '400px';
    iframe.scrolling = 'no';
    
    // Handle iframe resize
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'trustflow-resize') {
        iframe.style.height = event.data.height + 'px';
      }
    });
    
    container.appendChild(iframe);
  });
})();
