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

    function duration() {
      return (fwd.duration && isFinite(fwd.duration)) ? fwd.duration : 5.04;
    }
    function clamp(t) {
      return Math.min(Math.max(t, 0), duration());
    }

    function playForward() {
      var D = duration();
      // If a rewind was in progress (or completed), continue forward from the
      // mirrored position so the figure picks up exactly where it left off.
      if (!rev.paused || rev.currentTime > 0) {
        fwd.currentTime = clamp(D - rev.currentTime);
      }
      rev.pause();
      rev.style.opacity = '0';
      fwd.style.opacity = '1';
      fwd.play().catch(function () {});
    }

    function playReverse() {
      var D = duration();
      fwd.pause();
      rev.currentTime = clamp(D - fwd.currentTime);
      rev.playbackRate = REWIND_RATE;
      fwd.style.opacity = '0';
      rev.style.opacity = '1';
      rev.play().catch(function () {});
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
  
  textColumns.style.top = illustrationTopRelativeToPaddingBox + 'px';
}

// Expose for page-transition.js to call after swapping to home (realign when DOM/image ready)
window.alignTextToIllustration = alignTextToIllustration;

// Run on load and resize; also run immediately if document already loaded (e.g. after in-page transition)
if (document.readyState === 'complete') {
  alignTextToIllustration();
  requestAnimationFrame(function() { alignTextToIllustration(); });
  setTimeout(alignTextToIllustration, 250);
  initIllustrationHover();
} else {
  window.addEventListener('load', function () {
    alignTextToIllustration();
    initIllustrationHover();
  });
}
window.addEventListener('resize', alignTextToIllustration);
