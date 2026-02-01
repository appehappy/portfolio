/**
 * Main JavaScript
 * 
 * Progressive enhancement for layout alignment.
 */

// Align text columns to top of illustration
function alignTextToIllustration() {
  const illustration = document.querySelector('.illustration img');
  const textColumns = document.querySelector('.text-columns');
  
  if (illustration && textColumns) {
    // Wait for image to load to get accurate height
    if (illustration.complete) {
      positionTextColumns(illustration, textColumns);
    } else {
      illustration.addEventListener('load', () => {
        positionTextColumns(illustration, textColumns);
      });
    }
  }
}

function positionTextColumns(illustration, textColumns) {
  const pageFrame = document.querySelector('.page-frame');
  const illustrationImg = illustration;
  
  // Get positions relative to viewport
  const pageFrameRect = pageFrame.getBoundingClientRect();
  const illustrationRect = illustrationImg.getBoundingClientRect();
  
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
} else {
  window.addEventListener('load', alignTextToIllustration);
}
window.addEventListener('resize', alignTextToIllustration);
