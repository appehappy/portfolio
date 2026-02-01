/**
 * Page Transition
 *
 * In-page transition between homepage and writing page: fade out, animate lanes, swap content, fade in.
 * Intercepts internal links and uses fetch + History API.
 */

(function() {
  var DESKTOP_MQ = '(min-width: 769px)';
  var FADE_DURATION_MS = 300;
  var LANE_DURATION_MS = 600;

  function getPageFrame() {
    return document.querySelector('.page-frame');
  }

  function isWritingPage() {
    return document.querySelector('.page-frame.writing-page') !== null;
  }

  function isInternalLink(link) {
    try {
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || link.target === '_blank' || link.hasAttribute('download')) return false;
      var linkUrl = new URL(link.href, window.location.href);
      var baseUrl = new URL(window.location.origin);
      return linkUrl.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function getTransitionTarget(link) {
    try {
      var pathname = new URL(link.href, window.location.href).pathname;
      if (pathname.endsWith('writing.html') || pathname === '/writing' || pathname.endsWith('/writing')) return 'writing';
      if (pathname === '/' || pathname === '' || pathname.endsWith('/index.html') || pathname.endsWith('/')) return 'home';
      return null;
    } catch (e) {
      return null;
    }
  }

  function waitForTransition(element, propertyName, fallbackMs) {
    return new Promise(function(resolve) {
      var timeout = setTimeout(function() { resolve(); }, fallbackMs);
      function onEnd(e) {
        if (propertyName && e.propertyName !== propertyName) return;
        element.removeEventListener('transitionend', onEnd);
        clearTimeout(timeout);
        resolve();
      }
      element.addEventListener('transitionend', onEnd);
    });
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  var FIRST_GRIDLINE_PX = 244;
  var LANE_ANIMATION_MS = 680;

  function animateLanesToWriting(frame, durationMs) {
    durationMs = durationMs || LANE_ANIMATION_MS;
    return new Promise(function(resolve) {
      var rect = frame.getBoundingClientRect();
      var w = rect.width;
      var centerPx = w * 0.5;
      var start = { l1: w * 0.25, l2: w * 0.5, l3: w * 0.75 };
      var end = { l1: w * -0.05, l2: FIRST_GRIDLINE_PX, l3: centerPx };
      var startTime = null;
      function tick(timestamp) {
        if (startTime === null) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var t = Math.min(elapsed / durationMs, 1);
        var eased = easeInOutCubic(t);
        if (t >= 1) {
          frame.style.setProperty('--line-1', '-5%');
          frame.style.setProperty('--line-2', FIRST_GRIDLINE_PX + 'px');
          frame.style.setProperty('--line-3', centerPx + 'px');
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              resolve(centerPx);
            });
          });
          return;
        }
        var l1 = start.l1 + (end.l1 - start.l1) * eased;
        var l2 = start.l2 + (end.l2 - start.l2) * eased;
        var l3 = start.l3 + (end.l3 - start.l3) * eased;
        frame.style.setProperty('--line-1', l1 + 'px');
        frame.style.setProperty('--line-2', l2 + 'px');
        frame.style.setProperty('--line-3', l3 + 'px');
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function transitionToWriting(link) {
    var frame = getPageFrame();
    if (!frame) return;

    var isDesktop = window.matchMedia(DESKTOP_MQ).matches;
    var writingUrl = new URL(link.href, window.location.href).href;

    frame.classList.add('page-transition-out');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    var fadeTarget = frame.querySelector('.text-columns, .grid-field');
    if (!fadeTarget) fadeTarget = frame;
    waitForTransition(fadeTarget, 'opacity', FADE_DURATION_MS).then(function() {
      if (isDesktop) {
        return animateLanesToWriting(frame);
      }
      return null;
    }).then(function(centerPx) {
      var head = document.head;
      if (!head.querySelector('link[href*="writing.css"]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'styles/writing.css';
        return new Promise(function(resolve, reject) {
          link.onload = function() { resolve(centerPx); };
          link.onerror = function() { resolve(centerPx); };
          head.appendChild(link);
        });
      }
      return centerPx;
    }).then(function(centerPx) {
      return fetch(writingUrl).then(function(res) {
        if (!res.ok) throw new Error('Fetch failed');
        return res.text();
      }).then(function(html) {
        return { html: html, centerPx: centerPx };
      });
    }).then(function(data) {
      var html = data.html;
      var centerPx = data.centerPx;
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      var body = doc.body;
      var scriptRefs = Array.prototype.map.call(body.querySelectorAll('script[src]'), function(s) {
        return { src: s.src, async: s.async, defer: s.defer };
      });
      body.querySelectorAll('script').forEach(function(s) { s.remove(); });
      var bodyHTML = body.innerHTML;

      document.body.innerHTML = bodyHTML;

      var newFrame = getPageFrame();
      if (newFrame) {
        newFrame.classList.add('page-transition-in');
        if (centerPx != null) {
          newFrame.style.setProperty('--writing-gridline-2', centerPx + 'px');
        }
      }

      var newTitle = doc.querySelector('title');
      if (newTitle) document.title = newTitle.textContent;

      scriptRefs.forEach(function(ref) {
        var newScript = document.createElement('script');
        newScript.src = ref.src;
        if (ref.async) newScript.async = true;
        if (ref.defer) newScript.defer = true;
        document.body.appendChild(newScript);
      });

      if (newFrame) {
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            newFrame.classList.add('page-transition-in-visible');
            var fadeInTarget = newFrame.querySelector('.article-list-container, .article-content');
            if (!fadeInTarget) fadeInTarget = newFrame;
            waitForTransition(fadeInTarget, 'opacity', FADE_DURATION_MS).then(function() {
              newFrame.classList.remove('page-transition-in', 'page-transition-in-visible');
              document.documentElement.style.overflow = '';
              document.body.style.overflow = '';
            });
          });
        });
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }

      if (!document.head.querySelector('link[href*="writing.css"]')) {
        var wlink = document.createElement('link');
        wlink.rel = 'stylesheet';
        wlink.href = 'styles/writing.css';
        document.head.appendChild(wlink);
      }

      var path = new URL(writingUrl, window.location.href).pathname || '/writing.html';
      if (path === '/' || path === '') path = '/writing.html';
      history.pushState({ page: 'writing' }, '', path);
    }).catch(function() {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      window.location.href = writingUrl;
    });
  }

  function transitionToHome(link) {
    var frame = getPageFrame();
    if (!frame) return;

    var homeUrl = new URL(link.href, window.location.href).href;

    frame.classList.add('page-transition-out');

    var fadeTarget = frame.querySelector('.article-list-container, .article-content');
    if (!fadeTarget) fadeTarget = frame;
    waitForTransition(fadeTarget, 'opacity', FADE_DURATION_MS).then(function() {
      return fetch(homeUrl).then(function(res) {
        if (!res.ok) throw new Error('Fetch failed');
        return res.text();
      });
    }).then(function(html) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      var body = doc.body;
      var scriptRefs = Array.prototype.map.call(body.querySelectorAll('script[src]'), function(s) {
        return { src: s.src, async: s.async, defer: s.defer };
      });
      body.querySelectorAll('script').forEach(function(s) { s.remove(); });
      document.body.innerHTML = body.innerHTML;

      var newFrame = getPageFrame();
      if (newFrame) {
        newFrame.classList.add('page-transition-in');
      }

      var newTitle = doc.querySelector('title');
      if (newTitle) document.title = newTitle.textContent;

      scriptRefs.forEach(function(ref) {
        var newScript = document.createElement('script');
        newScript.src = ref.src;
        if (ref.async) newScript.async = true;
        if (ref.defer) newScript.defer = true;
        document.body.appendChild(newScript);
      });

      var writingLink = document.head.querySelector('link[href*="writing.css"]');
      if (writingLink) writingLink.remove();

      if (newFrame) {
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            newFrame.classList.add('page-transition-in-visible');
            var fadeInTarget = newFrame.querySelector('.text-columns, .grid-field');
            if (!fadeInTarget) fadeInTarget = newFrame;
            waitForTransition(fadeInTarget, 'opacity', FADE_DURATION_MS).then(function() {
              newFrame.classList.remove('page-transition-in', 'page-transition-in-visible');
            });
          });
        });
      }

      function runHomeAlignment() {
        if (typeof window.alignTextToIllustration === 'function') {
          window.alignTextToIllustration();
          requestAnimationFrame(function() { window.alignTextToIllustration(); });
          setTimeout(function() { window.alignTextToIllustration(); }, 300);
        }
      }
      setTimeout(runHomeAlignment, 0);
      setTimeout(runHomeAlignment, 200);

      var path = new URL(homeUrl).pathname || '/';
      if (path === '/index.html' || path.endsWith('/index.html')) path = path.replace(/index\.html$/, '') || '/';
      history.pushState({ page: 'home' }, '', path);
    }).catch(function() {
      window.location.href = homeUrl;
    });
  }

  function handleClick(e) {
    var link = e.target.closest('a');
    if (!link || !getPageFrame()) return;

    if (!isInternalLink(link)) return;

    var target = getTransitionTarget(link);
    if (!target) return;

    e.preventDefault();

    if (target === 'writing') {
      transitionToWriting(link);
    } else {
      transitionToHome(link);
    }
  }

  function handlePopState() {
    var pathname = window.location.pathname;
    var link = document.createElement('a');
    link.href = window.location.href;
    if (pathname.endsWith('writing.html') || pathname.endsWith('/writing')) {
      if (!isWritingPage()) transitionToWriting(link);
    } else {
      if (isWritingPage()) transitionToHome(link);
    }
  }

  if (getPageFrame()) {
    document.addEventListener('click', handleClick, false);
    window.addEventListener('popstate', handlePopState);
  }
})();
