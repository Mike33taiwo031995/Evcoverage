(() => {
  "use strict";

  const historyKey = "evInsuranceGuide:recentlyRead:v1";
  const readRoot = document.querySelector("[data-read-title]");
  const listPage = document.querySelector(".blog-list-page");

  function readHistory() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(historyKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(items) {
    try {
      window.localStorage.setItem(historyKey, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  }

  if (readRoot) {
    const current = {
      title: readRoot.dataset.readTitle || "EV insurance guide",
      url: readRoot.dataset.readUrl || window.location.pathname,
      date: Date.now()
    };
    const history = readHistory().filter((item) => item && item.url !== current.url);
    history.unshift(current);
    saveHistory(history.slice(0, 8));
  }

  if (listPage) {
    const recentSection = listPage.querySelector("[data-recent-section]");
    const recentList = listPage.querySelector("[data-recent-list]");
    const clearRecent = listPage.querySelector("[data-recent-clear]");

    function renderHistory() {
      if (!recentSection || !recentList) return;
      const entries = readHistory()
        .filter((item) => item && typeof item.title === "string" && typeof item.url === "string" && item.url.startsWith("/blog/"))
        .slice(0, 4);
      recentList.replaceChildren();
      recentSection.hidden = entries.length === 0;
      entries.forEach((item) => {
        const row = document.createElement("li");
        const link = document.createElement("a");
        link.href = item.url;
        link.textContent = item.title;
        row.append(link);
        recentList.append(row);
      });
    }

    clearRecent?.addEventListener("click", () => {
      saveHistory([]);
      renderHistory();
    });
    renderHistory();

    const search = listPage.querySelector("#blog-search");
    const clearSearch = listPage.querySelector("[data-search-clear]");
    const status = listPage.querySelector("#blog-search-status");
    const cards = [...listPage.querySelectorAll("[data-blog-card]")];
    const noResults = listPage.querySelector("[data-no-results]");
    const filterButtons = [...listPage.querySelectorAll("[data-category-filter]")];
    let activeCategory = "all";
    let bodyIndex = new Map();

    try {
      const source = document.getElementById("blog-search-index");
      const records = JSON.parse(source?.textContent || "[]");
      bodyIndex = new Map(records.map((record) => [
        record.url,
        [record.title, record.description, ...(record.categories || []), ...(record.tags || []), record.content || ""]
          .join(" ")
          .toLocaleLowerCase()
      ]));
    } catch {
      // Visible titles, summaries, and topic labels remain searchable if the optional body index is unavailable.
    }

    function filterCards() {
      const query = (search?.value || "").trim().toLocaleLowerCase();
      let visible = 0;
      cards.forEach((card) => {
        const titleLink = card.querySelector("h3 a");
        const searchableText = `${card.dataset.search || ""} ${bodyIndex.get(titleLink?.getAttribute("href")) || ""}`.toLocaleLowerCase();
        const categoryMatch = activeCategory === "all" || (card.dataset.categories || "").split("|").includes(activeCategory);
        const queryMatch = !query || searchableText.includes(query);
        const show = categoryMatch && queryMatch;
        card.hidden = !show;
        if (show) visible += 1;
      });

      if (noResults) noResults.hidden = visible !== 0;
      if (status) {
        if (query || activeCategory !== "all") {
          status.textContent = `${visible} ${visible === 1 ? "guide" : "guides"} found${query ? ` for “${search.value.trim()}”` : ""}.`;
        } else {
          status.textContent = `Showing all ${cards.length} guides. Search article text, summaries and topics.`;
        }
      }
      if (clearSearch) clearSearch.hidden = !query;
    }

    search?.addEventListener("input", filterCards);
    clearSearch?.addEventListener("click", () => {
      search.value = "";
      search.focus();
      filterCards();
    });

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.categoryFilter || "all";
        filterButtons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-pressed", String(isActive));
        });
        filterCards();
      });
    });
    filterCards();
  }

  const carousel = document.querySelector("[data-ev-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-carousel-track]");
  const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
  const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
  const previous = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  const pauseButton = carousel.querySelector("[data-carousel-pause]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let timer = 0;
  let pausedByUser = reduceMotion.matches;
  const pauseReasons = new Set();

  if (reduceMotion.matches && pauseButton) {
    pauseButton.textContent = "▶";
    pauseButton.disabled = true;
    pauseButton.setAttribute("aria-pressed", "true");
    pauseButton.setAttribute("aria-label", "Automatic slides are off because reduced motion is enabled");
  }

  function goTo(index) {
    if (!slides.length || !track) return;
    activeIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${activeIndex * 100}%)`;
    slides.forEach((slide, position) => {
      const isActive = position === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.inert = !isActive;
    });
    dots.forEach((dot, position) => {
      const isActive = position === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", String(isActive));
    });
  }

  function stopTimer() {
    window.clearInterval(timer);
    timer = 0;
  }

  function startTimer() {
    stopTimer();
    if (pausedByUser || pauseReasons.size || document.hidden || reduceMotion.matches) return;
    timer = window.setInterval(() => goTo(activeIndex + 1), 6500);
  }

  previous?.addEventListener("click", () => {
    goTo(activeIndex - 1);
    startTimer();
  });
  next?.addEventListener("click", () => {
    goTo(activeIndex + 1);
    startTimer();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.dataset.carouselDot) || 0);
      startTimer();
    });
  });

  pauseButton?.addEventListener("click", () => {
    pausedByUser = !pausedByUser;
    pauseButton.textContent = pausedByUser ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-pressed", String(pausedByUser));
    pauseButton.setAttribute("aria-label", pausedByUser ? "Play featured vehicle slides" : "Pause featured vehicle slides");
    startTimer();
  });

  carousel.addEventListener("mouseenter", () => {
    pauseReasons.add("pointer");
    stopTimer();
  });
  carousel.addEventListener("mouseleave", () => {
    pauseReasons.delete("pointer");
    startTimer();
  });
  carousel.addEventListener("focusin", () => {
    pauseReasons.add("focus");
    stopTimer();
  });
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) {
      pauseReasons.delete("focus");
      startTimer();
    }
  });
  document.addEventListener("visibilitychange", startTimer);
  reduceMotion.addEventListener?.("change", (event) => {
    pausedByUser = event.matches;
    if (pauseButton) {
      pauseButton.disabled = event.matches;
      pauseButton.textContent = event.matches ? "▶" : "Ⅱ";
      pauseButton.setAttribute("aria-pressed", String(event.matches));
      pauseButton.setAttribute("aria-label", event.matches
        ? "Automatic slides are off because reduced motion is enabled"
        : "Pause featured vehicle slides");
    }
    startTimer();
  });

  goTo(0);
  startTimer();
})();
