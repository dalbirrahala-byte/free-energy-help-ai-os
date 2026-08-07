export type ExecutiveIntelligenceCardSource = "live" | "demo";

export type ExecutiveIntelligenceCard = {
  id: string;
  title: string;
  value: string;
  hint: string;
  source: ExecutiveIntelligenceCardSource;
};

export type ExecutiveIntelligenceData = {
  cards: ExecutiveIntelligenceCard[];
};
