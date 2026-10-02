import {
  $,
  escapeHTML as e,
  readStore,
  writeStore,
  download,
  toast,
  uid,
} from "./lib.js";
import {
  STAGES,
  statistics,
  filterDeals,
  validateDeal,
  validateBackup,
  demoDeals,
  isOpen,
} from "./core.js";
const KEY = "pipeline-pocket-v1";
let deals;
try {
  deals = validateBackup(readStore(KEY, { version: 1, deals: demoDeals() }));
} catch {
  deals = demoDeals();
  toast("Stored data could not be read. The demo is available.");
}
let view = "board",
  section = "pipeline",
  pendingConfirm = null;
const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const initials = (name) =>
  name
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const prettyDate = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
const stageOptions = STAGES.map(
  (s) => `<option value="${s.id}">${s.label} · ${s.chance * 100}%</option>`,
).join("");
$("#deal-form").elements.stage.innerHTML = stageOptions;
$("#stage-filter").innerHTML += STAGES.map(
  (s) => `<option value="${s.id}">${s.label}</option>`,
).join("");
function persist() {
  writeStore(KEY, { version: 1, deals });
  render();
}
function confirmAction(title, message, action) {
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  pendingConfirm = action;
  $("#confirm-dialog").showModal();
}
$("#confirm-cancel").onclick = () => {
  pendingConfirm = null;
  $("#confirm-dialog").close();
};
$("#confirm-yes").onclick = () => {
  $("#confirm-dialog").close();
  const action = pendingConfirm;
  pendingConfirm = null;
  action?.();
};
function render() {
  const stats = statistics(deals);
  $("#stats").innerHTML = [
    [
      "Open pipeline",
      money(stats.pipeline),
      `${stats.openCount} opportunities in motion`,
      "↗",
    ],
    [
      "Weighted forecast",
      money(stats.forecast),
      "Open deals × stage probability",
      "◴",
    ],
    ["Won revenue", money(stats.won), "The good work that paid off", "✧"],
    [
      "Win rate",
      `${Math.round(stats.winRate)}%`,
      "Won ÷ all closed opportunities",
      "◉",
    ],
  ]
    .map(
      ([label, value, hint, icon]) =>
        `<article class="stat"><div class="stat-label">${label}<span class="stat-icon">${icon}</span></div><strong>${value}</strong><small>${hint}</small></article>`,
    )
    .join("");
  const visible = filterDeals(
    deals,
    $("#search").value,
    $("#stage-filter").value,
  );
  $("#deal-count").textContent = visible.length;
  $("#view-title").firstChild.textContent =
    section === "contacts" ? "People & companies " : "Your pipeline ";
  $("#view-description").textContent =
    section === "contacts"
      ? "Every opportunity begins with a conversation."
      : "Small steps. Strong relationships. Real progress.";
  $("#pipeline-nav").classList.toggle("active", section === "pipeline");
  $("#contacts-nav").classList.toggle("active", section === "contacts");
  $(".view-toggle").hidden = section === "contacts";
  $("#board").hidden =
    section !== "pipeline" || view !== "board" || !visible.length;
  $("#list").hidden =
    section !== "pipeline" || view !== "list" || !visible.length;
  $("#contacts").hidden = section !== "contacts" || !visible.length;
  $("#empty").hidden = visible.length > 0;
  $("#board").innerHTML = STAGES.map((s) => {
    const list = visible
      .filter((d) => d.stage === s.id)
      .sort((a, b) => a.closeDate.localeCompare(b.closeDate));
    return `<section class="column ${s.id}" aria-label="${s.label}"><div class="column-header"><span class="stage-dot"></span>${s.label}<span class="count">${list.length}</span></div><p class="column-total">${money(list.reduce((a, d) => a + d.value, 0))} · ${s.chance * 100}% probability</p>${list.length ? list.map(card).join("") : '<div class="column-empty">Room for something good.</div>'}<button class="add-stage" data-stage="${s.id}">＋ Add opportunity</button></section>`;
  }).join("");
  $("#list").innerHTML =
    `<table><thead><tr><th scope="col">Opportunity</th><th scope="col">Contact</th><th scope="col">Value</th><th scope="col">Stage</th><th scope="col">Expected close</th><th scope="col">Action</th></tr></thead><tbody>${[
      ...visible,
    ]
      .sort((a, b) => a.closeDate.localeCompare(b.closeDate))
      .map(
        (d) =>
          `<tr><td><strong>${e(d.title)}</strong><small>${e(d.company)}</small></td><td>${e(d.contact || "No contact yet")}<small>${e(d.email)}</small></td><td>${money(d.value)}</td><td><span class="stage-pill">${STAGES.find((s) => s.id === d.stage).label}</span></td><td class="${isOpen(d) && d.closeDate < today() ? "overdue" : ""}">${e(d.closeDate)}</td><td><button data-edit="${e(d.id)}" aria-label="Edit ${e(d.title)}">Edit ↗</button></td></tr>`,
      )
      .join("")}</tbody></table>`;
  $("#contacts").innerHTML = visible
    .map(
      (d) =>
        `<article class="contact-card"><span class="company-logo">${e(initials(d.company))}</span><h3>${e(d.company)}</h3><p class="contact-name">${e(d.contact || "Add a contact")}</p><p>${d.email ? e(d.email) : "No email saved"}${d.phone ? `<br>${e(d.phone)}` : ""}</p><p>${e(d.title)} · ${money(d.value)}</p><button data-edit="${e(d.id)}">Open opportunity ↗</button></article>`,
    )
    .join("");
  $("#demo-label").textContent = deals.some((d) => d.id.startsWith("demo-"))
    ? "Sample companies and contacts are fictional."
    : `${deals.length} opportunities · USD`;
}
function card(d) {
  const overdue = isOpen(d) && d.closeDate < today();
  return `<button class="deal-card" data-edit="${e(d.id)}" aria-label="Open ${e(d.title)} at ${e(d.company)}"><div class="card-company"><span class="company-logo">${e(initials(d.company))}</span>${e(d.company)}</div><h3>${e(d.title)}</h3><div class="card-value">${money(d.value)}</div><div class="card-footer"><span class="${overdue ? "overdue" : ""}">${overdue ? "◷ Overdue · " : "◷ "}${prettyDate(d.closeDate)}</span><span class="card-person" title="${e(d.contact || "No contact")}">${e(initials(d.contact) || "＋")}</span></div></button>`;
}
function openDeal(id, stage = "lead") {
  const form = $("#deal-form");
  form.reset();
  const deal = deals.find((d) => d.id === id);
  $("#dialog-title").textContent = deal
    ? "A little progress starts here."
    : "A new opportunity.";
  $("#form-error").textContent = "";
  $("#delete-deal").hidden = !deal;
  if (deal)
    for (const [key, value] of Object.entries(deal))
      form.elements[key].value = value;
  else {
    form.elements.id.value = "";
    form.elements.stage.value = stage;
    form.elements.closeDate.value = today();
  }
  $("#deal-dialog").showModal();
  form.elements.title.focus();
}
$("#add-deal").onclick = $("#empty-add").onclick = () => openDeal();
document.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit]"),
    add = event.target.closest("[data-stage]");
  if (edit) openDeal(edit.dataset.edit);
  if (add) openDeal(null, add.dataset.stage);
});
$("#close-dialog").onclick = $("#cancel-dialog").onclick = () =>
  $("#deal-dialog").close();
$("#deal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  try {
    const deal = validateDeal({
      ...data,
      id: data.id || uid(),
      value: Number(data.value),
    });
    const index = deals.findIndex((d) => d.id === deal.id);
    if (index < 0 && deals.length >= 2000)
      throw new Error("This workspace supports up to 2,000 opportunities.");
    if (index < 0) deals.push(deal);
    else deals[index] = deal;
    persist();
    $("#deal-dialog").close();
    toast("Opportunity saved. One step forward.");
  } catch (error) {
    $("#form-error").textContent = error.message;
  }
});
$("#delete-deal").onclick = () => {
  const id = $("#deal-form").elements.id.value;
  confirmAction(
    "Delete this opportunity?",
    "This removes the opportunity and its contact notes from this browser. Export a backup first if you need a copy.",
    () => {
      deals = deals.filter((d) => d.id !== id);
      persist();
      $("#deal-dialog").close();
      toast("Opportunity deleted.");
    },
  );
};
$("#search").addEventListener("input", render);
$("#stage-filter").addEventListener("change", render);
for (const mode of ["board", "list"])
  $("#" + mode + "-view").onclick = () => {
    view = mode;
    $("#board-view").setAttribute("aria-pressed", mode === "board");
    $("#list-view").setAttribute("aria-pressed", mode === "list");
    render();
  };
$("#pipeline-nav").onclick = () => {
  section = "pipeline";
  render();
};
$("#contacts-nav").onclick = () => {
  section = "contacts";
  render();
};
$("#export").onclick = () =>
  download("pipeline-pocket-backup.json", { version: 1, deals });
$("#import-button").onclick = () => $("#import-file").click();
$("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5_000_000)
      throw new Error("Choose a backup smaller than 5 MB.");
    const next = validateBackup(JSON.parse(await file.text()));
    confirmAction(
      "Replace this workspace?",
      `The backup contains ${next.length} opportunities. Importing replaces the ${deals.length} currently in this browser.`,
      () => {
        deals = next;
        persist();
        toast("Backup imported.");
      },
    );
  } catch (error) {
    toast(
      error instanceof SyntaxError
        ? "This file is not valid JSON."
        : error.message,
    );
  } finally {
    event.target.value = "";
  }
});
$("#reset").onclick = () =>
  confirmAction(
    "Reset to the sample workspace?",
    "Your current opportunities will be replaced with fictional sample deals. Export a backup first to keep them.",
    () => {
      deals = demoDeals();
      $("#search").value = "";
      $("#stage-filter").value = "all";
      persist();
      toast("Demo workspace reset.");
    },
  );
render();
