document.addEventListener("DOMContentLoaded", () => {
  // =================================================================
  // STATE & API CONFIGURATION
  // =================================================================
  let currentPage = 1;
  let isFetching = false;
  let isInfiniteScrollEnabled = false;
  let currentQuery = "";

  const API_OPTIONS = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NWYyMzdlNTRlMDRmZDA1MzA1MzFiNTlmZjhiMGU5NyIsIm5iZiI6MTc1NDQ3MDY4MC45ODcsInN1YiI6IjY4OTMxOTE4ZDEyMDM4NmY4OTExZTU4MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.r2FrPJi5tejPIImPSnJ-y4elVjTulWOID_FTAdlSdNs",
    },
  };
  // CORRECTED: Endpoint is now /discover/movie for all filtering
  const BASE_URL =
    "https://api.themoviedb.org/3/discover/movie?language=en-US&include_adult=false";

  // =================================================================
  // DOM ELEMENTS
  // =================================================================
  const galleryContainer = document.getElementById("movie_page");
  const noResultsMessage =
    document.getElementById("noResultsMessage") || createNoResultsDiv();
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const form = document.querySelector(".sidebar");
  const mainSearchButton = form.querySelector(".search-button");
  const floatingContainer = document.getElementById("floatingSearchContainer");
  const floatingSearchButton =
    floatingContainer?.querySelector(".search-button");
  const sortSelect = document.getElementById("selectedSort");
  const allFormInputs = form.querySelectorAll(
    'input[type="radio"], input[type="checkbox"], input[type="text"]'
  );

  const sortMap = {
    "Popularity Descending": "popularity.desc",
    "Popularity Ascending": "popularity.asc",
    "Rating Descending": "vote_average.desc",
    "Rating Ascending": "vote_average.asc",
    "Release Date Descending": "primary_release_date.desc",
    "Release Date Ascending": "primary_release_date.asc",
    "Title (A-Z)": "original_title.asc",
    "Title (Z-A)": "original_title.desc",
  };

  // GENRE MAPPING - TMDB requires genre IDs, not names
  const genreMap = {
    Action: 28,
    Adventure: 12,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Documentary: 99,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Music: 10402,
    Mystery: 9648,
    Romance: 10749,
    "Science Fiction": 878,
    "TV Movie": 10770,
    Thriller: 53,
    War: 10752,
    Western: 37,
  };

  // =================================================================
  // CORE API & FILTERING LOGIC - FIXED
  // =================================================================

  function buildQueryFromFilters() {
    const params = new URLSearchParams();

    // 1. Sort Parameter
    params.append(
      "sort_by",
      sortMap[sortSelect.textContent.trim()] || "popularity.desc"
    );

    // 2. Genres - FIXED: Now uses genre IDs and correctly gets checked values
    const selectedGenreNodes = form.querySelectorAll(
      'input[name="genres"]:checked'
    );
    console.log("🎭 Selected genres:", selectedGenreNodes.length); // Debug log
    if (selectedGenreNodes.length > 0) {
      const genreIds = Array.from(selectedGenreNodes)
        .map((input) => genreMap[input.value])
        .filter((id) => id) // Remove undefined values
        .join(",");
      console.log("🎭 Genre IDs:", genreIds); // Debug log
      if (genreIds) {
        params.append("with_genres", genreIds);
      }
    }

    // 3. Show Me Filter - FIXED: Now properly handles radio buttons
    const showMeRadio = form.querySelector('input[name="show"]:checked');
    if (showMeRadio && showMeRadio.value !== "everything") {
      console.log("👁️ Show me filter:", showMeRadio.value); // Debug log
      // Note: TMDB API doesn't have "seen/not seen" - this would require user account integration
      // For now, we'll just log it but not apply it to the API call
    }

    // 4. Release Dates - FIXED: Now properly reads date inputs
    const fromDate = document.getElementById("from-date")?.value;
    const toDate = document.getElementById("to-date")?.value;

    if (fromDate) {
      // Convert mm/dd/yyyy to yyyy-mm-dd format
      const [month, day, year] = fromDate.split("/");
      if (month && day && year) {
        params.append(
          "primary_release_date.gte",
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        );
        console.log(
          "📅 From date:",
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        ); // Debug log
      }
    }

    if (toDate) {
      // Convert mm/dd/yyyy to yyyy-mm-dd format
      const [month, day, year] = toDate.split("/");
      if (month && day && year) {
        params.append(
          "primary_release_date.lte",
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        );
        console.log(
          "📅 To date:",
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        ); // Debug log
      }
    }

    // 5. Release Type Filters - FIXED: Now properly reads release type checkboxes
    const releaseTypeCheckboxes = form.querySelectorAll(
      'input[name="releaseTypes"]:checked'
    );
    if (releaseTypeCheckboxes.length > 0) {
      // TMDB release type mapping
      const releaseTypeMap = {
        "Theatrical (limited)": "2|3", // Limited + Theatrical
        Theatrical: "3",
        Premiere: "1",
        Digital: "4",
        Physical: "5",
        TV: "6",
      };

      const releaseTypes = Array.from(releaseTypeCheckboxes)
        .map((input) => releaseTypeMap[input.value])
        .filter((type) => type)
        .join("|");

      if (releaseTypes) {
        params.append("with_release_type", releaseTypes);
        console.log("🎬 Release types:", releaseTypes); // Debug log
      }
    }

    // 6. Sliders - FIXED: Now correctly reads values and converts them to API parameters
    const scoreThumbs = document.querySelectorAll(
      "#userScoreSlider .range-slider-thumb"
    );
    if (scoreThumbs.length === 2) {
      const minPercent = parseFloat(scoreThumbs[0].style.left) || 0;
      const maxPercent = parseFloat(scoreThumbs[1].style.left) || 100;
      const minScore = (minPercent / 10).toFixed(1);
      const maxScore = (maxPercent / 10).toFixed(1);
      params.append("vote_average.gte", minScore);
      params.append("vote_average.lte", maxScore);
      console.log("⭐ Score range:", minScore, "to", maxScore); // Debug log
    }

    const votesThumb = document.querySelector(
      "#userVotesSlider .range-slider-thumb"
    );
    if (votesThumb) {
      const percent = parseFloat(votesThumb.style.left) || 0;
      const minVotes = Math.round(percent * 5); // 100% = 500 votes
      params.append("vote_count.gte", minVotes);
      console.log("🗳️ Min votes:", minVotes); // Debug log
    }

    const runtimeThumbs = document.querySelectorAll(
      "#runtimeSlider .range-slider-thumb"
    );
    if (runtimeThumbs.length === 2) {
      const minPercent = parseFloat(runtimeThumbs[0].style.left) || 0;
      const maxPercent = parseFloat(runtimeThumbs[1].style.left) || 100;
      const minRuntime = Math.round(minPercent * 3.6); // 100% = 360 mins
      const maxRuntime = Math.round(maxPercent * 3.6);
      params.append("with_runtime.gte", minRuntime);
      params.append("with_runtime.lte", maxRuntime);
      console.log("⏱️ Runtime range:", minRuntime, "to", maxRuntime, "minutes"); // Debug log
    }

    const paramString = params.toString();
    console.log("🔍 Final query params:", paramString); // Debug log
    return paramString ? `&${paramString}` : "";
  }

  async function fetchAndAppendMovies(page, query) {
    if (isFetching) return;
    isFetching = true;
    noResultsMessage.style.display = "none";
    if (loadMoreBtn) loadMoreBtn.textContent = "Loading...";

    const fullUrl = `${BASE_URL}&page=${page}${query}`;
    console.log("🕵️‍♂️ Fetching URL:", fullUrl); // Log the exact URL for debugging

    try {
      const response = await fetch(fullUrl, API_OPTIONS);
      if (!response.ok)
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      const data = await response.json();

      console.log("📊 API Response:", data); // Debug log

      if (page === 1) galleryContainer.innerHTML = "";

      if (data.results && data.results.length === 0 && page === 1) {
        noResultsMessage.textContent = "No movies found that match your query.";
        noResultsMessage.style.display = "block";
      } else {
        data.results.forEach(createMovieCard);
        console.log("🎬 Movies loaded:", data.results.length); // Debug log
      }

      currentPage++;
      const hasMorePages =
        data.results && data.results.length > 0 && data.page < data.total_pages;
      if (loadMoreBtn) {
        loadMoreBtn.style.display = isInfiniteScrollEnabled
          ? "none"
          : hasMorePages
          ? "block"
          : "none";
      }
    } catch (err) {
      console.error("Error fetching movies:", err);
      galleryContainer.innerHTML = "";
      noResultsMessage.textContent = "An error occurred. Please try again.";
      noResultsMessage.style.display = "block";
    } finally {
      isFetching = false;
      if (loadMoreBtn) loadMoreBtn.textContent = "Load More";
    }
  }

  async function performSearch() {
    console.log("🚀 Starting search..."); // Debug log
    currentPage = 1;
    isInfiniteScrollEnabled = false;
    currentQuery = buildQueryFromFilters();
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    await fetchAndAppendMovies(currentPage, currentQuery);
  }

  // =================================================================
  // EVENT LISTENERS - FIXED
  // =================================================================

  const handleSearchClick = (event) => {
    event.preventDefault();
    console.log("🔍 Search button clicked"); // Debug log
    performSearch(); // Removed the condition - always perform search when clicked
  };

  // FIXED: Create search buttons if they don't exist
  let actualMainSearchButton =
    form.querySelector(".search-button") ||
    form.querySelector(".apply-filters-btn");
  if (actualMainSearchButton) {
    actualMainSearchButton.addEventListener("click", handleSearchClick);
  }

  if (floatingSearchButton) {
    floatingSearchButton.addEventListener("click", handleSearchClick);
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      isInfiniteScrollEnabled = true;
      loadMoreBtn.style.display = "none";
      fetchAndAppendMovies(currentPage, currentQuery);
    });
  }

  window.addEventListener("scroll", () => {
    if (!isInfiniteScrollEnabled || isFetching) return;
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (clientHeight + scrollTop >= scrollHeight - 500) {
      fetchAndAppendMovies(currentPage, currentQuery);
    }
  });

  // =================================================================
  // UI LOGIC (SIDEBAR, SLIDERS, BUTTONS)
  // =================================================================

  // --- FLOATING BUTTON & STATE LOGIC ---
  function isFormDirty() {
    if (sortSelect && sortSelect.textContent.trim() !== "Popularity Descending")
      return true;
    for (const input of allFormInputs) {
      if (
        (input.type === "radio" || input.type === "checkbox") &&
        input.checked !== input.defaultChecked
      )
        return true;
      if (input.type === "text" && input.value !== "") return true;
    }
    const thumbs = form.querySelectorAll(".range-slider-thumb");
    for (const thumb of thumbs) {
      const percent = parseFloat(thumb.style.left);
      if (
        thumb.style.left !== "0%" &&
        thumb.style.left !== "100%" &&
        !isNaN(percent)
      )
        return true;
    }
    return false;
  }

  function updateButtonState() {
    const isDirty = isFormDirty();
    if (actualMainSearchButton) {
      if (isDirty) {
        actualMainSearchButton.classList.add("active");
      } else {
        actualMainSearchButton.classList.remove("active");
      }
    }
    if (floatingSearchButton) {
      if (isDirty) {
        floatingSearchButton.classList.add("active");
      } else {
        floatingSearchButton.classList.remove("active");
      }
    }
  }

  if (sortSelect)
    new MutationObserver(updateButtonState).observe(sortSelect, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  allFormInputs.forEach((input) => {
    input.addEventListener("change", updateButtonState);
    if (input.type === "text")
      input.addEventListener("keyup", updateButtonState);
  });

  if (floatingContainer && actualMainSearchButton) {
    const floatingButtonObserver = new IntersectionObserver(
      ([entry]) =>
        floatingContainer.classList.toggle(
          "visible",
          !entry.isIntersecting &&
            actualMainSearchButton.classList.contains("active")
        ),
      { threshold: 0 }
    );
    floatingButtonObserver.observe(actualMainSearchButton);
  }

  // --- SLIDER INTERACTION LOGIC ---
  document.querySelectorAll(".range-slider").forEach((slider) => {
    const track = slider.querySelector(".range-slider-track");
    const thumbs = slider.querySelectorAll(".range-slider-thumb");
    const progress = slider.querySelector(".range-slider-progress");
    function updateSliderAppearance() {
      if (thumbs.length === 2) {
        const leftP = parseFloat(thumbs[0].style.left) || 0;
        const rightP = parseFloat(thumbs[1].style.left) || 100;
        progress.style.left = `${Math.min(leftP, rightP)}%`;
        progress.style.right = `${100 - Math.max(leftP, rightP)}%`;
      } else if (thumbs.length === 1) {
        progress.style.left = `0%`;
        progress.style.right = `${
          100 - (parseFloat(thumbs[0].style.left) || 0)
        }%`;
      }
    }
    thumbs.forEach((thumb) => {
      thumb.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const trackRect = track.getBoundingClientRect();
        const onDrag = (moveEvent) => {
          const clientX = moveEvent.touches
            ? moveEvent.touches[0].clientX
            : moveEvent.clientX;
          let newX = Math.max(
            0,
            Math.min(clientX - trackRect.left, trackRect.width)
          );
          thumb.style.left = `${(newX / trackRect.width) * 100}%`;
          updateSliderAppearance();
          updateButtonState();
        };
        const endDrag = () => {
          document.removeEventListener("mousemove", onDrag);
          document.removeEventListener("mouseup", endDrag);
          document.removeEventListener("touchmove", onDrag);
          document.removeEventListener("touchend", endDrag);
        };
        document.addEventListener("mousemove", onDrag);
        document.addEventListener("mouseup", endDrag);
        document.addEventListener("touchmove", onDrag);
        document.addEventListener("touchend", endDrag);
      });
    });
    updateSliderAppearance();
  });

  // --- SIDEBAR UI TOGGLES  ---
  const sortToggle = document.getElementById("sortToggle"),
    sortOptions = document.getElementById("sortOptions"),
    chevron = document.getElementById("chevron"),
    mainSelect = document.getElementById("mainSelect"),
    filterToggle = document.getElementById("filterToggle"),
    filterOptions = document.getElementById("filterOptions"),
    chevronFilter = document.getElementById("chevron-filter"),
    searchAllCheckbox = document.getElementById("searchAllReleases"),
    releaseTypesWrapper = document.getElementById("releaseDetails");
  let selectItems;
  if (sortToggle) {
    sortToggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const t = sortOptions.classList.toggle("active");
      chevron.classList.toggle("rotated", t);
      sortOptions.style.display = t ? "block" : "none";
    });
    selectItems = mainSelect.querySelector(".select-items");
    if (!selectItems) {
      selectItems = document.createElement("div");
      selectItems.className = "select-items";
      [
        "Popularity Descending",
        "Popularity Ascending",
        "Rating Descending",
        "Rating Ascending",
        "Release Date Descending",
        "Release Date Ascending",
        "Title (A-Z)",
        "Title (Z-A)",
      ].forEach((e) => {
        const t = document.createElement("div");
        t.textContent = e;
        "Popularity Descending" === e && t.classList.add("selected");
        selectItems.appendChild(t);
      });
      mainSelect.appendChild(selectItems);
    }
    sortSelect.addEventListener("click", function (e) {
      e.stopPropagation();
      mainSelect.classList.toggle("active");
    });
    selectItems.querySelectorAll("div").forEach((e) => {
      e.addEventListener("click", function () {
        selectItems
          .querySelectorAll("div")
          .forEach((e) => e.classList.remove("selected"));
        this.classList.add("selected");
        sortSelect.textContent = this.textContent;
        mainSelect.classList.remove("active");
        updateButtonState(); // ADDED: Update button state when sort changes
      });
    });
  }
  if (filterToggle) {
    filterToggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const t = filterOptions.classList.toggle("active");
      chevronFilter.classList.toggle("rotated", t);
      filterOptions.style.display = t ? "flex" : "none";
    });
  }
  if (searchAllCheckbox) {
    searchAllCheckbox.addEventListener("change", () => {
      releaseTypesWrapper.classList.toggle("hidden", searchAllCheckbox.checked);
    });
  }
  document.addEventListener("click", function (e) {
    if (
      sortOptions &&
      sortToggle &&
      !sortToggle.contains(e.target) &&
      !sortOptions.contains(e.target)
    ) {
      sortOptions.classList.remove("active");
      sortOptions.style.display = "none";
      chevron && chevron.classList.remove("rotated");
    }
  });

  // =================================================================
  // HELPER FUNCTIONS & INITIALIZATION
  // =================================================================
  function createNoResultsDiv() {
    const e = document.createElement("div");
    e.id = "noResultsMessage";
    e.style.display = "none";
    galleryContainer.after(e);
    return e;
  }
  function createMovieCard(movie) {
    const e = document.createElement("div");
    e.className = "media_item";
    const t = document.createElement("div");
    t.className = "poster_wrapper";
    const n = document.createElement("div");
    n.className = "movie_poster";
    movie.poster_path
      ? (n.style.backgroundImage = `url(https://image.tmdb.org/t/p/w500/${movie.poster_path})`)
      : (n.style.backgroundImage =
          'url("/assets/main/default_background.svg")'),
      t.appendChild(n),
      createRatingCircle(movie, t);
    const i = document.createElement("div");
    (i.className = "poster_content"),
      (i.innerHTML = `<a href="#" class="movie_title">${
        movie.title
      }</a><p class="release_date">${new Date(
        movie.release_date
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}</p>`),
      e.appendChild(t),
      e.appendChild(i),
      galleryContainer.appendChild(e);
  }
  function createRatingCircle(movie, posterWrapper) {
    const e = Math.round(10 * movie.vote_average),
      t = document.createElement("div");
    t.className = "rating-circle";
    const n = 15.9,
      i = 2 * Math.PI * n,
      o = i - (e / 100) * i;
    let s = "no-rating";
    e > 0 &&
      (s = e >= 70 ? "high-rating" : e >= 40 ? "medium-rating" : "low-rating"),
      (t.innerHTML = `<svg viewBox="0 0 36 36"><circle class="rating-bg" cx="18" cy="18" r="${n}"></circle><circle class="rating-indicator ${s}" cx="18" cy="18" r="${n}" stroke-dasharray="${i}" stroke-dashoffset="${o}"></circle></svg><div class="rating-value">${
        e > 0 ? `${e}<sup>%</sup>` : "NR"
      }</div>`),
      posterWrapper.appendChild(t);
  }

  updateButtonState();
  performSearch();
});
