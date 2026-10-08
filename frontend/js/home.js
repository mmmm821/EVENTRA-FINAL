let currentPage = 1;
let currentCategory = "all";
let currentSearch = "";
const PAGE_SIZE = 8;

async function loadCategories() {
  const mount = document.getElementById("categoryPills");
  try {
    const { categories } = await api.get("/events/categories");
    mount.innerHTML = categories
      .map(
        (c) =>
          `<div class="pill ${c.toLowerCase() === currentCategory ? "active" : ""}" data-cat="${c.toLowerCase()}">${c}</div>`
      )
      .join("");
    mount.querySelectorAll(".pill").forEach((p) =>
      p.addEventListener("click", () => {
        currentCategory = p.dataset.cat;
        currentPage = 1;
        mount.querySelectorAll(".pill").forEach((x) => x.classList.remove("active"));
        p.classList.add("active");
        loadEvents();
      })
    );
  } catch (e) {
    mount.innerHTML = "";
  }
}

async function loadEvents(append = false) {
  const grid = document.getElementById("eventsGrid");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  try {
    const { events, total } = await api.get(
      `/events?search=${encodeURIComponent(currentSearch)}&category=${currentCategory}&page=${currentPage}&limit=${PAGE_SIZE}`
    );

    if (!append) grid.innerHTML = "";

    if (events.length === 0 && !append) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🔍</div>No events match your search.</div>`;
    } else {
      grid.insertAdjacentHTML("beforeend", events.map(eventCardHTML).join(""));
    }

    grid.querySelectorAll(".fav-btn").forEach((btn) =>
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const session = getSession();
        if (!session) {
          window.location.href = "login.html";
          return;
        }
        try {
          await api.patch(`/events/${btn.dataset.id}/favorite`, {});
          btn.classList.toggle("active");
          btn.textContent = btn.classList.contains("active") ? "❤️" : "🤍";
        } catch (e) {
          toast(e.message, "error");
        }
      })
    );

    loadMoreBtn.style.display = currentPage * PAGE_SIZE < total ? "inline-flex" : "none";
  } catch (e) {
    toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar("explore");
  loadCategories();
  loadEvents();

  document.getElementById("searchBtn").addEventListener("click", () => {
    currentSearch = document.getElementById("searchInput").value.trim();
    currentPage = 1;
    loadEvents();
  });

  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("searchBtn").click();
  });

  document.getElementById("loadMoreBtn").addEventListener("click", () => {
    currentPage += 1;
    loadEvents(true);
  });

  document.getElementById("viewAllBtn").addEventListener("click", (e) => {
    e.preventDefault();
    currentCategory = "all";
    currentSearch = "";
    document.getElementById("searchInput").value = "";
    currentPage = 1;
    loadEvents();
  });
});
