const nav = document.querySelector(".navigation");
const menu = document.querySelector(".menu-toggle");

function toggleMenu(open) {
  nav.classList.toggle("open", open);
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
}

menu.addEventListener("click", () => toggleMenu(!nav.classList.contains("open")));
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) toggleMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("open")) {
    toggleMenu(false);
    menu.focus();
  }
});
window.matchMedia("(max-width: 760px)").addEventListener("change", () => toggleMenu(false));

const links = [...nav.querySelectorAll("a")];
const sections = [...document.querySelectorAll("main > section")];
let framePending = false;

function updateNavigation() {
  const threshold = Math.min(window.innerHeight * 0.35, 260);
  const active = sections.filter((section) => section.getBoundingClientRect().top <= threshold).pop();
  const hash = "#" + (active?.id || "top");
  links.forEach((link) => {
    if (link.hash === hash) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  framePending = false;
}
window.addEventListener("scroll", () => {
  if (!framePending) {
    framePending = true;
    requestAnimationFrame(updateNavigation);
  }
}, { passive: true });
updateNavigation();

// Two aligned faces keep the lettering legible on both sides of the moving edge.
document.querySelectorAll(".button").forEach(button => {
  const face = document.createElement("span");
  face.className = "button-fill";
  face.setAttribute("aria-hidden", "true");
  face.append(...Array.from(button.childNodes, node => node.cloneNode(true)));
  button.append(face);
  button.addEventListener("pointerdown", event => {
    if (event.isPrimary && event.pointerType !== "mouse" && event.button === 0) {
      button.classList.add("is-pressed");
    }
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, () => button.classList.remove("is-pressed"));
  }
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("in-view");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll(".service, .personal-portrait, .book-art").forEach(element => observer.observe(element));
}
