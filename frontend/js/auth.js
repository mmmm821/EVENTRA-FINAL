function redirectAfterAuth(user) {
  const next = qs("next");
  if (next) {
    window.location.href = next;
    return;
  }
  if (user.role === "organizer") window.location.href = "organizer-dashboard.html";
  else if (user.role === "admin") window.location.href = "admin-dashboard.html";
  else window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      try {
        const { token, user } = await api.post("/auth/login", { email, password });
        setSession(token, user);
        toast(`Welcome back, ${user.name}!`, "success");
        setTimeout(() => redirectAfterAuth(user), 500);
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const role = document.getElementById("role").value;
      try {
        const { token, user } = await api.post("/auth/register", { name, email, password, role });
        setSession(token, user);
        toast(`Account created. Welcome, ${user.name}!`, "success");
        setTimeout(() => redirectAfterAuth(user), 500);
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }
});
