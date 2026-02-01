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

// Illustration video: play on hover, pause on mouse leave (preloaded for instant play)
function initIllustrationHover() {
  document.querySelectorAll('.illustration video').forEach(function (video) {
    video.addEventListener('mouseenter', function () {
      video.play().catch(function () {});
    });
    video.addEventListener('mouseleave', function () {
      video.pause();
      video.currentTime = 0;
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
