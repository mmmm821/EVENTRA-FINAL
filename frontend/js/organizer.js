function statCard(label, val, color) {
  return `<div class="stat-card"><div class="val" style="color:${color || "var(--ink)"}">${val}</div><div class="lbl">${label}</div></div>`;
}

async function loadDashboard() {
  try {
    const { stats, recentEvents } = await api.get("/organizer/dashboard");
    document.getElementById("statsGrid").innerHTML =
      statCard("Total Events", stats.totalEvents) +
      statCard("Tickets Sold", stats.ticketsSold) +
      statCard("Revenue", formatCurrency(stats.revenue), "var(--pink)") +
      statCard("QR Check-ins", stats.qrCheckIns, "var(--green)");

    const body = document.getElementById("recentEventsBody");
    if (recentEvents.length === 0) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">No events yet — create your first one.</td></tr>`;
    } else {
      body.innerHTML = recentEvents
        .map(
          (e) => `
          <tr>
            <td style="font-weight:700;">${e.title}</td>
            <td>${formatDate(e.date)}</td>
            <td>${e.sold}/${e.capacity}</td>
            <td><span class="badge ${e.status === "approved" ? "badge-green" : e.status === "pending" ? "badge-yellow" : "badge-red"}">${e.status}</span></td>
            <td><a href="event-details.html?id=${e.id}" style="font-weight:700;">View →</a></td>
          </tr>`
        )
        .join("");
    }
  } catch (e) {
    toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar("dashboard");
  const session = requireSession(["organizer"]);
  if (!session) return;

  loadDashboard();

  const modal = document.getElementById("createModal");
  document.getElementById("createEventBtn").addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("cancelCreateBtn").addEventListener("click", () => modal.classList.add("hidden"));

  document.getElementById("createEventForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById("f_title").value.trim(),
      category: document.getElementById("f_category").value.trim(),
      venue: document.getElementById("f_venue").value.trim(),
      date: new Date(document.getElementById("f_date").value).toISOString(),
      description: document.getElementById("f_description").value.trim(),
      image: document.getElementById("f_image").value.trim() || undefined,
      ticketTypes: [
        {
          name: document.getElementById("f_ticket_name").value.trim() || "General",
          price: Number(document.getElementById("f_ticket_price").value) || 0,
          totalSeats: Number(document.getElementById("f_ticket_seats").value) || 100
        }
      ]
    };
    try {
      await api.post("/events", payload);
      toast("Event submitted for admin approval!", "success");
      modal.classList.add("hidden");
      e.target.reset();
      loadDashboard();
    } catch (err) {
      toast(err.message, "error");
    }
  });
});
