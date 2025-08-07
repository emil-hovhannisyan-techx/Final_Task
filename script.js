// const url = "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1";
// const options = {
//   method: "GET",
//   headers: {
//     accept: "application/json",
//     Authorization:
//       "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NWYyMzdlNTRlMDRmZDA1MzA1MzFiNTlmZjhiMGU5NyIsIm5iZiI6MTc1NDQ3MDY4MC45ODcsInN1YiI6IjY4OTMxOTE4ZDEyMDM4NmY4OTExZTU4MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.r2FrPJi5tejPIImPSnJ-y4elVjTulWOID_FTAdlSdNs",
//   },
// };

// fetch(url, options)
//   .then((res) => res.json())
//   .then((json) => console.log(json))
//   .catch((err) => console.error(err));

const sortToggle = document.getElementById("sortToggle");
const sortOptions = document.getElementById("sortOptions");
const chevron = document.getElementById("chevron");
const mainSelect = document.getElementById("mainSelect");
const selectedSort = document.getElementById("selectedSort");

const filterToggle = document.getElementById("filterToggle");
const filterOptions = document.getElementById("filterOptions");
const chevronFilter = document.getElementById("chevron-filter");

const releaseDatesPanel = document.getElementById("release-dates-panel");

let selectItems;

// SORT PANEL LOGIC
if (sortToggle && sortOptions && chevron && mainSelect && selectedSort) {
  sortToggle.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
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
    options.forEach((option) => {
      const div = document.createElement("div");
      div.textContent = option;
      if (option === "Popularity Descending") div.classList.add("selected");
      selectItems.appendChild(div);
    });
    mainSelect.appendChild(selectItems);
  }

  selectedSort.addEventListener("click", function (event) {
    event.stopPropagation();
    mainSelect.classList.toggle("active");
  });

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

// FILTER PANEL LOGIC
if (filterToggle && filterOptions && chevronFilter) {
  filterToggle.addEventListener("click", function (event) {
    event.preventDefault();
    const isActive = filterOptions.classList.toggle("active");
    chevronFilter.classList.toggle("rotated", isActive);
    filterOptions.style.display = isActive ? "flex" : "none";
  });
}

// CLOSE ON OUTSIDE CLICK
document.addEventListener("click", function (event) {
  // Close custom select
  if (
    mainSelect &&
    !mainSelect.contains(event.target) &&
    !selectedSort.contains(event.target)
  ) {
    mainSelect.classList.remove("active");
  }

  // Close sort panel
  if (
    sortOptions &&
    sortToggle &&
    !sortToggle.contains(event.target) &&
    !sortOptions.contains(event.target)
  ) {
    sortOptions.classList.remove("active");
    sortOptions.style.display = "none";
    chevron.classList.remove("rotated");
  }
});

const searchAllCheckbox = document.getElementById("searchAllReleases");
const releaseTypesWrapper = document.getElementById("releaseDetails");

searchAllCheckbox.addEventListener("change", () => {
  releaseTypesWrapper.classList.toggle("hidden", searchAllCheckbox.checked);
});
