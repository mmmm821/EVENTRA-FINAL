function renderSteps(activeIndex, doneIndexes) {
  const steps = [
    { label: "Select Ticket" },
    { label: "Pay Online" },
    { label: "Confirmation" },
    { label: "Get Digital Ticket" }
  ];
  const mount = document.getElementById("flowSteps");
  mount.innerHTML = steps
    .map((s, i) => {
      let cls = "";
      if (doneIndexes.includes(i)) cls = "done";
      else if (i === activeIndex) cls = "active";
      const check = doneIndexes.includes(i) ? '<span class="check">✓</span>' : "";
      return `<div class="flow-step ${cls}"><div class="num">${i + 1}</div><div>${s.label}</div>${check}</div>`;
    })
    .join("");
}

async function init() {
  renderNavbar();
  const session = requireSession(["attendee"]);
  if (!session) return;

  const pendingRaw = sessionStorage.getItem("eventra_pending_order");
  if (!pendingRaw) {
    toast("No pending order found. Pick tickets first.", "error");
    setTimeout(() => (window.location.href = "index.html"), 1200);
    return;
  }
  const pending = JSON.parse(pendingRaw);

  let event;
  try {
    const res = await api.get(`/events/${pending.eventId}`);
    event = res.event;
  } catch (e) {
    toast(e.message, "error");
    return;
  }

  const items = pending.items.map((item) => {
    const type = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
    return { ...item, name: type.name, price: type.price };
  });
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  document.getElementById("orderSummary").innerHTML = `
    <h3 style="font-size:16px;">Order Summary</h3>
    <div style="margin-top:10px;font-weight:700;">${event.title}</div>
    <div class="meta" style="color:var(--muted);">📍 ${event.venue} • ${formatDateTime(event.date)}</div>
    <div style="margin-top:16px;border-top:2px solid var(--ink);padding-top:12px;">
      ${items
        .map(
          (i) =>
            `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
              <span>${i.name} × ${i.quantity}</span><span>${formatCurrency(i.price * i.quantity)}</span>
            </div>`
        )
        .join("")}
    </div>
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:18px;margin-top:10px;border-top:2px solid var(--ink);padding-top:10px;">
      <span>Total</span><span>${formatCurrency(total)}</span>
    </div>
    <button class="btn btn-pink btn-block" id="payBtn" style="margin-top:18px;">Pay ${formatCurrency(total)} Online →</button>
  `;

  renderSteps(1, [0]);

  document.getElementById("payBtn").addEventListener("click", async () => {
    const payBtn = document.getElementById("payBtn");
    payBtn.disabled = true;
    payBtn.textContent = "Processing payment...";
    try {
      const { booking } = await api.post("/bookings", { eventId: event.id, items: pending.items });
      renderSteps(2, [0, 1]);

      // Simulated Razorpay test-mode confirmation — a real integration
      // opens Razorpay Checkout here and verifies the signature server-side.
      await new Promise((r) => setTimeout(r, 900));

      await api.post(`/bookings/${booking.id}/pay`, {});
      renderSteps(3, [0, 1, 2, 3]);

      sessionStorage.removeItem("eventra_pending_order");
      document.getElementById("confirmBox").classList.remove("hidden");
      toast("Payment verified. Ticket issued!", "success");
    } catch (e) {
      toast(e.message, "error");
      payBtn.disabled = false;
      payBtn.textContent = `Pay ${formatCurrency(total)} Online →`;
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
