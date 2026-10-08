async function init() {
  renderNavbar("favorites");
  const session = requireSession(["attendee"]);
  if (!session) return;

  const grid = document.getElementById("favGrid");
  try {
    const { events } = await api.get("/events/favorites/mine");
    if (events.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🤍</div>No favorites yet — tap the heart on any event.</div>`;
      return;
    }
    grid.innerHTML = events.map(eventCardHTML).join("");
    grid.querySelectorAll(".fav-btn").forEach((btn) =>
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        try {
          await api.patch(`/events/${btn.dataset.id}/favorite`, {});
          init();
        } catch (e) {
          toast(e.message, "error");
        }
      })
    );
  } catch (e) {
    toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
