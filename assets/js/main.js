const toyList = document.querySelector("#toy-list");

// Shared site header behavior: every page should reuse .site-header/.site-nav
// and load this file so mobile navigation stays consistent across the site.
document.querySelectorAll(".site-header").forEach((header, headerIndex) => {
  const nav = header.querySelector(".site-nav");
  const brand = header.querySelector(".brand");
  if (!nav || !brand) return;

  let button = header.querySelector(".site-menu-button");
  if (!button) {
    button = document.createElement("button");
    button.className = "site-menu-button";
    button.type = "button";
    button.textContent = "☰";
    brand.insertAdjacentElement("afterend", button);
  }

  const navId = nav.id || `site-nav-${headerIndex + 1}`;
  nav.id = navId;
  button.setAttribute("aria-label", "開啟導覽");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", navId);

  button.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll(".nav-menu").forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      nav.querySelectorAll(".nav-menu[open]").forEach((other) => {
        if (other !== menu) other.open = false;
      });
    });
  });
});

const toys = [];

if (toyList && toys.length > 0) {
  toyList.replaceChildren(
    ...toys.map((toy) => {
      const link = document.createElement("a");
      link.className = "toy-link";
      link.href = toy.href;
      link.innerHTML = `
        <span class="toy-dot" aria-hidden="true"></span>
        <span class="toy-name"></span>
        <span class="toy-action">Play</span>
      `;
      link.querySelector(".toy-name").textContent = toy.name;
      return link;
    })
  );
}

const firstVisitStyle = document.createElement("style");
firstVisitStyle.textContent = `
  .first-visit {
    margin-top: 72px;
    padding: 24px;
    border: 3px solid var(--ink);
    background:
      linear-gradient(135deg, rgba(139, 232, 242, 0.20), rgba(255, 225, 107, 0.16)),
      linear-gradient(90deg, rgba(20, 50, 82, 0.08) 1px, transparent 1px),
      linear-gradient(rgba(20, 50, 82, 0.08) 1px, transparent 1px),
      rgba(255, 255, 255, 0.88);
    background-size: auto, 22px 22px, 22px 22px, auto;
    box-shadow: 8px 8px 0 var(--line);
  }

  .first-visit .section-heading {
    justify-content: flex-start;
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 22px;
  }

  .first-visit-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .first-visit-card {
    min-height: 260px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border: 3px solid var(--ink);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 6px 6px 0 var(--line);
  }

  .first-visit-card h3,
  .first-visit-card p {
    margin: 0;
  }

  .first-visit-card h3 {
    font-size: 1.35rem;
  }

  .first-visit-card p {
    color: var(--muted);
    line-height: 1.65;
  }

  .first-visit-card .button {
    width: fit-content;
    margin-top: auto;
  }

  .recommended-card {
    background:
      linear-gradient(135deg, rgba(184, 239, 125, 0.30), rgba(139, 232, 242, 0.22)),
      var(--cloud);
  }

  @media (max-width: 900px) {
    .first-visit-grid {
      grid-template-columns: 1fr;
    }

    .first-visit-card {
      min-height: auto;
    }
  }

  @media (max-width: 640px) {
    .first-visit {
      padding: 16px;
    }
  }
`;
document.head.appendChild(firstVisitStyle);
