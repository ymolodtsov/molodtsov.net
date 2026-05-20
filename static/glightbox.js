(function () {
  function setupPhotoGrid() {
    var grid = document.querySelector("[data-photo-grid]");
    if (!grid) {
      return;
    }

    var items = Array.from(grid.querySelectorAll(".photos-grid__item"));
    var initialCount = Number(grid.getAttribute("data-initial-count")) || 80;
    var batchSize = Number(grid.getAttribute("data-batch-size")) || 80;
    var visibleCount = 0;
    var sentinel = document.createElement("div");
    sentinel.className = "photos-grid__sentinel";
    grid.after(sentinel);

    items.forEach(function (item, index) {
      if (index >= initialCount) {
        item.hidden = true;
      }
    });
    visibleCount = Math.min(initialCount, items.length);

    function revealMore() {
      var nextCount = Math.min(visibleCount + batchSize, items.length);
      for (var index = visibleCount; index < nextCount; index += 1) {
        items[index].hidden = false;
      }
      visibleCount = nextCount;

      if (visibleCount >= items.length) {
        sentinel.remove();
        if (observer) {
          observer.disconnect();
        }
      }
    }

    var observer = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          revealMore();
        }
      }, { rootMargin: "800px" });
      observer.observe(sentinel);
    } else {
      while (visibleCount < items.length) {
        revealMore();
      }
    }
  }

  function closeLightbox() {
    var existing = document.querySelector(".local-lightbox");
    if (existing) {
      existing.remove();
    }
    document.body.classList.remove("local-lightbox-open");
  }

  function openLightbox(link) {
    closeLightbox();

    var overlay = document.createElement("div");
    overlay.className = "local-lightbox";
    overlay.innerHTML =
      '<button class="local-lightbox__close" type="button" aria-label="Close">×</button>' +
      '<figure class="local-lightbox__figure">' +
      '<img class="local-lightbox__image" alt="">' +
      '<figcaption class="local-lightbox__caption"></figcaption>' +
      "</figure>";

    var image = overlay.querySelector(".local-lightbox__image");
    var caption = overlay.querySelector(".local-lightbox__caption");
    image.src = link.href;
    image.alt = link.querySelector("img")?.alt || "";

    var title = "";
    var postUrl = link.getAttribute("data-post-url") || "";
    if (link.hasAttribute("data-caption")) {
      title = link.getAttribute("data-caption") || "";
    } else {
      var metadata = link.getAttribute("data-glightbox") || "";
      var titleMatch = metadata.match(/title:([^;]+)/);
      if (titleMatch) {
        title = titleMatch[1];
      }
      var postMatch = metadata.match(/href=['"]([^'"]+)['"]/);
      if (!postUrl && postMatch) {
        postUrl = postMatch[1];
      }
    }

    if (title && postUrl) {
      var captionLink = document.createElement("a");
      captionLink.href = postUrl;
      captionLink.textContent = title;
      caption.appendChild(captionLink);
    } else {
      caption.textContent = title;
    }

    overlay.addEventListener("click", function (event) {
      if (
        event.target === overlay ||
        event.target.classList.contains("local-lightbox__close")
      ) {
        closeLightbox();
      }
    });

    document.body.appendChild(overlay);
    document.body.classList.add("local-lightbox-open");
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a.glightbox");
    if (!link) {
      return;
    }

    event.preventDefault();
    openLightbox(link);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupPhotoGrid);
  } else {
    setupPhotoGrid();
  }
})();
