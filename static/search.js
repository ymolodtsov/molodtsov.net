// Instant search over the Pagefind index built in `npm run build`.
// Without the index (e.g. under `hugo server`) the form falls back to DuckDuckGo.
(function () {
  var form = document.querySelector("[data-search]");
  var panel = document.getElementById("search-results");
  if (!form || !panel) return;

  var input = form.querySelector('input[type="search"]');
  var pagefind = null;
  var unavailable = false;
  var latestQuery = "";
  var results = [];

  function load() {
    if (pagefind || unavailable) return Promise.resolve(pagefind);
    return import("/pagefind/pagefind.js")
      .then(function (module) {
        pagefind = module;
        return pagefind.options({ excerptLength: 26 }).then(function () {
          return pagefind;
        });
      })
      .catch(function () {
        unavailable = true;
        return null;
      });
  }

  function close() {
    panel.hidden = true;
    panel.replaceChildren();
    results = [];
  }

  function render(items, query) {
    panel.replaceChildren();
    results = items;

    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "search-results__empty";
      empty.textContent = "Ничего не нашлось по запросу «" + query + "»";
      panel.append(empty);
    } else {
      var list = document.createElement("ol");
      list.className = "search-results__list";
      items.forEach(function (item) {
        var li = document.createElement("li");

        var link = document.createElement("a");
        link.className = "search-results__title";
        link.href = item.url;
        link.textContent = item.meta.title || item.url;

        var excerpt = document.createElement("p");
        excerpt.className = "search-results__excerpt";
        // Pagefind escapes the excerpt and only adds <mark> around matches.
        excerpt.innerHTML = item.excerpt;

        li.append(link, excerpt);

        if (item.meta.date) {
          var date = document.createElement("p");
          date.className = "search-results__date";
          date.textContent = item.meta.date;
          li.append(date);
        }

        list.append(li);
      });
      panel.append(list);
    }

    panel.hidden = false;
  }

  function search(query) {
    latestQuery = query;
    if (!query) {
      close();
      return;
    }

    load().then(function (pf) {
      if (!pf) return;
      return pf.debouncedSearch(query, {}, 160).then(function (search) {
        // A newer keystroke superseded this search.
        if (!search || query !== latestQuery) return;
        return Promise.all(
          search.results.slice(0, 10).map(function (r) {
            return r.data();
          })
        ).then(function (items) {
          if (query === latestQuery) render(items, query);
        });
      });
    });
  }

  input.addEventListener("focus", load, { once: true });

  input.addEventListener("input", function () {
    search(input.value.trim());
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      input.value = "";
      close();
      input.blur();
    }
  });

  form.addEventListener("submit", function (event) {
    if (unavailable) return;
    event.preventDefault();
    var query = input.value.trim();
    if (!query) return;
    if (results.length && query === latestQuery) {
      window.location.href = results[0].url;
      return;
    }
    // Enter pressed before the debounced results arrived.
    load().then(function (pf) {
      if (!pf) return form.submit();
      return pf.search(query).then(function (found) {
        if (!found.results.length) return search(query);
        return found.results[0].data().then(function (item) {
          window.location.href = item.url;
        });
      });
    });
  });

  document.addEventListener("click", function (event) {
    if (!panel.hidden && !panel.contains(event.target) && !form.contains(event.target)) {
      close();
    }
  });
})();
