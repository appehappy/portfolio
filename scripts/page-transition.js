/**
 * Page Transition
 *
 * In-page transitions. Home <-> writing: fade out, animate lanes, swap the body, fade in.
 * Home <-> project history: the frame, gridlines, name, illustration and peek
 * stay put; the rest of the frame's content leaves, is swapped, and arrives,
 * each side with its own choreography (motion.js).
 * Intercepts internal links and uses fetch + History API.
 */

(function() {
  var DESKTOP_MQ = '(min-width: 769px)';
  /* Safety net for the writing fades' transitionend (CSS: 180ms out, 280ms in) */
  var FADE_FALLBACK_MS = 400;
  var M = window.Motion;

  function getPageFrame() {
    return document.querySelector('.page-frame');
  }

  function isWritingPage() {
    return document.querySelector('.page-frame.writing-page') !== null;
  }

  function isHistoryPage() {
    return document.querySelector('.page-frame.history-page') !== null;
  }

  function isHistoryPath(pathname) {
    return pathname.endsWith('history.html') || pathname === '/history' || pathname.endsWith('/history');
  }

  function isInternalLink(link) {
    try {
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || link.target === '_blank' || link.hasAttribute('download')) return false;
      var linkUrl = new URL(link.href, window.location.href);
      return linkUrl.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function getTransitionTarget(link) {
    try {
      var pathname = new URL(link.href, window.location.href).pathname;
      if (pathname.endsWith('writing.html') || pathname === '/writing' || pathname.endsWith('/writing')) return 'writing';
      if (isHistoryPath(pathname)) return 'history';
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
        if (e.target !== element) return; /* ignore bubbled transitions from descendants */
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
      /* Pin first gridline to 25% in pixels so it never moves (it fades via .page-transition-out .gridline--1) */
      var line1Px = w * 0.25;
      frame.style.setProperty('--line-1', line1Px + 'px');
      var start = { l2: w * 0.5, l3: w * 0.75 };
      var end = { l2: FIRST_GRIDLINE_PX, l3: centerPx };
      var startTime = null;
      function tick(timestamp) {
        if (startTime === null) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var t = Math.min(elapsed / durationMs, 1);
        var eased = easeInOutCubic(t);
        if (t >= 1) {
          frame.style.setProperty('--line-2', FIRST_GRIDLINE_PX + 'px');
          frame.style.setProperty('--line-3', centerPx + 'px');
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              resolve(centerPx);
            });
          });
          return;
        }
        var l2 = start.l2 + (end.l2 - start.l2) * eased;
        var l3 = start.l3 + (end.l3 - start.l3) * eased;
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
    waitForTransition(fadeTarget, 'opacity', FADE_FALLBACK_MS).then(function() {
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
      var writingUrlCacheBust = writingUrl + (writingUrl.indexOf('?') === -1 ? '?' : '&') + '_t=' + Date.now();
      return fetch(writingUrlCacheBust).then(function(res) {
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
            waitForTransition(fadeInTarget, 'opacity', FADE_FALLBACK_MS).then(function() {
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

  /* Home <-> project history. The gridlines, name, illustration, peek and
     gradient are identical on both pages, so the frame and those nodes stay
     put; only the rest of the frame's children are swapped. Nothing reloads,
     so the illustration never flashes.

     Everything the swap needs (the other page's HTML, history.css, history.js)
     is warmed up at idle and on hover, and any remaining load runs in parallel
     with the exit, so there is no blank gap on a real network. */
  var SHARED_SELECTOR = '.gridlines, .page-content, .illustration, .peek, .peek-gradient';

  function isSharedNode(el) {
    return el.nodeType === 1 && el.matches(SHARED_SELECTOR);
  }

  function ensureStylesheet(href) {
    if (!href || document.head.querySelector('link[href*="' + href + '"]')) return Promise.resolve();
    return new Promise(function(resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      /* Cache-bust: this file is never on the page at load, so a refresh would not revalidate it */
      link.href = 'styles/' + href + '?_t=' + Date.now();
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }

  /* Page-specific script, loaded once per document. history.js exposes
     window.initProjectHistory so a swap can initialise freshly inserted nodes
     synchronously, before they are first painted. */
  function ensureScript(name) {
    if (!name || document.querySelector('script[src*="' + name + '"]')) return Promise.resolve();
    return new Promise(function(resolve) {
      var script = document.createElement('script');
      script.src = 'scripts/' + name + '?_t=' + Date.now();
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });
  }

  /* Fetched page HTML, keyed by URL, kept for the life of the document.
     'no-cache' revalidates with the server so a stale copy is never used. */
  var pageCache = {};

  function fetchPage(url) {
    var key = url.origin + url.pathname + url.search;
    if (!pageCache[key]) {
      pageCache[key] = fetch(key, { cache: 'no-cache' }).then(function(res) {
        if (!res.ok) throw new Error('Fetch failed');
        return res.text();
      }).catch(function(err) {
        delete pageCache[key];
        throw err;
      });
    }
    return pageCache[key];
  }

  function warmUp(link, stylesheet, script) {
    fetchPage(new URL(link.href, window.location.href)).catch(function() {});
    ensureStylesheet(stylesheet);
    ensureScript(script);
  }

  /* Warm up the other side of the home <-> history pair: at idle, and on the
     first hover / focus / touch of the link in case idle has not come yet. */
  function scheduleWarmUp() {
    var onHistory = isHistoryPage();
    var link = document.querySelector(onHistory ? '.history-close' : '.history-link');
    if (!link) return;
    function run() {
      if (onHistory) warmUp(link);
      else warmUp(link, 'history.css', 'history.js');
    }
    ['mouseenter', 'focus', 'touchstart'].forEach(function(evt) {
      link.addEventListener(evt, run, { once: true, passive: true });
    });
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 1000);
  }

  /* Choreography for each side of the pair.

     enter(nodes, delay) runs against freshly swapped-in nodes before their
     first paint; each animation holds its first keyframe through its delay.

     exit(nodes) leaves from wherever the page currently is (a running entrance
     is frozen first, so interrupting never snaps). It returns `content` (once
     that has gone, the swap can happen) and `tail` (the outgoing nodes stay,
     under the incoming ones, until it finishes). */
  function isDesktop() {
    return window.matchMedia(DESKTOP_MQ).matches;
  }

  function find(nodes, selector) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].matches(selector)) return nodes[i];
      var hit = nodes[i].querySelector(selector);
      if (hit) return hit;
    }
    return null;
  }

  function findAll(nodes, selector) {
    var out = [];
    nodes.forEach(function(el) {
      if (el.matches(selector)) out.push(el);
      out.push.apply(out, el.querySelectorAll(selector));
    });
    return out;
  }

  /* The header and the rows in view (nobody sees the rest arrive) */
  var MAX_STAGGERED_ROWS = 8;
  var ROW_STEP_MS = 40;

  function visibleRows(panel) {
    var rows = [panel.querySelector('.history-header')];
    var list = panel.querySelector('.history-list');
    if (list) {
      var box = list.getBoundingClientRect();
      Array.prototype.forEach.call(list.querySelectorAll('.history-item'), function(item) {
        var r = item.getBoundingClientRect();
        if (r.bottom > box.top && r.top < box.bottom && rows.length <= MAX_STAGGERED_ROWS) rows.push(item);
      });
    }
    return rows.filter(Boolean);
  }

  var choreo = {
    /* The panel is ruled out of the column the link lives in: hairlines draw
       left to right from the first gridline as the ground covers the centre
       line, the card rises in, then the rows, then the open project's image
       unmasks top to bottom. */
    history: {
      enter: function(nodes, delay) {
        var panel = find(nodes, '.history-panel');
        if (!panel) return [];
        var d = delay || 0;
        var anims = [];
        if (isDesktop()) {
          anims.push(M.animate(panel, [{ transform: 'scaleX(0)' }, { transform: 'none' }],
            { pseudoElement: '::before', duration: 'dur-5', easing: 'ease-out-expo', delay: d }));
        }
        anims.push(M.animate(panel, [{ opacity: 0 }, { opacity: 1 }],
          { pseudoElement: '::after', duration: 'dur-3', easing: 'ease-out', delay: d }));
        anims = anims.concat(M.rise(panel.querySelector('.history-card'), { rise: 'rise-3', delay: d + 120 }));
        visibleRows(panel).forEach(function(row, i) {
          anims = anims.concat(M.rise(row, { delay: d + 200 + i * ROW_STEP_MS }));
        });
        var gallery = panel.querySelector('.history-item.is-open .history-gallery');
        if (gallery) {
          anims.push(M.animate(gallery, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0)' }],
            { duration: 'dur-6', easing: 'ease-out-expo', delay: d + 260 }));
          anims.push(M.animate(gallery.querySelector('img'), [{ transform: 'scale(1.04)' }, { transform: 'none' }],
            { duration: 'dur-7', easing: 'ease-out-expo', delay: d + 260 }));
        }
        return anims;
      },
      /* The card goes first; the hairlines retract the way they came */
      exit: function(nodes) {
        var panel = find(nodes, '.history-panel');
        if (!panel) return { content: [], tail: [] };
        var tail = [M.animate(panel, [{ opacity: 0 }],
          { pseudoElement: '::after', duration: 'dur-3', easing: 'ease-in', fill: 'forwards', delay: 60 })];
        if (isDesktop()) {
          tail.push(M.animate(panel, M.reduced() ? [{ opacity: 0 }] : [{ transform: 'scaleX(0)' }],
            { pseudoElement: '::before', duration: 'dur-3', easing: 'ease-in', fill: 'forwards', delay: 60 }));
        }
        return {
          content: [M.animate(panel.querySelector('.history-card'), [{ opacity: 0 }],
            { duration: 'dur-2', easing: 'ease-in', fill: 'forwards' })],
          tail: tail
        };
      }
    },

    /* The columns (or, on mobile, the stacked blocks) arrive in reading order */
    home: {
      enter: function(nodes, delay) {
        var parts = isDesktop() ? findAll(nodes, '.text-columns .column') : findAll(nodes, '.grid-field > *');
        var anims = [];
        parts.forEach(function(el, i) {
          anims = anims.concat(M.rise(el, { delay: (delay || 0) + i * M.ms('stagger') }));
        });
        return anims;
      },
      exit: function(nodes) {
        return {
          content: findAll(nodes, '.text-columns, .grid-field').map(function(el) {
            return M.animate(el, [{ opacity: 0 }], { duration: 'dur-2', easing: 'ease-in', fill: 'forwards' });
          }),
          tail: []
        };
      }
    }
  };

  /* One swap at a time. Clicks during the exit are ignored; a back/forward
     during it is replayed once the swap lands. */
  var swap = { busy: false, token: 0, entrance: [], pendingPop: false };

  function swapWithinFrame(url, opts) {
    var frame = getPageFrame();
    if (!frame || swap.busy) return;
    /* Arrived here from the writing page, whose instance of this script ran
       before motion.js was on the page: just load the page */
    M = M || window.Motion;
    if (!M) return window.location.assign(url);
    swap.busy = true;
    var myToken = ++swap.token;
    var pageUrl = new URL(url, window.location.href);
    var from = choreo[opts.from];
    var to = choreo[opts.page];

    /* The direction class recolours the name from the first frame of the exit */
    var directionClass = 'page-transition-to-' + opts.page;
    frame.classList.remove('page-transition-to-home', 'page-transition-to-history');
    frame.classList.add('page-transition-history', directionClass);

    var outgoing = Array.prototype.filter.call(frame.children, function(el) { return !isSharedNode(el); });
    M.pause(swap.entrance);
    var exit = from.exit(outgoing);

    /* Leave while (if needed) the page, stylesheet and script load */
    Promise.all([
      M.all(exit.content),
      fetchPage(pageUrl),
      ensureStylesheet(opts.stylesheet),
      ensureScript(opts.script)
    ]).then(function(results) {
      var doc = new DOMParser().parseFromString(results[1], 'text/html');
      var newFrame = doc.querySelector('.page-frame');
      if (!newFrame) throw new Error('No page frame');

      /* Swap everything except the shared nodes. The incoming nodes go on top;
         the outgoing ones stay until their exit's tail has finished. */
      var incoming = Array.prototype.filter.call(newFrame.children, function(el) { return !isSharedNode(el); });
      incoming.forEach(function(el) { frame.appendChild(document.adoptNode(el)); });
      M.all(exit.tail).then(function() {
        outgoing.forEach(function(el) { if (el.parentNode === frame) frame.removeChild(el); });
      });

      frame.className = newFrame.className + ' page-transition-history ' + directionClass;
      /* The on-load reveal cascade already ran this session; show reveal
         elements outright (class added before first paint, so no transition) */
      incoming.forEach(function(el) {
        if (el.matches('.rv, .rv-fade')) el.classList.add('in');
        el.querySelectorAll('.rv, .rv-fade').forEach(function(child) { child.classList.add('in'); });
      });

      var newTitle = doc.querySelector('title');
      if (newTitle) document.title = newTitle.textContent;

      /* URL first: the history script reads the hash when it initialises */
      if (opts.push !== false) {
        history.pushState({ page: opts.page }, '', pageUrl.pathname + pageUrl.hash);
      }

      /* Initialise the page-specific script against the new nodes, before
         first paint (so e.g. the first project is already open as it arrives).
         main.js is not re-run — the illustration hover is already bound. */
      if (opts.init && typeof window[opts.init] === 'function') window[opts.init]();
      if (typeof opts.after === 'function') opts.after();

      /* Warm up the way back */
      scheduleWarmUp();

      swap.entrance = to.enter(incoming, 0);
      swap.busy = false;
      if (swap.pendingPop) {
        swap.pendingPop = false;
        handlePopState();
      }

      M.all(swap.entrance).then(function() {
        if (myToken !== swap.token) return;
        frame.classList.remove('page-transition-history', directionClass);
      });
    }).catch(function() {
      window.location.href = pageUrl.href;
    });
  }

  function runHomeAlignment() {
    if (typeof window.alignTextToIllustration !== 'function') return;
    window.alignTextToIllustration();
    requestAnimationFrame(function() { window.alignTextToIllustration(); });
    setTimeout(function() { window.alignTextToIllustration(); }, 300);
  }

  function transitionToHistory(link, push) {
    swapWithinFrame(link.href, {
      from: 'home',
      page: 'history',
      push: push,
      stylesheet: 'history.css',
      script: 'history.js',
      init: 'initProjectHistory'
    });
  }

  function transitionHistoryToHome(link, push) {
    swapWithinFrame(link.href, {
      from: 'history',
      page: 'home',
      push: push,
      after: runHomeAlignment
    });
  }

  function transitionToHome(link) {
    var frame = getPageFrame();
    if (!frame) return;

    var homeUrl = new URL(link.href, window.location.href).href;

    frame.classList.add('page-transition-out');

    var fadeTarget = frame.querySelector('.article-list-container, .article-content, .history-panel');
    if (!fadeTarget) fadeTarget = frame;
    waitForTransition(fadeTarget, 'opacity', FADE_FALLBACK_MS).then(function() {
      var homeUrlCacheBust = homeUrl + (homeUrl.indexOf('?') === -1 ? '?' : '&') + '_t=' + Date.now();
      return fetch(homeUrlCacheBust).then(function(res) {
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
      var historyLink = document.head.querySelector('link[href*="history.css"]');
      if (historyLink) historyLink.remove();

      if (newFrame) {
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            newFrame.classList.add('page-transition-in-visible');
            var fadeInTarget = newFrame.querySelector('.text-columns, .grid-field');
            if (!fadeInTarget) fadeInTarget = newFrame;
            waitForTransition(fadeInTarget, 'opacity', FADE_FALLBACK_MS).then(function() {
              newFrame.classList.remove('page-transition-in', 'page-transition-in-visible');
            });
          });
        });
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
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest('a');
    if (!link || !getPageFrame()) return;

    if (!isInternalLink(link)) return;

    var target = getTransitionTarget(link);
    if (!target) return;

    e.preventDefault();
    if (swap.busy) return; /* mid-swap: the click would only queue a second one */

    if (target === 'writing') {
      // The lane animation assumes the home gridlines; from any other page, do a full load.
      if (isHistoryPage()) return window.location.assign(link.href);
      transitionToWriting(link);
    } else if (target === 'history') {
      if (isWritingPage()) return window.location.assign(link.href);
      transitionToHistory(link);
    } else if (isHistoryPage()) {
      transitionHistoryToHome(link);
    } else {
      transitionToHome(link);
    }
  }

  function handlePopState() {
    if (swap.busy) {
      swap.pendingPop = true;
      return;
    }
    var pathname = window.location.pathname;
    var link = document.createElement('a');
    link.href = window.location.href;
    if (pathname.endsWith('writing.html') || pathname.endsWith('/writing')) {
      if (isHistoryPage()) window.location.reload();
      else if (!isWritingPage()) transitionToWriting(link);
    } else if (isHistoryPath(pathname)) {
      if (isWritingPage()) window.location.reload();
      else if (!isHistoryPage()) transitionToHistory(link, false);
    } else {
      if (isHistoryPage()) transitionHistoryToHome(link, false);
      else if (isWritingPage()) transitionToHome(link);
    }
  }

  /* A direct load of the history page plays the panel's entrance as part of
     the intro (main.js says when it starts) */
  document.addEventListener('appe:intro', function(e) {
    var frame = getPageFrame();
    if (!frame || !isHistoryPage()) return;
    /* The intro can start before history.js's own DOMContentLoaded handler
       has run; open the initial project first so the right rows animate */
    if (typeof window.initProjectHistory === 'function') window.initProjectHistory();
    var quick = e.detail && e.detail.quick;
    swap.entrance = choreo.history.enter(Array.prototype.slice.call(frame.children), quick ? 0 : 340);
  });

  if (getPageFrame()) {
    document.addEventListener('click', handleClick, false);
    window.addEventListener('popstate', handlePopState);
    scheduleWarmUp();
  }
})();
