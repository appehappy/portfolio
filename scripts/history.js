/**
 * Project History
 *
 * Expand/collapse for the project list. One project open at a time; clicking
 * an open row closes it. Escape closes the open row. A URL hash matching a
 * project's id opens that project on load.
 */

(function () {
  function init() {
    var list = document.querySelector('.history-list');
    if (!list) return;

    var items = Array.prototype.slice.call(list.querySelectorAll('.history-item'));

    function setOpen(item, open) {
      var toggle = item.querySelector('.history-item-toggle');
      var body = item.querySelector('.history-body');
      item.classList.toggle('is-open', open);
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (body) {
        // Closed bodies are clipped to zero height; `inert` also keeps their
        // content out of the tab order and the accessibility tree.
        if (open) body.removeAttribute('inert');
        else body.setAttribute('inert', '');
      }
    }

    function openItem(item) {
      items.forEach(function (other) {
        if (other !== item && other.classList.contains('is-open')) setOpen(other, false);
      });
      setOpen(item, true);

      // Keep the opened row's title in view inside the scrolling list.
      var toggle = item.querySelector('.history-item-toggle');
      if (toggle && typeof toggle.scrollIntoView === 'function') {
        toggle.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }

      if (item.id && history.replaceState) {
        history.replaceState(history.state, '', '#' + item.id);
      }
    }

    function closeItem(item) {
      setOpen(item, false);
      if (history.replaceState && window.location.hash === '#' + item.id) {
        history.replaceState(history.state, '', window.location.pathname + window.location.search);
      }
    }

    items.forEach(function (item) {
      var toggle = item.querySelector('.history-item-toggle');
      if (!toggle) return;
      toggle.addEventListener('click', function () {
        if (item.classList.contains('is-open')) closeItem(item);
        else openItem(item);
      });
    });

    list.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = items.filter(function (item) { return item.classList.contains('is-open'); })[0];
      if (!open) return;
      closeItem(open);
      var toggle = open.querySelector('.history-item-toggle');
      if (toggle) toggle.focus();
    });

    // Initial state: #<project-id> opens that project; otherwise the first
    // (most recent) project starts open. Neither animates.
    var hash = window.location.hash.slice(1);
    var target = hash ? document.getElementById(hash) : null;
    if (!target || !target.classList.contains('history-item')) target = items[0];
    if (target) {
      var body = target.querySelector('.history-body');
      if (body) body.style.transition = 'none';
      setOpen(target, true);
      requestAnimationFrame(function () {
        if (body) body.style.transition = '';
        var toggle = target.querySelector('.history-item-toggle');
        if (toggle && typeof toggle.scrollIntoView === 'function') {
          toggle.scrollIntoView({ block: 'nearest' });
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
