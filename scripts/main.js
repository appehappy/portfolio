/**
 * Main JavaScript
 * 
 * Progressive enhancement for layout alignment.
 */

// Align text columns to top of illustration. The illustration box has a fixed
// aspect ratio, so this needs layout only, not the media inside it.
function alignTextToIllustration() {
  const container = document.querySelector('.illustration');
  const textColumns = document.querySelector('.text-columns');
  if (!container || !textColumns) return;
  positionTextColumns(container, textColumns);
}

// Illustration: a hand-drawn look-around in three beats (a glance toward the
// text, a small glance the other way, a second glance toward the text) that
// plays while hovered. Between the beats his pose comes back to the rest pose.
//
// On leave he doesn't rewind through every beat (which reads as head-shaking):
// he takes the shortest way, forward or back, to the nearest of those rest
// moments, then rests. Going forward is follow-through: he finishes the look
// rather than reversing out of it.
//
// Hovering a link in the columns makes him glance at it (beat one, held while
// the pointer is there); clicking "project history" keeps him looking while
// the panel rules out.
//
// Forward (.illustration-fwd) and reversed (.illustration-rev) copies of the
// clip share the box: forward time t and reverse time D - t are the same
// frame, so swapping layers at matched frames is seamless (no crossfade, which
// would double the multiply-blended line art). Whichever layer is hidden waits
// parked on the rest pose, so coming to rest is an instant swap.
function initIllustrationHover() {
  var INTENT_MS = 60;             // a cursor passing over doesn't wake him
  var LINK_INTENT_MS = 150;
  var SETTLE_RATE = 1.15;         // settling is a touch brisker than the performance
  var REST_CUES = [0, 2.167, 3.125]; // s: where his pose matches the rest pose (and the clip's end)
  var GLANCE_HOLD = 1.17;         // s: beat one, looking toward the text
  var BEAT_ONE_END = REST_CUES[1]; // s: beat one has turned back to rest
  var CLICK_HOLD_MS = 1400;       // keep looking while the history panel arrives
  var SEEK_SAFETY_MS = 800;
  var RUN_SAFETY_MS = 400;        // beyond a run's expected length, if playback stalls
  var GLANCE_LINKS = '.history-link, .archive-link';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('.illustration').forEach(function (box) {
    var fwd = box.querySelector('.illustration-fwd');
    var rev = box.querySelector('.illustration-rev');
    if (!fwd || !rev || box.dataset.ready) return;
    box.dataset.ready = '1';

    var state = 'rest';           // rest | playing | glancing | settling
    var shown = fwd;              // the visible layer
    var token = 0;                // invalidates callbacks from an earlier state
    var intentTimer = 0;
    var linkTimer = 0;
    var clickHold = 0;
    var currentLink = null;       // the glance link under the pointer (or focused)

    // Still on a glance link? (Clicking "project history" swaps the link out
    // without a pointerout, so a detached link doesn't count.)
    function overLink() {
      return !!(currentLink && currentLink.isConnected);
    }

    function D() {
      return (fwd.duration && isFinite(fwd.duration)) ? fwd.duration : 5.04;
    }
    function ready() {
      return fwd.readyState >= 2 && rev.readyState >= 2;
    }
    // The current frame, on the forward clock, whichever layer is showing
    function now() {
      return shown === fwd ? fwd.currentTime : Math.max(0, D() - rev.currentTime);
    }
    function nextFrame(video, fn) {
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(fn);
      else requestAnimationFrame(fn);
    }

    // Hidden layers wait on the rest pose: forward's first frame, reverse's last
    function park(video) {
      video.pause();
      var t = video === fwd ? 0 : D();
      if (video.seeking || Math.abs(video.currentTime - t) > 0.02) video.currentTime = t;
    }
    rev.addEventListener('loadeddata', function () { if (shown !== rev) park(rev); });

    // Show `to` at its time t, but only once that frame has decoded (otherwise
    // it flashes a stale frame mid-seek); the other layer stays visible,
    // frozen, until then, then parks.
    function show(to, t, then) {
      var my = ++token;
      var from = to === fwd ? rev : fwd;
      from.pause();
      function reveal() {
        if (my !== token) return; // superseded by a newer interaction
        to.style.opacity = '1';
        from.style.opacity = '0';
        shown = to;
        park(from);
        if (then) then();
      }
      if (!to.seeking && Math.abs(to.currentTime - t) < 0.02) {
        reveal();
      } else {
        // Seeks land within a frame or two (a keyframe every 12 frames); the
        // timer only rescues a seek that never completes
        var net = setTimeout(reveal, SEEK_SAFETY_MS);
        to.addEventListener('seeked', function () {
          clearTimeout(net);
          requestAnimationFrame(reveal);
        }, { once: true });
        if (Math.abs(to.currentTime - t) >= 0.02) to.currentTime = t;
      }
    }

    // Play `video` until it reaches time `target` (frame-accurate), then `done`.
    // The per-frame check alone isn't enough: a frame callback fires at the
    // start of each frame, and once the clip reaches its end no new frame is
    // presented, so a run to the very end would never see itself arrive (and
    // he'd be stuck mid-settle, ignoring every glance after). 'ended', a
    // rejected play() and a stall timer all finish the run too.
    function runTo(video, target, rate, done) {
      var my = token;
      var finished = false;
      var net = 0;
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(net);
        video.removeEventListener('ended', finish);
        if (my !== token) return; // superseded: the video belongs to a newer run
        video.pause();
        done();
      }
      var remainingMs = Math.max(0, target - video.currentTime) / rate * 1000;
      net = setTimeout(finish, remainingMs + RUN_SAFETY_MS);
      video.addEventListener('ended', finish);
      video.playbackRate = rate;
      video.play().catch(finish);
      (function check() {
        if (finished || my !== token) return;
        if (video.ended || video.currentTime >= target - 0.01) return finish();
        nextFrame(video, check);
      })();
    }

    function play() {
      state = 'playing';
      fwd.loop = true;
      show(fwd, now(), function () {
        fwd.playbackRate = 1;
        fwd.play().catch(function () {});
      });
    }

    function rest() {
      state = 'rest';
      var parked = shown === fwd ? rev : fwd;
      show(parked, parked === fwd ? 0 : D());
      // A link was hovered while he was finishing another beat: look now
      if (overLink()) glance();
    }

    // The shortest way to the nearest rest pose, forward or back
    function settle() {
      if (state === 'rest' || state === 'settling') return;
      state = 'settling';
      var t = now();
      var end = D();
      var back = 0;
      var ahead = end;
      REST_CUES.concat(end).forEach(function (cue) {
        if (cue <= t && cue > back) back = cue;
        if (cue >= t && cue < ahead) ahead = cue;
      });
      if (Math.min(t - back, ahead - t) < 0.03) return rest();
      if (ahead - t <= t - back) {
        fwd.loop = false;
        show(fwd, t, function () { runTo(fwd, ahead, SETTLE_RATE, rest); });
      } else {
        show(rev, end - t, function () { runTo(rev, end - back, SETTLE_RATE, rest); });
      }
    }

    // Beat one, held: he looks toward the link. From rest, or part-way
    // through turning back from an earlier glance (he turns to look again,
    // from wherever he is). Mid-way through another beat, he finishes it
    // first (rest() picks the glance up).
    function glance() {
      if (reduced.matches || !box.isConnected) return;
      if (state === 'playing' || state === 'glancing') return;
      if (!ready()) {
        loadIllustrationVideos();
        fwd.addEventListener('canplay', function () { if (overLink() && ready()) glance(); }, { once: true });
        return;
      }
      var t = state === 'rest' ? 0 : now();
      if (t > BEAT_ONE_END) return; // settling through a later beat
      state = 'glancing';
      if (t <= GLANCE_HOLD) {
        fwd.loop = false;
        show(fwd, t, function () { runTo(fwd, GLANCE_HOLD, 1, function () {}); });
      } else {
        show(rev, D() - t, function () { runTo(rev, D() - GLANCE_HOLD, 1, function () {}); });
      }
    }

    function unglance() {
      if (state === 'glancing' && !clickHold) settle();
    }

    box.addEventListener('mouseenter', function () {
      if (reduced.matches) return;
      clearTimeout(intentTimer);
      intentTimer = setTimeout(function () {
        if (ready()) return play();
        // Not loaded yet: start when it is, if the pointer is still here
        loadIllustrationVideos();
        fwd.addEventListener('canplay', function () {
          if (box.matches(':hover') && ready()) play();
        }, { once: true });
      }, INTENT_MS);
    });

    box.addEventListener('mouseleave', function () {
      clearTimeout(intentTimer);
      if (state === 'playing') settle();
    });

    // Link glances, delegated so they survive the home <-> history swap
    function linkFrom(e) {
      return e.target && e.target.closest ? e.target.closest(GLANCE_LINKS) : null;
    }
    function onLinkEnter(e) {
      var link = linkFrom(e);
      if (!link || link === currentLink) return; // moving between its text and icon
      currentLink = link;
      clearTimeout(linkTimer);
      linkTimer = setTimeout(glance, LINK_INTENT_MS);
    }
    function onLinkLeave(e) {
      var link = linkFrom(e);
      if (!link || link.contains(e.relatedTarget)) return;
      currentLink = null;
      clearTimeout(linkTimer);
      unglance();
    }
    document.addEventListener('pointerover', onLinkEnter);
    document.addEventListener('focusin', onLinkEnter);
    document.addEventListener('pointerout', onLinkLeave);
    document.addEventListener('focusout', onLinkLeave);
    document.addEventListener('click', function (e) {
      var link = linkFrom(e);
      if (!link || !link.classList.contains('history-link')) return;
      // The link is about to be swapped out (no pointerout will follow): keep
      // looking while the panel arrives, then turn back
      clearTimeout(linkTimer);
      glance();
      clearTimeout(clickHold);
      clickHold = setTimeout(function () {
        clickHold = 0;
        unglance();
      }, CLICK_HOLD_MS);
    });
  });
}

function positionTextColumns(illustrationContainer, textColumns) {
  const pageFrame = document.querySelector('.page-frame');
  if (!pageFrame || !illustrationContainer) return;
  const pageFrameRect = pageFrame.getBoundingClientRect();
  const illustrationRect = illustrationContainer.getBoundingClientRect();
  
  // Calculate illustration top relative to page-frame's padding box
  // page-frame has position: relative, so absolute children are positioned relative to padding box
  // The padding box starts at: pageFrameRect.top + borderWidth
  const borderWidth = parseInt(getComputedStyle(pageFrame).borderTopWidth);
  const illustrationTopRelativeToPaddingBox = illustrationRect.top - (pageFrameRect.top + borderWidth);

  // Sit the text columns 48px below the illustration top
  const COLUMN_TOP_OFFSET = 48;
  textColumns.style.top = (illustrationTopRelativeToPaddingBox + COLUMN_TOP_OFFSET) + 'px';
}

// Elements the on-load intro reveals (the head's inline failsafe uses the same list)
var REVEAL_SELECTOR = '.rv, .rv-fade, .peek, .peek-gradient, .gridlines';

// The intro waits for the body face, but never longer than this, so text
// doesn't change typeface mid-animation.
var INTRO_FONT_CAP_MS = 500;
// The name waits longer for its own face: a 128px fallback swapping to Ruder
// Plakat halfway through its entrance is the worst flash the page could have.
var NAME_FONT_CAP_MS = 2000;

function fontsReady(specs, capMs) {
  if (!document.fonts || typeof document.fonts.load !== 'function') return Promise.resolve();
  var loads = Promise.all(specs.map(function (spec) {
    return document.fonts.load(spec).catch(function () {});
  }));
  return Promise.race([loads, new Promise(function (resolve) { setTimeout(resolve, capMs); })]);
}

// Reveal-on-load: add `.in` to reveal elements as they enter the viewport
// (fires immediately for above-the-fold ones). One-shot per element. Starts
// at DOMContentLoaded plus fonts, not `load`, which would also wait for the
// display font file and both illustration videos.
function initReveal() {
  // Ensure the hidden states apply even if reached via an in-page transition
  // (page-transition swaps body + re-runs this script; the head's inline guard
  // ran only on the original load).
  document.documentElement.classList.add('js');

  var els = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SELECTOR));
  if (!els.length) return;

  // On an in-page transition (this script has already run once this session),
  // skip the staggered reveal and just show everything — the page transition's
  // own fade provides the motion, and a second cascade would feel busy.
  if (window.__revealedOnce) {
    document.documentElement.classList.add('intro-started');
    els.forEach(function (el) { el.classList.add('in'); });
    scheduleIllustrationLoad();
    return;
  }
  window.__revealedOnce = true;

  // Later loads in this tab get the short version of the intro (head script)
  try { sessionStorage.setItem('appe:intro', '1'); } catch (e) {}

  var observe = function (list) { list.forEach(function (el) { el.classList.add('in'); }); };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    observe = function (list) { list.forEach(function (el) { io.observe(el); }); };
  }

  var isName = function (el) { return !!el.closest('.page-content'); };
  var nameEls = els.filter(isName);
  var otherEls = els.filter(function (el) { return !isName(el); });

  var body = fontsReady(['400 14px Gantari'], INTRO_FONT_CAP_MS);
  var name = fontsReady(['128px "Ruder Plakat Maxi LL"'], NAME_FONT_CAP_MS);
  body.then(function () {
    // Choreographed parts of the intro (the history panel, page-transition.js)
    // start from this moment
    var root = document.documentElement;
    root.classList.add('intro-started');
    document.dispatchEvent(new CustomEvent('appe:intro', {
      detail: { quick: root.classList.contains('intro-quick') }
    }));
    observe(otherEls);
    scheduleIllustrationLoad();
  });
  Promise.all([body, name]).then(function () { observe(nameEls); });
}

// The illustration videos only matter with a desktop pointer. They load after
// the intro has started so they never compete with it, never on phones, and
// straight away if the pointer reaches the illustration first.
var ILLUSTRATION_LOAD_DELAY_MS = 1200;

function loadIllustrationVideos() {
  if (!window.matchMedia('(hover: hover) and (min-width: 769px)').matches) return;
  document.querySelectorAll('.illustration video').forEach(function (v) {
    if (v.preload === 'auto') return;
    v.preload = 'auto';
    // load() would abort a hover-started fetch, so only kick idle elements
    if (v.readyState === 0 && v.networkState !== HTMLMediaElement.NETWORK_LOADING) v.load();
  });
}

function scheduleIllustrationLoad() {
  var box = document.querySelector('.illustration');
  if (box) box.addEventListener('pointerenter', loadIllustrationVideos, { once: true });
  setTimeout(function () {
    if ('requestIdleCallback' in window) requestIdleCallback(loadIllustrationVideos, { timeout: 1000 });
    else loadIllustrationVideos();
  }, ILLUSTRATION_LOAD_DELAY_MS);
}

// Peek illustration: hover expands it; click pins it open (swaps to the
// no-background version + border); click again collapses back to the blue square.
function initPeek() {
  var peek = document.querySelector('.peek');
  if (!peek) return;

  peek.addEventListener('click', function () {
    if (peek.classList.contains('is-pinned')) {
      // Collapse back to the blue square. Suppress the hover-expand until the
      // pointer leaves, so it doesn't immediately re-open under the cursor.
      peek.classList.remove('is-pinned');
      peek.classList.add('is-suppressed');
    } else if (!peek.classList.contains('is-suppressed')) {
      // Pin open from the expanded (hover) state.
      peek.classList.add('is-pinned');
    }
  });

  peek.addEventListener('mouseleave', function () {
    peek.classList.remove('is-suppressed');
  });
}

// Expose for page-transition.js to call after swapping to home (realign when DOM/image ready)
window.alignTextToIllustration = alignTextToIllustration;

// Run at DOMContentLoaded (or immediately when re-run after an in-page
// transition). Alignment comes first so the columns are in place before they
// reveal; it runs again on load and resize.
function boot() {
  alignTextToIllustration();
  initIllustrationHover();
  initPeek();
  initReveal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
window.addEventListener('load', alignTextToIllustration);
window.addEventListener('resize', alignTextToIllustration);
