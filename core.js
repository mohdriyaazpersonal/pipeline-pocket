export const STAGES = [
  { id: "lead", label: "New leads", chance: 0.2 },
  { id: "qualified", label: "Qualified", chance: 0.5 },
  { id: "proposal", label: "Proposal", chance: 0.8 },
  { id: "won", label: "Won", chance: 1 },
  { id: "lost", label: "Lost", chance: 0 },
];
export const isOpen = (deal) => !["won", "lost"].includes(deal.stage);
export function validDate(v) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function validateDeal(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Each deal must be an object.");
  const deal = {};
  for (const [key, max] of Object.entries({
    id: 100,
    title: 120,
    company: 100,
    contact: 100,
    email: 160,
    phone: 40,
    notes: 4000,
    closeDate: 10,
    stage: 20,
  })) {
    if (typeof input[key] !== "string" || input[key].length > max)
      throw new Error(`Invalid ${key} in a deal.`);
    deal[key] = input[key].trim();
  }
  if (!deal.id || !deal.title || !deal.company)
    throw new Error("Deal name and company are required.");
  if (!STAGES.some((s) => s.id === deal.stage))
    throw new Error("Choose a valid sales stage.");
  if (!validDate(deal.closeDate))
    throw new Error("Choose a valid expected close date.");
  if (deal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deal.email))
    throw new Error("Enter a valid contact email.");
  if (
    typeof input.value !== "number" ||
    !Number.isFinite(input.value) ||
    input.value < 0 ||
    input.value > 1e12
  )
    throw new Error("Deal value must be between 0 and 1 trillion.");
  deal.value = Math.round(input.value * 100) / 100;
  return deal;
}
export function validateBackup(input) {
  if (
    !input ||
    input.version !== 1 ||
    !Array.isArray(input.deals) ||
    input.deals.length > 2000
  )
    throw new Error(
      "Choose a Pipeline Pocket v1 backup with up to 2,000 deals.",
    );
  const deals = input.deals.map(validateDeal);
  if (new Set(deals.map((d) => d.id)).size !== deals.length)
    throw new Error("Deal IDs must be unique.");
  return deals;
}
export function statistics(deals) {
  const open = deals.filter(isOpen),
    won = deals.filter((d) => d.stage === "won"),
    lost = deals.filter((d) => d.stage === "lost");
  return {
    openCount: open.length,
    pipeline: open.reduce((a, d) => a + d.value, 0),
    forecast: open.reduce(
      (a, d) => a + d.value * STAGES.find((s) => s.id === d.stage).chance,
      0,
    ),
    won: won.reduce((a, d) => a + d.value, 0),
    winRate:
      won.length + lost.length
        ? (won.length / (won.length + lost.length)) * 100
        : 0,
  };
}
export function filterDeals(deals, search = "", stage = "all") {
  const term = search.trim().toLowerCase();
  return deals.filter(
    (d) =>
      (stage === "all" || (stage === "open" ? isOpen(d) : d.stage === stage)) &&
      (!term ||
        [d.title, d.company, d.contact, d.email, d.notes].some((v) =>
          v.toLowerCase().includes(term),
        )),
  );
}
export function demoDeals(today = new Date()) {
  const date = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return [
    [
      "Fieldwork",
      "Brand refresh & website",
      8500,
      "lead",
      "Alex Morgan",
      12,
      "Discovery call booked. Interested in a clear, nature-inspired brand.",
    ],
    [
      "Arc Studio",
      "Product design sprint",
      12000,
      "lead",
      "Jamie Chen",
      19,
      "Referral from the design meetup. Send a short capabilities deck.",
    ],
    [
      "Mono Coffee",
      "Digital storefront",
      6400,
      "qualified",
      "Taylor Reed",
      8,
      "Budget confirmed. Launching a subscription coffee line this winter.",
    ],
    [
      "Evergreen",
      "Customer research",
      4800,
      "qualified",
      "Sam Rivera",
      -2,
      "Follow up on the research scope and participant recruitment.",
    ],
    [
      "Forma Health",
      "Patient portal redesign",
      18000,
      "proposal",
      "Jordan Lee",
      5,
      "Proposal shared. Review with the operations team on Thursday.",
    ],
    [
      "Daylight",
      "Launch campaign",
      9200,
      "proposal",
      "Casey Patel",
      14,
      "Two-phase engagement. Start with positioning, then a launch kit.",
    ],
    [
      "Kinfolk",
      "Visual identity system",
      7200,
      "won",
      "Avery Brooks",
      -5,
      "Signed and ready for kickoff. Prepare the project brief.",
    ],
    [
      "Northstar",
      "App concept workshop",
      3500,
      "lost",
      "Riley Park",
      -9,
      "Project paused due to internal timeline changes. Revisit next quarter.",
    ],
  ].map(([company, title, value, stage, contact, days, notes], i) =>
    validateDeal({
      id: `demo-${i + 1}`,
      title,
      company,
      value,
      stage,
      contact,
      email: `${contact.split(" ")[0].toLowerCase()}@${company.toLowerCase().replaceAll(" ", "")}.example`,
      phone: "",
      closeDate: date(days),
      notes,
    }),
  );
}
