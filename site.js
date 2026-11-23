const nav = document.querySelector(".navigation");
const menu = document.querySelector(".menu-toggle");
const header = document.querySelector(".header");
const headerRow = header.querySelector(".header-row");
const recall = header.querySelector(".nav-recall");
const hoverDevice = window.matchMedia("(any-hover: hover)");
let revealedByMouse = false;
let hideTimer = 0;

function showHeader(moveFocus = false) {
  clearTimeout(hideTimer);
  hideTimer = 0;
  const focusNavigation = moveFocus || document.activeElement === recall;
  header.classList.remove("is-tucked");
  headerRow.inert = false;
  if (focusNavigation) {
    const closedMobileMenu = menu?.offsetWidth && !nav.classList.contains("open");
    const firstControl = closedMobileMenu ? menu : headerRow.querySelector(".navigation a, .policy-home");
    firstControl.focus({ preventScroll: true });
  }
  recall.hidden = true;
}

function tuckHeader() {
  if (window.scrollY <= header.offsetHeight || nav?.classList.contains("open") ||
      headerRow.querySelector(":focus-visible") || (hoverDevice.matches && headerRow.matches(":hover"))) return;
  revealedByMouse = false;
  headerRow.inert = true;
  header.classList.add("is-tucked");
  recall.hidden = false;
}

recall.addEventListener("click", () => {
  if (menu?.offsetWidth) toggleMenu(true);
  showHeader(true);
});
document.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || event.buttons) return;
  if (event.clientY <= 24 && !recall.hidden) {
    showHeader();
    revealedByMouse = true;
  }
  if (!revealedByMouse) return;
  if (event.clientY <= header.offsetHeight || header.contains(event.target)) {
    clearTimeout(hideTimer);
    hideTimer = 0;
  } else if (!hideTimer) {
    hideTimer = setTimeout(() => {
      hideTimer = 0;
      tuckHeader();
    }, 550);
  }
}, { passive: true });

function toggleMenu(open) {
  nav.classList.toggle("open", open);
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
}

menu?.addEventListener("click", (event) => {
  const open = !nav.classList.contains("open");
  toggleMenu(open);
  if (open && event.detail === 0) nav.querySelector("a").focus({ preventScroll: true });
});
document.addEventListener("click", (event) => {
  if (!nav?.classList.contains("open") || menu.contains(event.target) || recall.contains(event.target)) return;
  if (!nav.contains(event.target) || event.target.closest("a")) toggleMenu(false);
});
header.addEventListener("focusout", (event) => {
  if (nav && event.relatedTarget && !header.contains(event.relatedTarget)) toggleMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav?.classList.contains("open")) {
    toggleMenu(false);
    menu.focus();
  }
});
if (menu) window.matchMedia("(max-width: 760px)").addEventListener("change", () => toggleMenu(false));

const links = [...document.querySelectorAll(".navigation a")];
const sections = [...document.querySelectorAll("main > section")];
let framePending = false;
let lastY = Math.max(0, window.scrollY);

function updateNavigation() {
  const y = Math.max(0, window.scrollY);
  header.classList.toggle("is-scrolled", y > 8);
  if (y <= header.offsetHeight || y <= lastY - 18) {
    showHeader();
    revealedByMouse = false;
    lastY = y;
  } else if (y >= lastY + 36) {
    tuckHeader();
    lastY = y;
  }
  const threshold = Math.max(header.offsetHeight + 16, Math.min(window.innerHeight * 0.35, 260));
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
