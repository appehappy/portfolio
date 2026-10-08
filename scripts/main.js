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

// Illustration video: play forward on hover; on leave, rewind via a reversed
// clip back to the start pose, then rest there. Forward time t and reverse time
// (D - t) show the same frame, so swaps between the two layers are instant and
// seamless (no crossfade, which would double the multiply-blended line art).
function initIllustrationHover() {
  var REWIND_RATE = 1.75; // how fast the rewind plays back (tunable)

  document.querySelectorAll('.illustration').forEach(function (box) {
    var fwd = box.querySelector('.illustration-fwd');
    var rev = box.querySelector('.illustration-rev');
    if (!fwd || !rev) return;

    var token = 0; // guards against stale reveals when hover toggles quickly

    function duration() {
      return (fwd.duration && isFinite(fwd.duration)) ? fwd.duration : 5.04;
    }
    function clamp(t) {
      return Math.min(Math.max(t, 0), duration());
    }

    // Reveal `to` (seeked to targetTime) and hide `from`, but only once `to` has
    // actually decoded the target frame — otherwise it flashes a stale frame
    // during the seek. `from` stays visible (frozen) until then; since
    // forward(t) and reverse(D - t) are the same frame, the swap is invisible.
    function swapTo(to, from, targetTime, onReady) {
      var my = ++token;
      from.pause();
      var done = false;
      function reveal() {
        if (done) return;
        done = true;
        to.removeEventListener('seeked', onSeeked);
        clearTimeout(fallback);
        if (my !== token) return; // superseded by a newer interaction
        to.style.opacity = '1';
        from.style.opacity = '0';
        onReady();
      }
      function onSeeked() { requestAnimationFrame(reveal); }
      var fallback = setTimeout(reveal, 150); // safety net if 'seeked' never fires
      if (Math.abs(to.currentTime - targetTime) < 0.02) {
        requestAnimationFrame(reveal); // already on the frame
      } else {
        to.addEventListener('seeked', onSeeked);
        to.currentTime = targetTime;
      }
    }

    function playForward() {
      var D = duration();
      // If reverse is the visible layer, pick up forward from the mirrored time.
      var target = (rev.style.opacity === '1') ? clamp(D - rev.currentTime) : fwd.currentTime;
      swapTo(fwd, rev, target, function () { fwd.play().catch(function () {}); });
    }

    function playReverse() {
      var D = duration();
      // Rewind clip not loaded yet (a hover in the first moments of a visit):
      // go straight back to the start pose rather than swap to an empty layer.
      if (rev.readyState < 2) {
        fwd.pause();
        fwd.currentTime = 0;
        return;
      }
      rev.playbackRate = REWIND_RATE;
      swapTo(rev, fwd, clamp(D - fwd.currentTime), function () { rev.play().catch(function () {}); });
    }

    // Rewind finished: rest on the final frame (== forward's frame 0 / start pose).
    rev.addEventListener('ended', function () {
      rev.pause();
    });

    box.addEventListener('mouseenter', playForward);
    box.addEventListener('mouseleave', playReverse);
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
