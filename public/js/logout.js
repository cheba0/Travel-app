async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });
  const result = await response.json();

  if (result.success) {
    localStorage.clear();
    window.location.href = "/";
  }
}
