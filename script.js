document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let currentPage = 1;
  let isFetching = false;
  let isInfiniteScrollEnabled = false;

  // --- API OPTIONS ---
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NWYyMzdlNTRlMDRmZDA1MzA1MzFiNTlmZjhiMGU5NyIsIm5iZiI6MTc1NDQ3MDY4MC45ODcsInN1YiI6IjY4OTMxOTE4ZDEyMDM4NmY4OTExZTU4MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.r2FrPJi5tejPIImPSnJ-y4elVjTulWOID_FTAdlSdNs",
    },
  };

  // --- DOM ELEMENTS ---
  const galleryContainer = document.getElementById("movie_page");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  /**
   * Fetches movies for a specific page and appends them to the gallery.
   * @param {number} page - The page number to fetch.
   */
  async function fetchAndAppendMovies(page) {
    if (isFetching) return;
    isFetching = true;

    const url = `https://api.themoviedb.org/3/movie/popular?language=en-US&page=${page}`;

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      data.results.forEach((movie) => {
        const mediaItem = document.createElement("div");
        mediaItem.className = "media_item";

        const posterWrapper = document.createElement("div");
        posterWrapper.className = "poster_wrapper";

        const posterImage = document.createElement("div");
        posterImage.className = "movie_poster";
        posterImage.style.backgroundImage = `url(https://image.tmdb.org/t/p/w500/${movie.poster_path})`;

        posterWrapper.appendChild(posterImage);
        createRatingCircle(movie, posterWrapper); // Helper function to add rating

        const content = document.createElement("div");
        content.className = "poster_content";
        content.innerHTML = `
          <a href="#" class="movie_title">${movie.title}</a>
          <p class="release_date">${new Date(
            movie.release_date
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}</p>
        `;

        mediaItem.appendChild(posterWrapper);
        mediaItem.appendChild(content);
        galleryContainer.appendChild(mediaItem);
      });

      currentPage++; // Increment page number for the next fetch
    } catch (err) {
      console.error("Error fetching movies:", err);
    } finally {
      isFetching = false; // Allow new fetches
    }
  }

  /**
   * Creates a rating circle and appends it to a movie poster.
   */
  function createRatingCircle(movie, posterWrapper) {
    // This function remains exactly the same as you provided
    const percentage = Math.round(movie.vote_average * 10);
    const ratingCircle = document.createElement("div");
    ratingCircle.className = "rating-circle";
    const svgNS = "http://www.w3.org/2000/svg",
      radius = 15.9,
      circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    let colorClass = "no-rating";
    if (percentage > 0) {
      if (percentage >= 70) colorClass = "high-rating";
      else if (percentage >= 40) colorClass = "medium-rating";
      else colorClass = "low-rating";
    }
    ratingCircle.innerHTML = `<svg viewBox="0 0 36 36"><circle class="rating-bg" cx="18" cy="18" r="${radius}"></circle><circle class="rating-indicator ${colorClass}" cx="18" cy="18" r="${radius}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle></svg><div class="rating-value">${
      percentage > 0 ? `${percentage}<sup>%</sup>` : "NR"
    }</div>`;
    posterWrapper.appendChild(ratingCircle);
  }

  // --- EVENT LISTENERS ---

  // Handle "Load More" button click
  loadMoreBtn.addEventListener("click", () => {
    isInfiniteScrollEnabled = true; // Turn on infinite scroll
    loadMoreBtn.style.display = "none"; // Hide the button
    fetchAndAppendMovies(currentPage); // Fetch the next page
  });

  // Handle infinite scroll
  window.addEventListener("scroll", () => {
    if (!isInfiniteScrollEnabled) return; // Only run if enabled

    // Check if user is near the bottom of the page
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (clientHeight + scrollTop >= scrollHeight - 500) {
      fetchAndAppendMovies(currentPage);
    }
  });

  // --- INITIAL PAGE LOAD ---
  fetchAndAppendMovies(currentPage);

  // =================================================================
  // Your existing sidebar logic can remain here without changes.
  // =================================================================
  const sortToggle = document.getElementById("sortToggle");
  const sortOptions = document.getElementById("sortOptions");
  const chevron = document.getElementById("chevron");
  const mainSelect = document.getElementById("mainSelect");
  const selectedSort = document.getElementById("selectedSort");

  const filterToggle = document.getElementById("filterToggle");
  const filterOptions = document.getElementById("filterOptions");
  const chevronFilter = document.getElementById("chevron-filter");

  const searchAllCheckbox = document.getElementById("searchAllReleases");
  const releaseTypesWrapper = document.getElementById("releaseDetails");
  let selectItems;

  // --- SORT PANEL LOGIC ---
  if (sortToggle && sortOptions && chevron && mainSelect && selectedSort) {
    sortToggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation(); // Prevents click from bubbling up to the document
      const isActive = sortOptions.classList.toggle("active");
      chevron.classList.toggle("rotated", isActive);
      sortOptions.style.display = isActive ? "block" : "none";
    });

    // Build dropdown items
    selectItems = mainSelect.querySelector(".select-items");
    if (!selectItems) {
      selectItems = document.createElement("div");
      selectItems.className = "select-items";
      const options = [
        "Popularity Descending",
        "Popularity Ascending",
        "Rating Descending",
        "Rating Ascending",
        "Release Date Descending",
        "Release Date Ascending",
        "Title (A-Z)",
        "Title (Z-A)",
      ];
      options.forEach((optionText) => {
        const div = document.createElement("div");
        div.textContent = optionText;
        if (optionText === "Popularity Descending")
          div.classList.add("selected");
        selectItems.appendChild(div);
      });
      mainSelect.appendChild(selectItems);
    }

    // Handle custom select dropdown click
    selectedSort.addEventListener("click", function (event) {
      event.stopPropagation();
      mainSelect.classList.toggle("active");
    });

    // Handle click on a sort option
    selectItems.querySelectorAll("div").forEach((item) => {
      item.addEventListener("click", function () {
        selectItems
          .querySelectorAll("div")
          .forEach((div) => div.classList.remove("selected"));
        this.classList.add("selected");
        selectedSort.textContent = this.textContent;
        mainSelect.classList.remove("active");
      });
    });
  }

  // --- FILTER PANEL LOGIC (FIXED) ---
  if (filterToggle && filterOptions && chevronFilter) {
    filterToggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation(); // FIX: Added stopPropagation to prevent unintended clicks
      const isActive = filterOptions.classList.toggle("active");
      chevronFilter.classList.toggle("rotated", isActive);
      // In your CSS, the .filter class is already 'display: flex', so we just need to toggle it
      filterOptions.style.display = isActive ? "flex" : "none";
    });
  }

  // --- CHECKBOX LOGIC ---
  if (searchAllCheckbox && releaseTypesWrapper) {
    searchAllCheckbox.addEventListener("change", () => {
      releaseTypesWrapper.classList.toggle("hidden", searchAllCheckbox.checked);
    });
  }

  // --- CLOSE PANELS ON OUTSIDE CLICK (FIXED) ---
  document.addEventListener("click", function (event) {
    // Close custom select dropdown if open
    if (mainSelect && !mainSelect.contains(event.target)) {
      mainSelect.classList.remove("active");
    }
  });
});
