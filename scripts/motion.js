/**
 * Motion
 *
 * Shared clock for choreographed sequences (page swaps, the project panel).
 * Durations and easings live in tokens.css and are read once here, so CSS
 * transitions and JS animations stay in step.
 *
 * Sequences use the Web Animations API. An animation holds its first keyframe
 * through its delay (fill: backwards) and then lets go, so the stylesheet owns
 * every resting state. Under prefers-reduced-motion everything collapses to a
 * short crossfade: no movement, drawing or clipping.
 */

(function () {
  if (window.Motion) return;

  var REDUCED_MS = 160;

  var rootStyle = getComputedStyle(document.documentElement);
  var tokens = {};

  function token(name) {
    if (!(name in tokens)) tokens[name] = rootStyle.getPropertyValue('--' + name).trim();
    return tokens[name];
  }

  /* 120 | '120ms' | '0.3s' | 'dur-2' | 'stagger' -> milliseconds */
  function ms(v) {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    if (/^(dur-\d|stagger)$/.test(v)) v = token(v);
    var n = parseFloat(v) || 0;
    return /ms$/.test(v) ? n : /s$/.test(v) ? n * 1000 : n;
  }

  /* 'ease-out' -> the token's cubic-bezier(); anything else passes through.
     The token names deliberately shadow the CSS keywords of the same name. */
  function easing(v) {
    if (!v) v = 'ease-out';
    return (/^ease-/.test(v) && token(v)) || v;
  }

  /* The same curve as a function, for motion CSS can't drive (scrollTop) */
  function curve(v) {
    var m = /cubic-bezier\(([^)]+)\)/.exec(easing(v));
    if (!m) return function (t) { return t; };
    var p = m[1].split(',').map(parseFloat);
    return bezier(p[0], p[1], p[2], p[3]);
  }

  function bezier(x1, y1, x2, y2) {
    function at(t, a, b) { return ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t; }
    function slope(t, a, b) { return 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var dx = at(t, x1, x2) - x;
        var d = slope(t, x1, x2);
        if (Math.abs(dx) < 1e-5 || Math.abs(d) < 1e-6) break;
        t -= dx / d;
      }
      if (!(t >= 0 && t <= 1) || Math.abs(at(t, x1, x2) - x) > 1e-3) {
        var lo = 0, hi = 1;
        for (var j = 0; j < 24; j++) {
          t = (lo + hi) / 2;
          if (at(t, x1, x2) < x) lo = t; else hi = t;
        }
      }
      return at(t, y1, y2);
    };
  }

  var reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function reduced() {
    return !!(reducedQuery && reducedQuery.matches);
  }

  /* Animate el through keyframes. opts: duration, delay, easing (token names
     or raw values), fill (default 'backwards'), pseudoElement.
     Returns the Animation, or null when nothing should run. */
  function animate(el, keyframes, opts) {
    opts = opts || {};
    if (!el || typeof el.animate !== 'function') return null;

    var timing = {
      duration: ms(opts.duration || 'dur-3'),
      delay: ms(opts.delay),
      easing: easing(opts.easing),
      fill: opts.fill || 'backwards'
    };
    if (opts.pseudoElement) timing.pseudoElement = opts.pseudoElement;

    if (reduced()) {
      if (!keyframes.some(function (k) { return 'opacity' in k; })) return null;
      keyframes = keyframes.map(function (k) {
        var out = {};
        if ('opacity' in k) out.opacity = k.opacity;
        if ('offset' in k) out.offset = k.offset;
        return out;
      });
      timing.duration = REDUCED_MS;
      timing.delay = 0;
      timing.easing = 'linear';
    }

    try {
      return el.animate(keyframes, timing);
    } catch (e) {
      return null;
    }
  }

  /* The same keyframes across els, each a step later than the last.
     keyframes may be a function (el, i) -> keyframes. */
  function stagger(els, keyframes, opts) {
    opts = opts || {};
    var step = ms(opts.step != null ? opts.step : 'stagger');
    var base = ms(opts.delay);
    return Array.prototype.map.call(els, function (el, i) {
      var o = Object.assign({}, opts, { delay: base + i * step });
      return animate(el, typeof keyframes === 'function' ? keyframes(el, i) : keyframes, o);
    });
  }

  /* Resolves once every animation has finished or been cancelled */
  function all(anims) {
    return Promise.all((anims || []).filter(Boolean).map(function (a) {
      return a.finished.catch(function () {});
    }));
  }

  function cancel(anims) {
    (anims || []).forEach(function (a) { if (a) a.cancel(); });
  }

  window.Motion = {
    ms: ms,
    easing: easing,
    curve: curve,
    reduced: reduced,
    animate: animate,
    stagger: stagger,
    all: all,
    cancel: cancel
  };
})();
