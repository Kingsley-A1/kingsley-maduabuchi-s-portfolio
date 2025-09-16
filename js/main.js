(function () {
  const isReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Helper: load includes (header/footer)
  async function loadIncludes() {
    const includeNodes = document.querySelectorAll("[data-include]");
    await Promise.all(
      Array.from(includeNodes).map(async (node) => {
        let src = node.getAttribute("data-include");
        // Allow shorthand values: 'header' | 'footer'
        if (src === "header") src = "_includes/header.html";
        if (src === "footer") src = "_includes/footer.html";
        const res = await fetch(src);
        const html = await res.text();
        node.outerHTML = html;
      })
    );
  }

  // Theme persistence
  function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") document.body.classList.add("theme-light");
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        document.body.classList.toggle("theme-dark");
        document.body.classList.toggle("theme-light");
        localStorage.setItem(
          "theme",
          document.body.classList.contains("theme-light") ? "light" : "dark"
        );
      });
    }
  }

  // Mobile nav
  function initNav() {
    const btn = document.getElementById("menuToggle");
    const list = document.getElementById("primaryNav");

    // Normalize links and SVG sprite hrefs based on current page depth
    const normalizePaths = () => {
      const parts = location.pathname.split("/").filter(Boolean);
      const inProjectsDir = parts.includes("projects");
      const basePrefix = inProjectsDir ? "../" : "";

      // Normalize anchors with data-href
      document.querySelectorAll("[data-href]").forEach((a) => {
        const target = a.getAttribute("data-href");
        if (!target) return;
        const needsUp = inProjectsDir && !target.startsWith("projects/");
        let href = needsUp ? `../${target}` : target;
        // Avoid accidental double 'projects/' when already in projects/
        if (inProjectsDir && href.startsWith("projects/")) {
          href = `../${href}`;
        }
        a.setAttribute("href", href);
      });

      // Normalize <use> sprite hrefs
      document.querySelectorAll('use[href^="assets/icons/"]').forEach((u) => {
        const frag = u.getAttribute("href") || "";
        if (!frag) return;
        if (inProjectsDir && !frag.startsWith("../")) {
          u.setAttribute("href", `../${frag}`);
        }
      });

      // Also adjust the menu toggle icon if present (use fragment-only to work with inline sprite)
      if (btn) {
        const opened = list?.classList.contains("open");
        const useEl = btn.querySelector("use");
        if (useEl) {
          const target = `#${opened ? "icon-close" : "icon-menu"}`;
          useEl.setAttribute("href", target);
          try {
            useEl.setAttribute("xlink:href", target);
          } catch (e) {}
        }
      }
    };

    normalizePaths();
    if (!btn || !list) return;

    const setOpen = (open) => {
      if (open) list.classList.add("open");
      else list.classList.remove("open");
      btn.setAttribute("aria-expanded", String(open));
      const useEl = btn.querySelector("use");
      if (useEl) {
        const target = `#${open ? "icon-close" : "icon-menu"}`;
        useEl.setAttribute("href", target);
        try {
          useEl.setAttribute("xlink:href", target);
        } catch (e) {}
      }
    };

    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const open = !list.classList.contains("open");
      setOpen(open);
    });

    // Close on any nav link click
    list.addEventListener("click", (e) => {
      const t = e.target;
      if (t && (t.tagName === "A" || t.closest("a"))) {
        setOpen(false);
      }
    });

    // Close when clicking outside the nav
    document.addEventListener("click", (e) => {
      if (!list.classList.contains("open")) return;
      const withinNav = list.contains(e.target) || btn.contains(e.target);
      if (!withinNav) setOpen(false);
    });

    // Close with Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && list.classList.contains("open")) setOpen(false);
    });

    // Close when resizing to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 800 && list.classList.contains("open"))
        setOpen(false);
    });
  }

  // Render Featured projects on home
  async function renderFeatured() {
    const grid = document.getElementById("featuredGrid");
    if (!grid) return;
    try {
      const data = await (await fetch("data/projects.json")).json();
      data.slice(0, 4).forEach((p) => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <img src="${p.image}" alt="${
          p.title
        }" style="width:100%;height:160px;object-fit:cover;border-radius:8px" loading="lazy" decoding="async">
          <h3 style="margin:.6rem 0 .2rem">${p.title}</h3>
          <p style="color:var(--muted);margin:0 0 .6rem">${p.excerpt}</p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">${(p.stack || [])
            .map((t) => `<span class="chip">${t}</span>`)
            .join("")}</div>
          <div style="margin-top:.8rem"><a class="btn btn-ghost" href="${
            p.url
          }">Case study</a></div>`;
        grid.appendChild(card);
      });
    } catch (e) {
      console.warn("Could not load projects", e);
    }
  }

  // Render full projects list on /projects/
  async function renderProjectsList() {
    const list = document.getElementById("project-list");
    if (!list) return;
    try {
      const parts = location.pathname.split("/").filter(Boolean);
      const inProjectsDir = parts.includes("projects");
      const basePrefix = inProjectsDir ? "../" : "";
      const data = await (
        await fetch(`${basePrefix}data/projects.json`)
      ).json();
      data.forEach((p) => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <img src="${basePrefix}${p.image}" alt="${
          p.title
        }" style="width:100%;height:160px;object-fit:cover;border-radius:8px" loading="lazy" decoding="async">
          <h3 style="margin:.6rem 0 .2rem">${p.title}</h3>
          <p style="color:var(--muted);margin:0 0 .6rem">${p.excerpt}</p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">${(p.stack || [])
            .map((t) => `<span class='chip'>${t}</span>`)
            .join("")}</div>
          <div style="margin-top:.8rem"><a class="btn btn-ghost" href="${
            /^https?:\/\//i.test(p.url) ? p.url : basePrefix + p.url
          }">Read more</a></div>`;
        list.appendChild(card);
      });
    } catch (e) {
      console.warn("Could not load project list", e);
    }
  }

  // Scroll reveal
  function initReveal() {
    if (isReduced) return;
    const rObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = 1;
            e.target.style.transform = "translateY(0)";
            rObserver.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".card, .chip, .hero-left").forEach((el) => {
      el.style.opacity = 0;
      el.style.transform = "translateY(12px)";
      rObserver.observe(el);
    });
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", async () => {
    // year in footer (if present)
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    await loadIncludes();

    // Inline SVG sprite and rewrite <use> to fragment-only for robust icon rendering
    async function inlineSprite() {
      if (document.getElementById("__svg-sprite")) return;
      const parts = location.pathname.split("/").filter(Boolean);
      const inProjectsDir = parts.includes("projects");
      const basePrefix = inProjectsDir ? "../" : "";
      // Prefer the clean icons-sprite.svg; keep fallbacks for legacy names
      const pathsToTry = [
        `${basePrefix}assets/icons/icons-sprite.svg`,
        `${basePrefix}assets/icons/icon-sprite.svg`,
        `${basePrefix}assets/icons/icon-sprite.xml`,
      ];
      let svgText = "";
      for (const p of pathsToTry) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            svgText = await res.text();
            break;
          }
        } catch (e) {
          /* try next */
        }
      }
      if (!svgText) return;
      const holder = document.createElement("div");
      holder.id = "__svg-sprite";
      holder.style.display = "none";
      holder.setAttribute("aria-hidden", "true");
      holder.innerHTML = svgText;
      document.body.insertBefore(holder, document.body.firstChild);

      // After inlining, rewrite any <use> hrefs to fragment-only
      document.querySelectorAll("use").forEach((u) => {
        const raw =
          u.getAttribute("href") || u.getAttribute("xlink:href") || "";
        if (!raw) return;
        const hashIndex = raw.indexOf("#");
        if (hashIndex === -1) return;
        const frag = raw.slice(hashIndex);
        u.setAttribute("href", frag);
        try {
          u.setAttribute("xlink:href", frag);
        } catch (e) {}
      });
    }
    await inlineSprite();
    // After includes injected, normalize again
    (function () {
      setTimeout(() => {
        const parts = location.pathname.split("/").filter(Boolean);
        const inProjectsDir = parts.includes("projects");
        const basePrefix = inProjectsDir ? "../" : "";
        document.querySelectorAll("[data-href]").forEach((a) => {
          const target = a.getAttribute("data-href");
          if (!target) return;
          const needsUp = inProjectsDir && !target.startsWith("projects/");
          const href = needsUp ? `../${target}` : target;
          a.setAttribute("href", href);
        });
        // If any remaining uses still point to file paths, try to prefix; inlineSprite will have normalized to fragments
        document.querySelectorAll('use[href^="assets/icons/"]').forEach((u) => {
          const frag = u.getAttribute("href") || "";
          if (!frag) return;
          if (inProjectsDir && !frag.startsWith("../")) {
            const newHref = `../${frag}`;
            u.setAttribute("href", newHref);
            try {
              u.setAttribute("xlink:href", newHref);
            } catch (e) {}
          }
        });
      }, 0);
    })();
    initTheme();
    initNav();
    renderFeatured();
    renderProjectsList();
    initReveal();

    // Contact form -> open mail client with prefilled message (no server 405s)
    (function initContactForm() {
      const form = document.querySelector("form.contact-form");
      if (!form) return;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = (form.querySelector('[name="name"]').value || "").trim();
        const email = (form.querySelector('[name="email"]').value || "").trim();
        const message = (
          form.querySelector('[name="message"]').value || ""
        ).trim();
        if (!name || !email || !message) {
          alert("Please complete all fields before sending.");
          return;
        }
        const to = "blessedkingkingsley2002@gmail.com";
        const subject = encodeURIComponent(`Portfolio message from ${name}`);
        const body = encodeURIComponent(
          `Name: ${name}\nEmail: ${email}\n\n${message}`
        );
        const href = `mailto:${to}?subject=${subject}&body=${body}`;
        // Prefer opening in the same tab to trigger the mail client
        window.location.href = href;
      });
    })();

    // Ensure CV download works; if PDF missing, offer a clean text fallback
    (function ensureCvDownload() {
      const link =
        document.getElementById("downloadCv") ||
        document.querySelector('a[href$="Kingsley_Maduabuchi_CV.pdf"]');
      if (!link) return;
      link.addEventListener("click", async (e) => {
        try {
          const res = await fetch(link.getAttribute("href"), {
            method: "HEAD",
          });
          if (!res.ok) throw new Error("missing");
          // File exists; allow default download
          return;
        } catch (_) {
          // No PDF found. Offer a clean print-to-PDF of the current page instead.
          e.preventDefault();
          // Small delay to ensure print CSS is applied
          setTimeout(() => window.print(), 10);
        }
      });
    })();
  });
})();
