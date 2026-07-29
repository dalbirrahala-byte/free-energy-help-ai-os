import type {
  AccountManagerScoreboardRow,
  CommissionCashflowPoint,
  DigitalTwinDemo,
  DrillDownDetail,
  DrillDownSource,
  GraphNode,
  RiskRegisterEntry,
  SalesPipelineProbabilityRow,
} from "./types";

export function getDemoDigitalTwin(): DigitalTwinDemo {
  const customerId = "CUST-DEMO-001";
  return {
    customerId,
    customerName: "Derby Manufacturing Ltd (demo)",
    executiveHealth: {
      overallScore: 71,
      overallLabel: "71 / 100 — Portfolio stable with renewal pressure (demo)",
      trend: "+2 vs prior month (demo)",
      confidence: "Medium confidence — demo modules only",
      drivers: [
        { label: "Renewal retention", impact: "−4 pts (demo)" },
        { label: "Commission collection", impact: "+2 pts (demo)" },
        { label: "Pipeline conversion", impact: "+3 pts (demo)" },
      ],
      managementNote: "Prioritise July renewals and commission chase (demo executive action).",
    },
    executiveKpis: [
      { id: "k1", label: "Portfolio health", value: "71 / 100 (demo)" },
      { id: "k2", label: "Active customers", value: "248 (demo)" },
      { id: "k3", label: "Renewals 90d", value: "41 (demo)" },
      { id: "k4", label: "Pipeline (demo)", value: "£1.2m" },
      { id: "k5", label: "Commission outstanding", value: "£43.6k (demo)" },
      { id: "k6", label: "At-risk accounts", value: "12 (demo)" },
      { id: "k7", label: "Quote win rate", value: "38.6% (demo)" },
      { id: "k8", label: "Live transfer SLA", value: "94% (demo)" },
    ],
    executive: {
      customerHealth: "68 / 100 — At risk renewal (demo)",
      estimatedAnnualSpend: "£412,000 (demo)",
      estimatedAnnualCommission: "£18,400 (demo)",
      annualElectricityKwh: "420,000 kWh (demo)",
      annualGasKwh: "180,000 kWh (demo)",
      siteCount: "2 (demo)",
      activeContracts: "2 live (demo)",
      upcomingRenewals: "1 within 30 days (demo)",
      openQuotes: "1 — QTE-2026-0147 (demo)",
      liveTransfers: "1 this week (demo)",
      outstandingCommission: "£4,860 expected (demo)",
      profitability: "Medium — demo margin model",
      aiConfidence: "Medium confidence (not connected)",
    },
    revenueForecast: [
      { period: "Aug 2026", commissionDemo: "£42k", marginDemo: "£118k", pipelineDemo: "£280k" },
      { period: "Sep 2026", commissionDemo: "£38k", marginDemo: "£105k", pipelineDemo: "£310k" },
      { period: "Oct 2026", commissionDemo: "£45k", marginDemo: "£122k", pipelineDemo: "£295k" },
      { period: "Nov 2026", commissionDemo: "£51k", marginDemo: "£130k", pipelineDemo: "£340k" },
      { period: "Dec 2026", commissionDemo: "£48k", marginDemo: "£125k", pipelineDemo: "£360k" },
      { period: "Q1 2027", commissionDemo: "£142k", marginDemo: "£380k", pipelineDemo: "£1.1m" },
    ],
    customerRiskMatrix: [
      { id: "cr1", customer: "Derby Manufacturing Ltd", riskScore: 78, churnRisk: "High", renewalRisk: "Critical", dataRisk: "Low", owner: "Alex Morgan", nextAction: "Call today (demo)" },
      { id: "cr2", customer: "Peak Logistics Group", riskScore: 62, churnRisk: "Medium", renewalRisk: "High", dataRisk: "Medium", owner: "Jordan Lee", nextAction: "Quote chase (demo)" },
      { id: "cr3", customer: "Midlands Cold Store", riskScore: 55, churnRisk: "Medium", renewalRisk: "Medium", dataRisk: "High", owner: "Sam Patel", nextAction: "Data task (demo)" },
      { id: "cr4", customer: "Harbour Foods Ltd", riskScore: 41, churnRisk: "Low", renewalRisk: "Low", dataRisk: "Low", owner: "Alex Morgan", nextAction: "Monitor (demo)" },
    ],
    supplierIntelligence: [
      { id: "s1", supplier: "EDF Energy", acceptanceRate: "92% (demo)", paymentSpeed: "28d (demo)", serviceScore: "4.1/5 (demo)", activeContracts: "84 (demo)", concern: "None (demo)" },
      { id: "s2", supplier: "BGLite", acceptanceRate: "88% (demo)", paymentSpeed: "35d (demo)", serviceScore: "3.8/5 (demo)", activeContracts: "52 (demo)", concern: "Service tickets up (demo)" },
      { id: "s3", supplier: "SmartestEnergy", acceptanceRate: "79% (demo)", paymentSpeed: "45d (demo)", serviceScore: "3.5/5 (demo)", activeContracts: "31 (demo)", concern: "Payment delay (demo)" },
    ],
    renewalHeatMap: [
      { id: "rh1", window: "0–7 days", count: 3, valueDemo: "£210k", intensity: "critical", customers: "Derby Mfg +2 (demo)" },
      { id: "rh2", window: "8–30 days", count: 7, valueDemo: "£480k", intensity: "high", customers: "7 accounts (demo)" },
      { id: "rh3", window: "31–60 days", count: 11, valueDemo: "£620k", intensity: "medium", customers: "11 accounts (demo)" },
      { id: "rh4", window: "61–90 days", count: 20, valueDemo: "£890k", intensity: "low", customers: "20 accounts (demo)" },
    ],
    opportunityRadar: [
      { id: "or1", type: "Renewal retention", customer: "Derby Manufacturing Ltd", valueDemo: "£109k ACV", probability: "62% (demo)", priority: "Critical", owner: "Alex Morgan" },
      { id: "or2", type: "Solar", customer: "Derby Manufacturing Ltd", valueDemo: "£240k (demo)", probability: "45% (demo)", priority: "High", owner: "Growth desk" },
      { id: "or3", type: "Commission recovery", customer: "Peak Logistics Group", valueDemo: "£8.2k", probability: "65% (demo)", priority: "High", owner: "Finance ops" },
      { id: "or4", type: "Multi-site tender", customer: "Harbour Foods Ltd", valueDemo: "£320k", probability: "55% (demo)", priority: "Medium", owner: "Sam Patel" },
    ],
    aiRecommendations: [
      { id: "ai1", title: "Call Derby Manufacturing today", reason: "Renewal end date — decision engine (demo)", module: "Enterprise Intelligence", priority: "Critical", approvalRequired: false, status: "New (demo)" },
      { id: "ai2", title: "Send revised 36-month quote", reason: "Quote stalled 10 days (demo)", module: "AI Sales Assistant", priority: "High", approvalRequired: true, status: "Awaiting approval (demo)" },
      { id: "ai3", title: "Chase SmartestEnergy commission", reason: "Payment 45d late (demo)", module: "Commission Intelligence", priority: "Medium", approvalRequired: true, status: "New (demo)" },
    ],
    accountManagerScoreboard: [
      { id: "am1", name: "Alex Morgan (demo)", openTasks: "14", renewalsDue: "6", pipelineDemo: "£420k", conversionDemo: "41% (demo)", workloadScore: 78 },
      { id: "am2", name: "Jordan Lee (demo)", openTasks: "11", renewalsDue: "4", pipelineDemo: "£310k", conversionDemo: "36% (demo)", workloadScore: 65 },
      { id: "am3", name: "Sam Patel (demo)", openTasks: "19", renewalsDue: "5", pipelineDemo: "£385k", conversionDemo: "44% (demo)", workloadScore: 82 },
    ] satisfies AccountManagerScoreboardRow[],
    salesPipelineProbability: [
      { id: "sp1", deal: "Derby Manufacturing renewal", stage: "Negotiation", valueDemo: "£109k (demo)", probability: "62% (demo)", owner: "Alex Morgan" },
      { id: "sp2", deal: "Peak Logistics tender", stage: "Quote sent", valueDemo: "£85k (demo)", probability: "48% (demo)", owner: "Sam Patel" },
      { id: "sp3", deal: "Harbour Foods multi-site", stage: "Qualification", valueDemo: "£320k (demo)", probability: "35% (demo)", owner: "Jordan Lee" },
    ] satisfies SalesPipelineProbabilityRow[],
    commissionCashflowForecast: [
      { period: "Aug 2026", expectedDemo: "£42k", receivedDemo: "£28k", outstandingDemo: "£14k (demo)" },
      { period: "Sep 2026", expectedDemo: "£38k", receivedDemo: "—", outstandingDemo: "£38k (demo)" },
      { period: "Oct 2026", expectedDemo: "£45k", receivedDemo: "—", outstandingDemo: "£45k (demo)" },
      { period: "Nov 2026", expectedDemo: "£51k", receivedDemo: "—", outstandingDemo: "£51k (demo)" },
    ] satisfies CommissionCashflowPoint[],
    riskRegister: [
      { id: "rr1", risk: "July renewal cluster concentration", severity: "High", owner: "Director (demo)", mitigation: "AM stand-up daily (demo)", reviewDate: "29 Jul 2026" },
      { id: "rr2", risk: "Supplier payment delays", severity: "Medium", owner: "Finance ops (demo)", mitigation: "Commission chase playbook (demo)", reviewDate: "01 Aug 2026" },
      { id: "rr3", risk: "Data quality on HH sites", severity: "Medium", owner: "Operations (demo)", mitigation: "MPAN cleanup sprint (demo)", reviewDate: "05 Aug 2026" },
      { id: "rr4", risk: "Live transfer wait breaches", severity: "Low", owner: "Jordan Lee (demo)", mitigation: "Queue staffing review (demo)", reviewDate: "Weekly (demo)" },
    ] satisfies RiskRegisterEntry[],
    sites: [
      {
        id: "SITE-01",
        address: "Riverside Industrial Estate, Derby DE1 2AB (demo)",
        mpan: "1234567890123",
        mprn: "9876543210",
        supplier: "EDF Energy (demo)",
        contract: "CTR-DEMO-991",
        contractEnd: "28 Jul 2026",
        meterType: "Half-hourly",
        hhNhh: "HH",
        capacity: "750 kVA (demo)",
        solarSuitability: "High — roof area (demo)",
        batterySuitability: "Medium (demo)",
        evSuitability: "Low — limited bays (demo)",
      },
      {
        id: "SITE-02",
        address: "Unit 4, Derby Trade Park DE21 6XY (demo)",
        mpan: "1234567890999",
        mprn: "—",
        supplier: "BGLite (demo)",
        contract: "CTR-DEMO-992",
        contractEnd: "15 Nov 2026",
        meterType: "Non-half-hourly",
        hhNhh: "NHH",
        capacity: "—",
        solarSuitability: "Medium (demo)",
        batterySuitability: "Low (demo)",
        evSuitability: "Medium (demo)",
      },
    ],
    timeline: [
      { id: "t1", occurredLabel: "28 Jul 2026, 10:02", category: "Live transfer", title: "Inbound transfer connected", detail: "Queue wait 72s (demo)", owner: "Alex Morgan" },
      { id: "t2", occurredLabel: "27 Jul 2026, 15:40", category: "Quote", title: "Quote QTE-2026-0147 sent", detail: "36-month fixed option (demo)", owner: "Sam Patel" },
      { id: "t3", occurredLabel: "26 Jul 2026, 09:00", category: "Renewal", title: "Renewal window opened", detail: "30-day window (demo)", owner: "Renewals engine" },
      { id: "t4", occurredLabel: "25 Jul 2026, 14:20", category: "Call", title: "Outbound renewal call", detail: "Left voicemail (demo)", owner: "Alex Morgan" },
      { id: "t5", occurredLabel: "24 Jul 2026, 11:00", category: "AI recommendation", title: "Call customer today", detail: "Decision engine (demo)", owner: "Enterprise Intelligence" },
      { id: "t6", occurredLabel: "20 Jul 2026, 16:30", category: "Document", title: "LOA requested", detail: "Pending signature (demo)", owner: "Operations" },
      { id: "t7", occurredLabel: "18 Jul 2026, 10:15", category: "Supplier change", title: "Pricing refresh", detail: "EDF row updated (demo)", owner: "Quote desk" },
      { id: "t8", occurredLabel: "12 Jun 2026, 09:15", category: "Meeting", title: "Account review", detail: "Annual consumption validated (demo)", owner: "Alex Morgan" },
    ],
    healthScores: [
      { category: "Revenue", score: 72, label: "Stable (demo)", trend: "+2" },
      { category: "Retention", score: 58, label: "Renewal risk (demo)", trend: "-5" },
      { category: "Commission", score: 65, label: "Outstanding (demo)", trend: "0" },
      { category: "Supplier Risk", score: 70, label: "Acceptable (demo)", trend: "+1" },
      { category: "Data Quality", score: 82, label: "Good (demo)", trend: "+3" },
      { category: "Consumption", score: 75, label: "Validated HH (demo)", trend: "0" },
      { category: "Carbon", score: 68, label: "Baseline only (demo)", trend: "N/A" },
      { category: "Growth", score: 61, label: "Solar lead (demo)", trend: "+4" },
    ],
    growth: [
      { id: "g1", type: "Solar", summary: "Riverside roof — 180 kWp potential (demo)", estimatedDemoValue: "£240k (demo)", confidence: "Medium (demo)" },
      { id: "g2", type: "Battery", summary: "Peak shaving review (demo)", estimatedDemoValue: "£85k (demo)", confidence: "Low (demo)" },
      { id: "g3", type: "EV", summary: "Fleet expansion 2027 (demo)", estimatedDemoValue: "£32k (demo)", confidence: "Low (demo)" },
      { id: "g4", type: "Water", summary: "Retail water tender (demo)", estimatedDemoValue: "£12k (demo)", confidence: "Medium (demo)" },
      { id: "g5", type: "Telecoms", summary: "Multi-site broadband (demo)", estimatedDemoValue: "£8k (demo)", confidence: "Low (demo)" },
      { id: "g6", type: "Insurance", summary: "Property cover review (demo)", estimatedDemoValue: "£15k (demo)", confidence: "Low (demo)" },
      { id: "g7", type: "Merchant Services", summary: "Card processing (demo)", estimatedDemoValue: "£5k (demo)", confidence: "Planned (demo)" },
      { id: "g8", type: "kVA Review", summary: "750 kVA capacity check (demo)", estimatedDemoValue: "£18k savings (demo)", confidence: "High (demo)" },
      { id: "g9", type: "MOP Review", summary: "HH agent contract (demo)", estimatedDemoValue: "£4k (demo)", confidence: "Medium (demo)" },
      { id: "g10", type: "DC Review", summary: "Data collector alignment (demo)", estimatedDemoValue: "£3k (demo)", confidence: "Medium (demo)" },
    ],
    graphNodes: buildGraphNodes(),
    knowledge: {
      customerSummary: "Industrial dual-fuel HH/NHH account with two Derby sites (demo).",
      energyProfile: "420k kWh elec, 180k kWh gas — manufacturing load (demo).",
      buyingBehaviour: "Price-sensitive; prefers fixed contracts 36 months (demo).",
      supplierHistory: "EDF elec since 2023; BGLite gas (demo).",
      renewalHistory: "Retained 2023 renewal; current cycle critical (demo).",
      aiRecommendations: [
        "Call primary contact today (demo)",
        "Send revised 36-month quote (demo)",
        "Validate LOA before supplier submission (demo)",
      ],
      businessRisks: ["Contract end 28 Jul 2026 (demo)", "Commission not yet paid (demo)"],
      growthOpportunities: ["Solar Riverside (demo)", "kVA review (demo)"],
    },
  };
}

function buildGraphNodes(): GraphNode[] {
  return [
    { id: "customer", type: "customer", label: "Derby Manufacturing Ltd", links: ["site1", "site2", "quote1", "task1"], drillDownSummary: "Primary account — renewal critical (demo)" },
    { id: "site1", type: "site", label: "Riverside", links: ["meter1", "contract1", "customer"], drillDownSummary: "HH site — 420k kWh (demo)" },
    { id: "site2", type: "site", label: "Unit 4", links: ["meter2", "contract2", "customer"], drillDownSummary: "NHH gas-led unit (demo)" },
    { id: "meter1", type: "meter", label: "MPAN …0123", links: ["site1", "contract1"], drillDownSummary: "Half-hourly profile attached (demo)" },
    { id: "meter2", type: "meter", label: "MPAN …0999", links: ["site2", "contract2"], drillDownSummary: "Annual estimate on file (demo)" },
    { id: "contract1", type: "contract", label: "CTR-DEMO-991", links: ["supplier1", "renewal1", "commission1"], drillDownSummary: "Ends 28 Jul 2026 (demo)" },
    { id: "contract2", type: "contract", label: "CTR-DEMO-992", links: ["supplier2", "commission1"], drillDownSummary: "Gas contract Nov 2026 (demo)" },
    { id: "supplier1", type: "supplier", label: "EDF Energy", links: ["contract1"], drillDownSummary: "Primary elec supplier (demo)" },
    { id: "supplier2", type: "supplier", label: "BGLite", links: ["contract2"], drillDownSummary: "Gas supplier (demo)" },
    { id: "commission1", type: "commission", label: "COM forecast", links: ["contract1", "contract2"], drillDownSummary: "£4,860 expected (demo)" },
    { id: "renewal1", type: "renewal", label: "Renewal Jul 2026", links: ["contract1", "quote1"], drillDownSummary: "Window open (demo)" },
    { id: "quote1", type: "quote", label: "QTE-0147", links: ["customer", "renewal1"], drillDownSummary: "Negotiating (demo)" },
    { id: "task1", type: "task", label: "Renewal call", links: ["customer"], drillDownSummary: "Due today (demo)" },
  ];
}

export function getLinkedNodeIds(nodes: GraphNode[], selectedId: string): Set<string> {
  const selected = nodes.find((n) => n.id === selectedId);
  if (!selected) return new Set([selectedId]);
  const linked = new Set<string>([selectedId, ...selected.links]);
  selected.links.forEach((id) => {
    const neighbor = nodes.find((n) => n.id === id);
    neighbor?.links.forEach((l) => linked.add(l));
  });
  return linked;
}

export function resolveDrillDown(twin: DigitalTwinDemo, source: DrillDownSource): DrillDownDetail | null {
  if (!source) return null;
  if (source.kind === "site") {
    const site = twin.sites.find((s) => s.id === source.id);
    if (!site) return null;
    return {
      title: site.address,
      subtitle: "Site drill-down (demo)",
      fields: [
        { label: "MPAN", value: site.mpan },
        { label: "MPRN", value: site.mprn },
        { label: "Supplier", value: site.supplier },
        { label: "Contract end", value: site.contractEnd },
        { label: "Solar", value: site.solarSuitability },
      ],
      actions: ["Open site record — Not configured", "Create task — Not configured"],
    };
  }
  if (source.kind === "graph") {
    const node = twin.graphNodes.find((n) => n.id === source.id);
    if (!node) return null;
    return {
      title: node.label,
      subtitle: `${node.type} entity (demo)`,
      fields: [
        { label: "Summary", value: node.drillDownSummary ?? "—" },
        { label: "Links", value: `${node.links.length} related entities` },
      ],
      actions: ["Trace correlation — Not configured"],
    };
  }
  if (source.kind === "risk") {
    const row = twin.customerRiskMatrix.find((r) => r.id === source.id);
    if (!row) return null;
    return {
      title: row.customer,
      subtitle: "Customer risk drill-down (demo)",
      fields: [
        { label: "Risk score", value: String(row.riskScore) },
        { label: "Churn", value: row.churnRisk },
        { label: "Renewal", value: row.renewalRisk },
        { label: "Owner", value: row.owner },
      ],
      actions: [row.nextAction + " — Not configured"],
    };
  }
  if (source.kind === "renewal") {
    const cell = twin.renewalHeatMap.find((c) => c.id === source.id);
    if (!cell) return null;
    return {
      title: `Renewals ${cell.window}`,
      subtitle: "Renewal heat drill-down (demo)",
      fields: [
        { label: "Count", value: String(cell.count) },
        { label: "Value", value: cell.valueDemo },
        { label: "Customers", value: cell.customers },
      ],
      actions: ["Open renewal register — Not configured"],
    };
  }
  if (source.kind === "opportunity") {
    const opp = twin.opportunityRadar.find((o) => o.id === source.id);
    if (!opp) return null;
    return {
      title: opp.type,
      subtitle: opp.customer,
      fields: [
        { label: "Value", value: opp.valueDemo },
        { label: "Probability", value: opp.probability },
        { label: "Priority", value: opp.priority },
        { label: "Owner", value: opp.owner },
      ],
      actions: ["Assign action — Not configured"],
    };
  }
  if (source.kind === "supplier") {
    const sup = twin.supplierIntelligence.find((s) => s.id === source.id);
    if (!sup) return null;
    return {
      title: sup.supplier,
      subtitle: "Supplier intelligence drill-down (demo)",
      fields: [
        { label: "Acceptance", value: sup.acceptanceRate },
        { label: "Payment speed", value: sup.paymentSpeed },
        { label: "Service", value: sup.serviceScore },
        { label: "Concern", value: sup.concern },
      ],
      actions: ["Open supplier hub — Not configured"],
    };
  }
  return null;
}
