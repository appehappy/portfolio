/**
 * Project History
 *
 * Expand/collapse for the project list. One project open at a time; clicking
 * an open row closes it. Escape closes the open row. A URL hash matching a
 * project's id opens that project on load.
 *
 * Opening a row also scrolls the list so the row's title stays in view and as
 * much of the project as fits is shown. The scroll runs on the same duration
 * and curve as the row's own opening (tokens.css), so the rows and the scroll
 * move as one gesture.
 */

(function () {
  function init() {
    var list = document.querySelector('.history-list');
    if (!list || list.dataset.ready) return;
    list.dataset.ready = '1';

    var items = Array.prototype.slice.call(list.querySelectorAll('.history-item'));
    var M = window.Motion;

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

    // Apply a state with every transition in the list off for that one
    // style update (the next real change transitions from it as normal)
    function instantly(fn) {
      list.classList.add('is-instant');
      fn();
      void list.offsetHeight;
      list.classList.remove('is-instant');
    }

    // Where the list should scroll to once `item` is open: its title stays in
    // view, and as much of the rest of it as fits is revealed
    function scrollTarget(item) {
      var view = list.clientHeight;
      var top = list.scrollTop + item.getBoundingClientRect().top - list.getBoundingClientRect().top;
      var target = Math.max(list.scrollTop, top + item.offsetHeight - view);
      target = Math.min(target, top);
      return Math.max(0, Math.min(target, list.scrollHeight - view));
    }

    var scrollRun = 0;

    function stopScroll() {
      scrollRun++;
    }

    function scrollListTo(target, durationMs, ease) {
      var run = ++scrollRun;
      var from = list.scrollTop;
      if (Math.abs(target - from) < 1 || !M || M.reduced()) {
        list.scrollTop = target;
        return;
      }
      var start = null;
      requestAnimationFrame(function step(now) {
        if (run !== scrollRun) return;
        if (start === null) start = now;
        var t = Math.min((now - start) / durationMs, 1);
        list.scrollTop = from + (target - from) * ease(t);
        if (t < 1) requestAnimationFrame(step);
      });
    }

    // The visitor's own scrolling always wins over ours
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (type) {
      list.addEventListener(type, stopScroll, { passive: true });
    });

    function openItem(item) {
      var others = items.filter(function (other) {
        return other !== item && other.classList.contains('is-open');
      });

      // Measure where the scroll has to land by applying the final state,
      // reading it, and putting the current state back, all with transitions
      // off and before the next paint. Then make the real change.
      // (The trial state can clamp the scroll position, so it's restored too.)
      var target;
      var scrolled = list.scrollTop;
      instantly(function () {
        others.forEach(function (other) { setOpen(other, false); });
        setOpen(item, true);
        target = scrollTarget(item);
        others.forEach(function (other) { setOpen(other, true); });
        setOpen(item, false);
      });
      list.scrollTop = scrolled;

      others.forEach(function (other) { setOpen(other, false); });
      setOpen(item, true);
      scrollListTo(target, M ? M.ms('dur-4') : 460, M ? M.curve('ease-out') : function (t) { return t; });

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
    var initial = hash ? document.getElementById(hash) : null;
    if (!initial || !initial.classList.contains('history-item')) initial = items[0];
    if (initial) {
      instantly(function () { setOpen(initial, true); });
      list.scrollTop = scrollTarget(initial);
    }
  }

  /* Exposed so page-transition.js can initialise nodes it has just swapped in */
  window.initProjectHistory = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
