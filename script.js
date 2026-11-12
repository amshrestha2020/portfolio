// Theme: remember choice, default to system preference
const root = document.documentElement;
const saved = (() => { try { return localStorage.getItem("theme"); } catch (e) { return null; } })();
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));

document.getElementById("themeToggle").addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch (e) {}
});

// Mobile menu
const navLinks = document.getElementById("navLinks");
document.getElementById("menuBtn").addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

// Nav shadow on scroll
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => nav.classList.toggle("scrolled", window.scrollY > 10), { passive: true });

// Typing effect: a few rounds, then the message settles
const phrases = ["scalable microservices.", "cloud-native systems.", "reliable finance platforms."];
const FINAL = "What is your need?";
const typed = document.getElementById("typed");
const cursor = document.querySelector(".cursor");
const prefix = document.getElementById("prefix");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let p = 0, c = 0, deleting = false, settling = false;
function settle() { prefix.textContent = ""; typed.textContent = FINAL; cursor.classList.add("done"); }
function type() {
  const word = settling ? FINAL : phrases[p];
  typed.textContent = word.slice(0, c);
  if (settling) {
    if (c === word.length) return setTimeout(() => cursor.classList.add("done"), 1200);
    c++; return setTimeout(type, 70);
  }
  if (!deleting && c === word.length) { deleting = true; return setTimeout(type, 1400); }
  if (deleting && c === 0) {
    deleting = false; p++;
    if (p === phrases.length) { settling = true; prefix.textContent = ""; return setTimeout(type, 400); }
  }
  c += deleting ? -1 : 1;
  setTimeout(type, deleting ? 40 : 80);
}
if (reduceMotion) settle(); else type();

// Services ticker: duplicate items for a seamless loop, pause button
(() => {
  const track = document.getElementById("tickerTrack"), btn = document.getElementById("tickerBtn");
  if (!track) return;
  if (!reduceMotion) {
    [...track.children].forEach(li => { const d = li.cloneNode(true); d.setAttribute("aria-hidden", "true"); track.appendChild(d); });
  }
  btn.addEventListener("click", () => {
    const paused = btn.closest(".ticker").classList.toggle("paused");
    btn.setAttribute("aria-pressed", String(paused));
    btn.textContent = paused ? "▶" : "⏸";
    btn.setAttribute("aria-label", paused ? "Play scrolling services" : "Pause scrolling services");
  });
})();

// Scroll reveal + skill bars + counters
const countUp = el => {
  const target = +el.dataset.count; let n = 0;
  const step = () => { n += Math.max(1, Math.ceil(target / 30)); if (n >= target) n = target; el.textContent = n + (el.dataset.suffix || ""); if (n < target) requestAnimationFrame(step); };
  step();
};
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("visible");
    e.target.querySelectorAll("[data-count]").forEach(countUp);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// Active nav link on scroll
const sections = document.querySelectorAll("main section[id]");
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll(".nav-links a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
sections.forEach(s => spy.observe(s));

document.getElementById("year").textContent = new Date().getFullYear();

// Artifact 1: filter timeline by era
const filterBtns = document.querySelectorAll(".filter");
filterBtns.forEach(btn => btn.addEventListener("click", () => {
  filterBtns.forEach(b => b.classList.toggle("active", b === btn));
  const f = btn.dataset.filter;
  document.querySelectorAll(".ai-timeline li").forEach(li => li.classList.toggle("hide", f !== "all" && li.dataset.era !== f));
}));

// Artifact 2: open each lab inside the page on demand
document.querySelectorAll(".embed-toggle").forEach(btn => {
  const box = document.getElementById(btn.dataset.embed);
  const frame = box && box.querySelector("iframe");
  if (!frame) return;
  btn.addEventListener("click", () => {
    const open = box.hidden;
    if (open && !frame.getAttribute("src")) frame.setAttribute("src", frame.dataset.src);
    box.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Hide ▲" : "Play it here ▶";
    if (open) box.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
