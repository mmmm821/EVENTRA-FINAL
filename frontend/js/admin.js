function statCard(label, val, color) {
  return `<div class="stat-card"><div class="val" style="color:${color || "var(--ink)"}">${val}</div><div class="lbl">${label}</div></div>`;
}

async function loadStats() {
  const { stats } = await api.get("/admin/stats");
  document.getElementById("statsGrid").innerHTML =
    statCard("Total Users", stats.totalUsers) +
    statCard("Total Events", stats.totalEvents) +
    statCard("Total Revenue", formatCurrency(stats.totalRevenue), "var(--pink)") +
    statCard("Total Check-ins", stats.totalCheckIns, "var(--green)");
}

async function loadEvents() {
  const { events } = await api.get("/admin/events");
  const body = document.getElementById("eventsBody");
  if (events.length === 0) {
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">No events yet.</td></tr>`;
    return;
  }
  body.innerHTML = events
    .map(
      (e) => `
      <tr>
        <td style="font-weight:700;">${e.title}</td>
        <td>${e.organizerName}</td>
        <td>${formatDate(e.date)}</td>
        <td><span class="badge ${e.status === "approved" ? "badge-green" : e.status === "pending" ? "badge-yellow" : "badge-red"}">${e.status}</span></td>
        <td>
          ${
            e.status === "pending"
              ? `<button class="btn btn-sm btn-green" data-approve="${e.id}">Approve</button>
                 <button class="btn btn-sm" data-reject="${e.id}">Reject</button>`
              : "—"
          }
        </td>
      </tr>`
    )
    .join("");

  body.querySelectorAll("[data-approve]").forEach((btn) =>
    btn.addEventListener("click", () => setStatus(btn.dataset.approve, "approved"))
  );
  body.querySelectorAll("[data-reject]").forEach((btn) =>
    btn.addEventListener("click", () => setStatus(btn.dataset.reject, "rejected"))
  );
}

async function setStatus(id, status) {
  try {
    await api.patch(`/admin/events/${id}/status`, { status });
    toast(`Event ${status}.`, "success");
    loadEvents();
    loadStats();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function loadUsers() {
  const { users } = await api.get("/admin/users");
  const body = document.getElementById("usersBody");
  if (users.length === 0) {
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">No users yet.</td></tr>`;
    return;
  }
  body.innerHTML = users
    .map(
      (u) => `
      <tr>
        <td style="font-weight:700;">${u.name}</td>
        <td>${u.email}</td>
        <td><span class="badge badge-outline">${u.role}</span></td>
        <td>${u.suspended ? '<span class="badge badge-red">Suspended</span>' : '<span class="badge badge-green">Active</span>'}</td>
        <td><button class="btn btn-sm" data-toggle="${u.id}" data-suspended="${u.suspended}">${u.suspended ? "Reinstate" : "Suspend"}</button></td>
      </tr>`
    )
    .join("");

  body.querySelectorAll("[data-toggle]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const suspended = btn.dataset.suspended !== "true";
      try {
        await api.patch(`/admin/users/${btn.dataset.toggle}/suspend`, { suspended });
        loadUsers();
      } catch (e) {
        toast(e.message, "error");
      }
    })
  );
}

async function loadTransactions() {
  const { transactions } = await api.get("/admin/transactions");
  const body = document.getElementById("transactionsBody");
  if (transactions.length === 0) {
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">No transactions yet.</td></tr>`;
    return;
  }
  body.innerHTML = transactions
    .map(
      (t) => `
      <tr>
        <td style="font-weight:700;">${t.eventTitle}</td>
        <td>${t.userName}</td>
        <td>${formatCurrency(t.amount)}</td>
        <td>${t.paymentId}</td>
        <td>${formatDateTime(t.paidAt)}</td>
      </tr>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar("dashboard");
  const session = requireSession(["admin"]);
  if (!session) return;

  loadStats();
  loadEvents();

  document.querySelectorAll(".pill[data-tab]").forEach((pill) =>
    pill.addEventListener("click", () => {
      document.querySelectorAll(".pill[data-tab]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      ["events", "users", "transactions"].forEach((tab) =>
        document.getElementById(`tab${tab[0].toUpperCase()}${tab.slice(1)}`).classList.add("hidden")
      );
      const tab = pill.dataset.tab;
      document.getElementById(`tab${tab[0].toUpperCase()}${tab.slice(1)}`).classList.remove("hidden");
      if (tab === "users") loadUsers();
      if (tab === "transactions") loadTransactions();
    })
  );
});
