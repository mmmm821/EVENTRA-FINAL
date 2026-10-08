let currentEvent = null;
const selectedQty = {}; // ticketTypeId -> qty

function renderEvent() {
  const e = currentEvent;
  const mount = document.getElementById("eventContent");

  const favIcon = e.isFavorite ? "❤️" : "🤍";

  mount.innerHTML = `
    <div>
      <div class="card" style="overflow:hidden;">
        <div style="position:relative;">
          <img src="${e.image}" alt="${e.title}" style="width:100%;height:280px;object-fit:cover;border-bottom:var(--border);">
          ${e.isLive ? '<span class="badge badge-red" style="position:absolute;top:14px;left:14px;">Live Events</span>' : ""}
          <div class="fav-btn ${e.isFavorite ? "active" : ""}" id="favBtn" style="position:absolute;top:14px;right:14px;">${favIcon}</div>
        </div>
        <div class="card-pad">
          <h1 style="font-size:26px;">${e.title}</h1>
          <div class="meta" style="margin-top:10px;color:var(--muted);font-weight:600;">
            📍 ${e.venue} &nbsp;•&nbsp; 🗓️ ${formatDateTime(e.date)} &nbsp;•&nbsp; ${e.seatsLeft} of ${e.totalSeats} seats left
          </div>
          <div style="margin-top:16px;font-size:20px;font-weight:800;">From ${formatCurrency(e.minPrice)}</div>

          <h3 style="margin-top:26px;font-size:15px;">About This Event</h3>
          <p style="color:var(--muted);margin-top:8px;">${e.description || "No description provided."}</p>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
            ${e.tags.map((t) => `<span class="badge badge-outline">${t}</span>`).join("")}
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="card card-pad">
        <h3 style="font-size:16px;">Ticket Selection</h3>
        <div id="ticketList" style="margin-top:16px;"></div>
        <div style="display:flex;justify-content:space-between;margin-top:16px;font-weight:800;font-size:18px;">
          <span>Total</span><span id="totalAmount">₹0</span>
        </div>
        <button class="btn btn-yellow btn-block" style="margin-top:16px;" id="proceedBtn" disabled>Select Tickets to Continue</button>
      </div>
    </div>
  `;

  const ticketList = document.getElementById("ticketList");
  ticketList.innerHTML = e.ticketTypes
    .map((t) => {
      const left = t.totalSeats - t.bookedSeats;
      selectedQty[t.id] = 0;
      return `
        <div class="ticket-row" data-left="${left}" data-price="${t.price}" data-id="${t.id}">
          <div>
            <div style="font-weight:700;">${t.name}</div>
            <div class="meta">${formatCurrency(t.price)} &nbsp;•&nbsp; ${left} left</div>
          </div>
          <div class="stepper-qty">
            <button class="minus" data-id="${t.id}">−</button>
            <span id="qty-${t.id}">0</span>
            <button class="plus" data-id="${t.id}" ${left === 0 ? "disabled" : ""}>+</button>
          </div>
        </div>`;
    })
    .join("");

  ticketList.querySelectorAll(".plus").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const row = ticketList.querySelector(`[data-id="${id}"]`);
      const left = Number(row.dataset.left);
      if (selectedQty[id] < left) {
        selectedQty[id]++;
        updateTicketUI();
      }
    })
  );
  ticketList.querySelectorAll(".minus").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (selectedQty[id] > 0) {
        selectedQty[id]--;
        updateTicketUI();
      }
    })
  );

  document.getElementById("favBtn").addEventListener("click", async () => {
    const session = getSession();
    if (!session) return (window.location.href = "login.html");
    try {
      await api.patch(`/events/${e.id}/favorite`, {});
      e.isFavorite = !e.isFavorite;
      const btn = document.getElementById("favBtn");
      btn.classList.toggle("active");
      btn.textContent = e.isFavorite ? "❤️" : "🤍";
    } catch (err) {
      toast(err.message, "error");
    }
  });

  document.getElementById("proceedBtn").addEventListener("click", () => {
    const session = getSession();
    if (!session) {
      window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    const items = Object.entries(selectedQty)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    sessionStorage.setItem("eventra_pending_order", JSON.stringify({ eventId: e.id, items }));
    window.location.href = "booking.html";
  });
}

function updateTicketUI() {
  let total = 0;
  let count = 0;
  Object.entries(selectedQty).forEach(([id, qty]) => {
    document.getElementById(`qty-${id}`).textContent = qty;
    const row = document.querySelector(`.ticket-row[data-id="${id}"]`);
    total += qty * Number(row.dataset.price);
    count += qty;
  });
  document.getElementById("totalAmount").textContent = formatCurrency(total);
  const proceedBtn = document.getElementById("proceedBtn");
  proceedBtn.disabled = count === 0;
  proceedBtn.textContent = count === 0 ? "Select Tickets to Continue" : `Book ${count} Ticket${count > 1 ? "s" : ""} →`;
}

document.addEventListener("DOMContentLoaded", async () => {
  renderNavbar();
  const id = qs("id");
  if (!id) {
    window.location.href = "index.html";
    return;
  }
  try {
    const { event } = await api.get(`/events/${id}`);
    currentEvent = event;
    renderEvent();
  } catch (e) {
    toast(e.message, "error");
    setTimeout(() => (window.location.href = "index.html"), 1200);
  }
});
