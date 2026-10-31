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

// Typing effect (edit these phrases)
const phrases = ["real-world solutions.", "clear insights.", "intelligent products.", "better decisions."];
const typed = document.getElementById("typed");
let p = 0, c = 0, deleting = false;
function type() {
  const word = phrases[p];
  typed.textContent = word.slice(0, c);
  if (!deleting && c === word.length) { deleting = true; return setTimeout(type, 1600); }
  if (deleting && c === 0) { deleting = false; p = (p + 1) % phrases.length; }
  c += deleting ? -1 : 1;
  setTimeout(type, deleting ? 40 : 80);
}
type();

// Scroll reveal + skill bars + counters
const countUp = el => {
  const target = +el.dataset.count; let n = 0;
  const step = () => { n += Math.max(1, Math.ceil(target / 30)); if (n >= target) n = target; el.textContent = n + "+"; if (n < target) requestAnimationFrame(step); };
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
