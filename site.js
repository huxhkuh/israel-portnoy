const photographs = [
  {
    file: "residence.webp",
    author: "Tomasz Anusiewicz",
    shortCredit: "T. Anusiewicz",
    source: "https://unsplash.com/photos/k0AmGFCxqbc",
    place: "בית מגורים, תל אביב",
    alt: "חזית בהירה של בית מגורים תל אביבי בין עצים, עם מרפסות שקועות",
  },
  {
    file: "balconies.webp",
    author: "Noam Cohen",
    shortCredit: "N. Cohen",
    source: "https://unsplash.com/photos/MKQj4ShPWS4",
    place: "קצב המרפסות, תל אביב",
    alt: "שורות של מרפסות בחזית מדורגת, באור ערב בתל אביב",
  },
  {
    file: "facade.webp",
    author: "Dan Gold",
    shortCredit: "D. Gold",
    source: "https://unsplash.com/photos/NZgSC4jHVaI",
    place: "פרטי חזית, מחוז תל אביב",
    alt: "שורות חלונות בחזית בטון בהירה על רקע שמיים כחולים",
  },
];

const controls = document.querySelector(".photo-controls");
const photo = document.querySelector("#gallery-photo");
const place = document.querySelector("#photo-place");
const credit = document.querySelector("#photo-credit");
const author = document.querySelector("#photo-author");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let displayedPhoto = 0;
let requestedPhoto = 0;

async function changePhotograph(index) {
  requestedPhoto = index;
  if (index === displayedPhoto) return;

  const next = photographs[index];
  const preload = new Image();
  preload.src = "assets/" + next.file;
  try {
    await preload.decode();
  } catch {
    if (requestedPhoto === index) requestedPhoto = displayedPhoto;
    return;
  }
  if (index !== requestedPhoto || index === displayedPhoto) return;

  const frame = photo.parentElement;
  frame.querySelector(".previous-photo")?.remove();
  if (!reducedMotion.matches && photo.complete && photo.naturalWidth) {
    const previous = photo.cloneNode(false);
    previous.removeAttribute("id");
    previous.removeAttribute("loading");
    previous.className = "previous-photo";
    previous.alt = "";
    previous.setAttribute("aria-hidden", "true");
    previous.style.setProperty("--slide-end", index > displayedPhoto ? "10px" : "-10px");
    photo.after(previous);
    previous.addEventListener("animationend", () => previous.remove(), { once: true });
    previous.addEventListener("animationcancel", () => previous.remove(), { once: true });
  }
  displayedPhoto = index;
  photo.src = preload.src;
  photo.alt = next.alt;
  place.textContent = next.place;
  photoButtons.forEach((button, position) => button.setAttribute("aria-pressed", String(position === index)));
  credit.href = next.source;
  credit.setAttribute("aria-label", "קרדיט לתצלום של " + next.author);
  author.textContent = next.shortCredit;
}

const photoButtons = photographs.map((item, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = String(index + 1).padStart(2, "0");
  button.setAttribute("aria-label", button.textContent + " · " + item.place);
  button.setAttribute("aria-pressed", String(index === displayedPhoto));
  button.addEventListener("click", () => changePhotograph(index));
  return button;
});
controls.append(...photoButtons);
controls.hidden = false;

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
  document.querySelectorAll(".service, .office-portrait, .book-art").forEach(element => observer.observe(element));
}
