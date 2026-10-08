async function verify() {
  const input = document.getElementById("verifyInput").value.trim();
  const resultBox = document.getElementById("resultBox");
  if (!input) {
    toast("Enter a ticket ID or scanned value.", "error");
    return;
  }

  try {
    const data = await apiRequest("POST", "/tickets/verify", { input });
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `
      <div style="text-align:center;">
        <div class="confirm-tick" style="background:var(--green);">✓</div>
        <h3 style="font-size:18px;">VALID TICKET</h3>
        <p style="color:var(--muted);margin-top:6px;">Code: EVT-${data.ticket.id.slice(0, 8).toUpperCase()}</p>
        <p style="margin-top:10px;font-size:13px;">
          Event: <strong>${data.ticket.eventTitle}</strong><br>
          Attendee: <strong>${data.ticket.attendeeName}</strong><br>
          Check-in Time: ${formatDateTime(data.ticket.checkedInAt)}
        </p>
      </div>`;
    toast("Ticket verified. Entry granted.", "success");
  } catch (e) {
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `
      <div style="text-align:center;">
        <div class="confirm-tick" style="background:var(--red);">✕</div>
        <h3 style="font-size:18px;">INVALID / ALREADY USED</h3>
        <p style="color:var(--muted);margin-top:6px;">${e.message}</p>
      </div>`;
    toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar("checkin");
  const session = requireSession(["organizer", "admin"]);
  if (!session) return;

  document.getElementById("verifyBtn").addEventListener("click", verify);
  document.getElementById("verifyInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") verify();
  });
});
