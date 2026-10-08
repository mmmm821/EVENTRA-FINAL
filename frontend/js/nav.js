function renderNavbar(active) {
  const mount = document.getElementById("navbar");
  if (!mount) return;

  const session = getSession();
  const role = session ? session.user.role : null;

  const link = (href, label, key) =>
    `<a href="${href}" class="${active === key ? "nav-active" : ""}">${label}</a>`;

  let links = "";
  if (!role || role === "attendee") {
    links += link("index.html", "Explore", "explore");
    links += link("my-tickets.html", "My Tickets", "tickets");
    links += link("favorites.html", "Favorites", "favorites");
  }
  if (role === "organizer") {
    links += link("index.html", "Explore", "explore");
    links += link("organizer-dashboard.html", "Dashboard", "dashboard");
    links += link("qr-checkin.html", "QR Check-in", "checkin");
  }
  if (role === "admin") {
    links += link("admin-dashboard.html", "Dashboard", "dashboard");
    links += link("qr-checkin.html", "QR Check-in", "checkin");
  }

  const authAction = session
    ? `<button class="icon-btn" id="logoutBtn" title="Log out">⎋</button>`
    : `<a class="btn btn-black btn-sm" href="login.html">Login</a>`;

  mount.innerHTML = `
    <div class="navbar-inner">
      <a href="index.html" class="brand">
        <span class="brand-mark">🎟️</span> EVENTRA
      </a>
      <nav class="nav-links">${links}</nav>
      <div class="nav-actions">
        <button class="icon-btn" id="themeToggle" title="Toggle theme">🌓</button>
        ${authAction}
      </div>
    </div>
  `;

  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      toast("Logged out.");
      setTimeout(() => (window.location.href = "index.html"), 500);
    });
  }
}
