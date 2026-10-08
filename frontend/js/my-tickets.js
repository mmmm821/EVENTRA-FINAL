function ticketCardHTML(t) {
  const statusBadge = t.checkedIn
    ? `<span class="badge badge-outline">Checked In</span>`
    : `<span class="badge badge-green">Confirmed</span>`;
  return `
    <div class="card card-pad">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-weight:800;font-size:15px;">${t.eventTitle}</div>
          <div class="meta" style="color:var(--muted);margin-top:4px;">${t.ticketTypeName} • ${formatCurrency(t.price)}</div>
        </div>
        ${statusBadge}
      </div>
      <div class="qr-box" style="margin-top:16px;">
        <img src="${t.qrDataUrl}" alt="QR code">
      </div>
      <div class="meta" style="text-align:center;margin-top:8px;color:var(--muted);">Ticket ID: ${t.id.slice(0, 8).toUpperCase()}</div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button class="btn btn-sm btn-block" onclick="window.open('${t.qrDataUrl}', '_blank')">View Details</button>
        <a class="btn btn-yellow btn-sm btn-block" href="${t.qrDataUrl}" download="eventra-ticket-${t.id.slice(0, 8)}.png">Download</a>
      </div>
    </div>`;
}

async function init() {
  renderNavbar("tickets");
  const session = requireSession(["attendee"]);
  if (!session) return;

  const grid = document.getElementById("ticketsGrid");
  try {
    const { tickets } = await api.get("/tickets/mine");
    if (tickets.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🎟️</div>No tickets yet — go book an event!</div>`;
      return;
    }
    grid.innerHTML = tickets.map(ticketCardHTML).join("");
  } catch (e) {
    toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
