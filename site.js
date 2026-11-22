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
const counter = document.querySelector("#photo-index");
const credit = document.querySelector("#photo-credit");
const author = document.querySelector("#photo-author");
let currentPhoto = 0;

controls.hidden = false;
controls.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    const count = photographs.length;
    currentPhoto = (currentPhoto + Number(button.dataset.step) + count) % count;
    const next = photographs[currentPhoto];
    photo.src = "assets/" + next.file;
    photo.alt = next.alt;
    place.textContent = next.place;
    counter.textContent = String(currentPhoto + 1).padStart(2, "0");
    credit.href = next.source;
    credit.setAttribute("aria-label", "קרדיט לתצלום של " + next.author);
    author.textContent = next.shortCredit;
  });
});

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
