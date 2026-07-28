export const PROMPT_LIBRARY = {
  Sales: [
    "Who should I call first today?",
    "Which leads are most likely to convert?",
    "Which quotes need chasing?",
    "Which deals are stalled?",
    "What are my highest-value opportunities?",
  ],
  Customers: [
    "Summarise this customer",
    "Show customers without recent contact",
    "Show multi-site customers",
    "Identify customers at risk",
    "Identify upsell opportunities",
  ],
  Renewals: [
    "Show renewals due in 30 days",
    "Show renewals over £50,000",
    "Which renewals are at risk?",
    "Which customers should be contacted this week?",
    "Draft a renewal plan",
  ],
  Quotes: [
    "Review this quote",
    "Identify missing quote information",
    "Compare supplier options",
    "Flag margin risks",
    "Draft a customer quote summary",
  ],
  Contracts: [
    "Explain this contract position",
    "Show contracts missing paperwork",
    "Show contracts close to expiry",
    "Identify contract risks",
    "Prepare a renewal handover",
  ],
  Commission: [
    "Which suppliers owe commission?",
    "Show overdue commission",
    "Identify underpayments",
    "Summarise commission risk",
    "Draft a supplier chase message",
  ],
  Suppliers: [
    "Which supplier has the best acceptance rate?",
    "Which supplier pays fastest?",
    "Which supplier suits this sector?",
    "Show suppliers under review",
    "Compare supplier performance",
  ],
  Directors: [
    "Summarise business performance",
    "Show the biggest risks",
    "Show the highest-value opportunities",
    "Which account manager needs support?",
    "What should management focus on today?",
  ],
} as const;

export const SUGGESTED_PROMPTS = [
  "Summarise Derby Manufacturing for today's calls",
  "Which renewals need action this week?",
  "Draft a renewal email (demo)",
  "Explain commission exposure by supplier",
  "Prepare call notes for Peak Logistics",
];
