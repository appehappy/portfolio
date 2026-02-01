/**
 * Writing Section
 * 
 * Loads articles from data/articles.json, renders list, handles article selection
 * and display. Supports deep linking via URL hash.
 */

(function() {
  let articles = [];
  let selectedArticleId = null;

  function init() {
    loadArticles().then(function() {
      renderArticleList();
      const hash = window.location.hash.slice(1);
      if (hash) {
        selectArticle(hash);
      } else if (articles.length > 0) {
        selectArticle(articles[0].id);
      }
      bindEvents();
      alignArticleListToIllustration();
      window.addEventListener('resize', alignArticleListToIllustration);
      var illustrationMedia = document.querySelector('.writing-page .illustration img, .writing-page .illustration video');
      if (illustrationMedia) {
        if (illustrationMedia.tagName === 'IMG') {
          if (illustrationMedia.complete) {
            alignArticleListToIllustration();
          } else {
            illustrationMedia.addEventListener('load', alignArticleListToIllustration);
          }
        } else {
          if (illustrationMedia.readyState >= 2) {
            alignArticleListToIllustration();
          } else {
            illustrationMedia.addEventListener('loadeddata', alignArticleListToIllustration, { once: true });
            illustrationMedia.addEventListener('loadedmetadata', alignArticleListToIllustration, { once: true });
          }
        }
      }
      initIllustrationHover();
    }).catch(function(err) {
      document.querySelector('.article-list-placeholder').textContent = 'Unable to load articles.';
    });
  }

  function alignArticleListToIllustration() {
    var container = document.querySelector('.writing-page .illustration');
    var articleList = document.querySelector('.article-list');
    var pageFrame = document.querySelector('.writing-page');
    if (!container || !articleList || !pageFrame) return;

    var pageRect = pageFrame.getBoundingClientRect();
    var borderWidth = parseInt(getComputedStyle(pageFrame).borderTopWidth) || 0;
    var illustrationRect = container.getBoundingClientRect();

    /* Align top of first article text to top of illustration box (img including border) */
    var illustrationTopRelative = illustrationRect.top - (pageRect.top + borderWidth);
    var firstEntryPadding = 4; /* article-list-entry padding-top */
    articleList.style.top = (illustrationTopRelative - firstEntryPadding) + 'px';
  }

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

  function loadArticles() {
    return fetch('data/articles.json')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        articles = (data.articles || []).sort(function(a, b) {
          return new Date(b.date) - new Date(a.date);
        });
        return articles;
      });
  }

  function renderArticleList() {
    const container = document.querySelector('.article-list');
    const placeholder = document.querySelector('.article-list-placeholder');
    
    if (articles.length === 0) {
      placeholder.textContent = 'No articles yet.';
      return;
    }

    placeholder.remove();
    articles.forEach(function(article) {
      const entry = document.createElement('a');
      entry.href = '#';
      entry.className = 'article-list-entry';
      entry.dataset.id = article.id;
      entry.innerHTML = 
        '<span class="article-list-entry-title">' + escapeHtml(article.title) + '</span>' +
        '<span class="article-list-entry-date">' + escapeHtml(article.dateFormatted) + '</span>';
      entry.addEventListener('click', function(e) {
        e.preventDefault();
        selectArticle(article.id);
      });
      container.appendChild(entry);
    });
  }

  function selectArticle(id) {
    const article = articles.find(function(a) { return a.id === id; });
    if (!article) return;

    selectedArticleId = id;
    window.location.hash = id;

    // Update list active state
    document.querySelectorAll('.article-list-entry').forEach(function(entry) {
      entry.classList.toggle('active', entry.dataset.id === id);
    });

    // Render article content
    const contentEl = document.querySelector('.article-content');
    contentEl.classList.remove('empty');

    document.querySelector('.article-date').textContent = article.dateFormatted;
    document.querySelector('.article-title').textContent = article.title;

    const imgEl = document.querySelector('.article-image');
    imgEl.src = article.imageUrl || '';
    imgEl.alt = article.title;
    imgEl.parentElement.style.display = article.imageUrl ? 'block' : 'none';

    const subheadEl = document.querySelector('.article-subhead');
    subheadEl.textContent = article.subhead || '';
    subheadEl.style.display = article.subhead ? 'block' : 'none';

    const bodyEl = document.querySelector('.article-body');
    bodyEl.innerHTML = article.content || '';
  }

  function bindEvents() {
    // List/Grid toggle (Grid disabled for now)
    document.querySelectorAll('.toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (btn.disabled) return;
        document.querySelectorAll('.toggle-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });

    // Hash change for browser back/forward
    window.addEventListener('hashchange', function() {
      const hash = window.location.hash.slice(1);
      if (hash && hash !== selectedArticleId) {
        selectArticle(hash);
      }
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
