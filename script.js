document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("demoBtn");
  const msg = document.getElementById("message");

  btn.addEventListener("click", () => {
    const now = new Date().toLocaleString();
    msg.textContent = `You clicked this button at ${now}`;
  });
});

