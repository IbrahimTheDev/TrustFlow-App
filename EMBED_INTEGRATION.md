# TrustFlow Embed.js - Integration Guide

## Quick Start

TrustFlow embed.js now works **everywhere** with a single line of code.

### Plain HTML / WordPress / Static Sites

```html
<script src="https://trustflow-nu.vercel.app/embed.js" data-space-id="your-space-id"></script>
```

### React / Next.js / Vue / Angular / Svelte

**Method 1: In public/index.html** (Recommended)
```html
<!-- public/index.html -->
<head>
  <script src="https://trustflow-nu.vercel.app/embed.js" data-space-id="your-space-id"></script>
</head>
```

**Method 2: In JSX Components** (Backup)
```jsx
function MyComponent() {
  return (
    <div data-trustflow-space-id="your-space-id" data-theme="light" />
  );
}
```

## Configuration Options

All options work with both methods:

```html
<!-- All options example -->
<script 
  src="https://trustflow-nu.vercel.app/embed.js"
  data-space-id="your-space-id"
  data-theme="light"              <!-- light or dark -->
  data-layout="grid"              <!-- grid, masonry, or list -->
  data-placement="section"        <!-- section (inline) or body (floating) -->
  data-card-theme="light"         <!-- light or dark -->
  data-corners="rounded"          <!-- rounded or sharp -->
  data-shadow="medium"            <!-- none, small, medium, or large -->
  data-border="subtle"            <!-- none, subtle, or bold -->
  data-hover-effect="lift"        <!-- none, lift, or glow -->
  data-name-size="medium"         <!-- small, medium, or large -->
  data-testimonial-style="card"   <!-- card or quote -->
  data-animation="fade"           <!-- none, fade, or slide -->
  data-animation-speed="normal"   <!-- slow, normal, or fast -->
></script>
```

## Widget Types

### 1. Inline Widget (Wall of Love)

```html
<script 
  src="https://trustflow-nu.vercel.app/embed.js" 
  data-space-id="xxx"
  data-placement="section"
></script>
```

### 2. Floating Widget (Modal)

```html
<script 
  src="https://trustflow-nu.vercel.app/embed.js" 
  data-space-id="xxx"
  data-placement="body"
></script>
```

## Features

### ✅ What's New (v4)

- **Universal Compatibility**: Works in React, Vue, Next.js, Angular, Svelte
- **Smart Timing**: Detects React hydration and waits for components to mount
- **Duplicate Prevention**: Won't render the same widget twice
- **Better Performance**: 99.7% reduction in API calls
- **CSS Isolation**: Won't conflict with your site's styles
- **Silent Errors**: Won't break your site if something goes wrong

### ✅ Preserved Features

- Inline widget rendering
- Floating widget with modal
- Popup notifications with VIP priority
- Pause on hover
- Dark theme support
- All customization options
- Responsive design

## Troubleshooting

### Widget not appearing?

1. **Check console**: Open browser DevTools (F12) and check for errors
2. **Verify space ID**: Make sure `data-space-id` is correct
3. **Wait a moment**: React components may take a few seconds to mount
4. **Check namespace**: In console, type `window.__TrustFlow_v4__` to see status

### Multiple widgets appearing?

This shouldn't happen anymore! The new version prevents duplicates. If you see duplicates:
1. Make sure you're using the latest embed.js
2. Check that you don't have multiple script tags with the same space-id
3. Clear browser cache

### Not working in React?

Try the div-based method:
```jsx
<div data-trustflow-space-id="your-space-id" data-theme="light" />
```

## Migration from Old Version

**Good news**: No action required! The new version is 100% backwards compatible.

All existing implementations will continue to work exactly as before.

## Technical Details

### How It Works

The embed script uses multiple detection methods:

1. **document.currentScript**: Fastest for plain HTML
2. **querySelectorAll('script[data-space-id]')**: Standard script tags
3. **querySelectorAll('[data-trustflow-space-id]')**: React JSX divs (NEW!)
4. **MutationObserver**: Watches for dynamically added elements
5. **Retry mechanism**: Catches late-mounting React components

### Timing Strategy

- Waits for `DOMContentLoaded` if document is still loading
- Uses `requestIdleCallback` for React hydration
- Debounces MutationObserver (300ms) for performance
- Retries up to 5 times for late components

### Namespace

All state is stored under `window.__TrustFlow_v4__`:
- `processedScripts`: Set of processed script elements
- `processedDivs`: Set of processed div elements
- `popupsInitialized`: Whether popup system is running

### CSS Isolation

All styles use `!important` and `tf-` prefix to prevent conflicts with your site's CSS.

## Performance

- **Initial Load**: ~26KB (minified: ~8KB)
- **API Polling**: Every 30 seconds (was 100ms)
- **Memory**: Minimal footprint
- **DOM Queries**: Debounced and optimized

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: Full support

## Support

For issues or questions:
1. Check the [GitHub repository](https://github.com/imaadidikshit/TrustFlow-App)
2. Open an issue with:
   - Your framework (React, Vue, plain HTML, etc.)
   - Browser and version
   - Console errors (if any)
   - Minimal reproduction example

## Changelog

### v4.0.0 (2026-01-12)

**Added:**
- React/Vue/Next.js support via div-based detection
- Smart timing with DOMContentLoaded and requestIdleCallback
- Namespace isolation (`__TrustFlow_v4__`)
- Duplicate prevention with `data-tf-done` attribute
- Debounced MutationObserver
- Retry mechanism for late components

**Fixed:**
- Polling interval (100ms → 30000ms)
- CSS isolation with !important
- Error handling (silent failures)
- Mobile CSS bug

**Changed:**
- Class names: `trustflow-*` → `tf-*`
- Error messages now include HTTP status codes

**Preserved:**
- All existing features
- 100% backwards compatibility
- All customization options

---

**One line. Works everywhere.** 🚀
