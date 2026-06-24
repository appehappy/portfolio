/**
 * Main JavaScript
 * 
 * Progressive enhancement for layout alignment.
 */

// Align text columns to top of illustration (use container rect so video scale doesn't affect layout)
function alignTextToIllustration() {
  const container = document.querySelector('.illustration');
  const media = document.querySelector('.illustration img, .illustration video');
  const textColumns = document.querySelector('.text-columns');
  
  if (!container || !textColumns) return;
  function run() {
    positionTextColumns(container, textColumns);
  }
  if (!media) {
    run();
    return;
  }
  if (media.tagName === 'IMG') {
    if (media.complete) {
      run();
    } else {
      media.addEventListener('load', run);
    }
  } else {
    if (media.readyState >= 2) {
      run();
    } else {
      media.addEventListener('loadeddata', run, { once: true });
      media.addEventListener('loadedmetadata', run, { once: true });
    }
  }
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

// Reveal-on-load: add `.in` to .rv / .rv-fade / .peek elements as they enter the
// viewport (fires immediately for above-the-fold ones). One-shot per element.
function initReveal() {
  // Ensure the hidden states apply even if reached via an in-page transition
  // (page-transition swaps body + re-runs this script; the head's inline guard
  // ran only on the original load).
  document.documentElement.classList.add('js');

  var els = document.querySelectorAll('.rv, .rv-fade, .peek');
  if (!els.length) return;

  // On an in-page transition (this script has already run once this session),
  // skip the staggered reveal and just show everything — the page transition's
  // own fade provides the motion, and a second cascade would feel busy.
  if (window.__revealedOnce) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  window.__revealedOnce = true;

  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  els.forEach(function (el) { io.observe(el); });
}

// Expose for page-transition.js to call after swapping to home (realign when DOM/image ready)
window.alignTextToIllustration = alignTextToIllustration;

// Run on load and resize; also run immediately if document already loaded (e.g. after in-page transition)
if (document.readyState === 'complete') {
  alignTextToIllustration();
  requestAnimationFrame(function() { alignTextToIllustration(); });
  setTimeout(alignTextToIllustration, 250);
  initIllustrationHover();
  initReveal();
} else {
  window.addEventListener('load', function () {
    alignTextToIllustration();
    initIllustrationHover();
    initReveal();
  });
}
window.addEventListener('resize', alignTextToIllustration);
