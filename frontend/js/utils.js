function toast(message, type = "") {
  const el = document.getElementById("toast");
  if (!el) return alert(message);
  el.textContent = message;
  el.className = `show ${type}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.className = ""), 3200);
}

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${formatDate(iso)} • ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getSession() {
  const token = localStorage.getItem("eventra_token");
  const userRaw = localStorage.getItem("eventra_user");
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) };
  } catch (e) {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem("eventra_token", token);
  localStorage.setItem("eventra_user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("eventra_token");
  localStorage.removeItem("eventra_user");
}

// Redirect to login if not authenticated, optionally restricted to roles.
function requireSession(roles) {
  const session = getSession();
  if (!session) {
    window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }
  if (roles && !roles.includes(session.user.role)) {
    toast("You don't have access to that page.", "error");
    window.location.href = "index.html";
    return null;
  }
  return session;
}

function initTheme() {
  const saved = localStorage.getItem("eventra_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("eventra_theme", next);
}

initTheme();
