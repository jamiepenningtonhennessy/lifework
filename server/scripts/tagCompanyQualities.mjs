/**
 * tagCompanyQualities.mjs
 *
 * Deterministic rule-based tagger for the company_universe quality taxonomy.
 * Assigns QualityKey[] to each company based on its tier and sector fields.
 *
 * Run: node server/scripts/tagCompanyQualities.mjs
 * Output: /home/ubuntu/company_qualities.json
 */

import { readFileSync, writeFileSync } from "fs";

// ---------------------------------------------------------------------------
// Quality taxonomy keys
// ---------------------------------------------------------------------------
const QUALITY_KEYS = [
  "autonomy",
  "structured_learning",
  "social_impact",
  "commercial_intensity",
  "collaboration",
  "innovation",
  "prestige",
  "scale_and_stability",
];

// ---------------------------------------------------------------------------
// Sector → quality tags
// ---------------------------------------------------------------------------
const SECTOR_QUALITIES = {
  // Law firm sectors
  magic_circle: ["prestige", "structured_learning", "commercial_intensity", "scale_and_stability"],
  silver_circle: ["structured_learning", "commercial_intensity", "prestige"],
  us_firm_london: ["commercial_intensity", "prestige", "autonomy"],
  uk_intl: ["structured_learning", "commercial_intensity", "scale_and_stability"],

  // Tech sectors
  ai: ["innovation", "autonomy", "collaboration"],
  big_tech: ["scale_and_stability", "innovation", "structured_learning", "collaboration"],
  fintech: ["innovation", "commercial_intensity", "collaboration"],
  saas: ["innovation", "autonomy", "collaboration"],
  software: ["innovation", "autonomy", "collaboration"],
  consumer_tech: ["innovation", "collaboration", "commercial_intensity"],
  healthtech: ["innovation", "collaboration", "social_impact"],
  edtech: ["innovation", "social_impact", "collaboration"],
  climatetech: ["innovation", "social_impact", "autonomy"],
  deeptech: ["innovation", "autonomy", "structured_learning"],
  cybersecurity: ["innovation", "autonomy", "commercial_intensity"],
  regtech: ["innovation", "collaboration", "structured_learning"],
  insurtech: ["innovation", "commercial_intensity", "collaboration"],
  retail_tech: ["innovation", "commercial_intensity", "collaboration"],
  data: ["innovation", "autonomy", "collaboration"],

  // Financial services
  bank: ["commercial_intensity", "structured_learning", "scale_and_stability", "prestige"],
  asset_management: ["commercial_intensity", "prestige", "autonomy"],
  private_equity: ["commercial_intensity", "prestige", "autonomy"],
  insurance: ["scale_and_stability", "structured_learning", "commercial_intensity"],
  financial_services: ["commercial_intensity", "structured_learning", "scale_and_stability"],
  wealth_management: ["commercial_intensity", "prestige", "structured_learning"],
  investment_trust: ["commercial_intensity", "prestige"],

  // Professional services
  professional_services: ["structured_learning", "commercial_intensity", "scale_and_stability"],
  recruitment: ["commercial_intensity", "autonomy", "collaboration"],
  advertising: ["collaboration", "innovation", "commercial_intensity"],
  media: ["collaboration", "innovation", "autonomy"],
  events: ["collaboration", "commercial_intensity"],

  // Healthcare & pharma
  pharma: ["structured_learning", "scale_and_stability", "innovation"],
  biotech: ["innovation", "structured_learning", "autonomy"],
  healthcare: ["social_impact", "structured_learning", "scale_and_stability"],
  medical_devices: ["innovation", "structured_learning", "scale_and_stability"],
  consumer_health: ["scale_and_stability", "structured_learning"],

  // Industrial / FTSE sectors
  aerospace: ["structured_learning", "scale_and_stability", "innovation"],
  defence: ["structured_learning", "scale_and_stability", "prestige"],
  automotive: ["scale_and_stability", "structured_learning", "innovation"],
  engineering: ["structured_learning", "scale_and_stability", "collaboration"],
  chemicals: ["scale_and_stability", "structured_learning"],
  energy: ["scale_and_stability", "structured_learning", "innovation"],
  energy_services: ["scale_and_stability", "innovation"],
  utility: ["scale_and_stability", "structured_learning"],
  telecom: ["scale_and_stability", "structured_learning", "innovation"],
  construction: ["scale_and_stability", "structured_learning"],
  homebuilder: ["scale_and_stability", "commercial_intensity"],
  building_materials: ["scale_and_stability"],
  steel: ["scale_and_stability"],
  miner: ["scale_and_stability", "commercial_intensity"],
  industrials: ["scale_and_stability", "structured_learning"],
  equipment_rental: ["scale_and_stability"],
  packaging: ["scale_and_stability"],
  distribution: ["scale_and_stability", "commercial_intensity"],
  transport: ["scale_and_stability", "commercial_intensity"],
  airline: ["scale_and_stability", "commercial_intensity"],
  facilities: ["scale_and_stability"],
  testing: ["scale_and_stability", "structured_learning"],

  // Consumer / retail
  retail: ["commercial_intensity", "scale_and_stability"],
  food_retail: ["commercial_intensity", "scale_and_stability"],
  consumer: ["commercial_intensity", "scale_and_stability"],
  consumer_goods: ["commercial_intensity", "scale_and_stability", "structured_learning"],
  food: ["commercial_intensity", "scale_and_stability"],
  food_ingredients: ["scale_and_stability"],
  beverages: ["commercial_intensity", "scale_and_stability"],
  tobacco: ["commercial_intensity", "scale_and_stability"],
  hospitality: ["commercial_intensity", "collaboration"],
  catering: ["commercial_intensity", "collaboration"],
  travel: ["commercial_intensity", "collaboration"],
  wholesale: ["commercial_intensity", "scale_and_stability"],
  conglomerate: ["scale_and_stability", "commercial_intensity"],

  // Other
  education: ["social_impact", "structured_learning", "collaboration"],
  gambling: ["commercial_intensity", "innovation"],
  reit: ["commercial_intensity", "scale_and_stability"],
  it_services: ["structured_learning", "scale_and_stability", "collaboration"],
  it_reseller: ["commercial_intensity", "scale_and_stability"],
  business_services: ["commercial_intensity", "collaboration"],
};

// ---------------------------------------------------------------------------
// Tier modifiers — add or reinforce qualities based on company tier
// ---------------------------------------------------------------------------
function applyTierModifiers(qualities, tier) {
  const set = new Set(qualities);

  switch (tier) {
    case "law_firm":
      // All law firms get structured_learning and commercial_intensity as baseline
      set.add("structured_learning");
      set.add("commercial_intensity");
      break;

    case "ftse100":
      // Large listed companies: scale, stability, structured programmes
      set.add("scale_and_stability");
      set.add("structured_learning");
      break;

    case "ftse250":
      // Mid-cap listed: still scale but slightly more agile
      set.add("scale_and_stability");
      break;

    case "global_tech_uk":
      // Global tech with UK presence: innovation + scale
      set.add("innovation");
      set.add("scale_and_stability");
      break;

    case "tech_scaleup":
      // Fast-growth startups/scaleups: autonomy + innovation
      set.add("autonomy");
      set.add("innovation");
      break;

    case "uk_private":
      // UK private companies: more varied, but often collaboration-focused
      set.add("collaboration");
      break;
  }

  return [...set];
}

// ---------------------------------------------------------------------------
// Name-based fallback for null-tier null-sector companies
// These are mostly US tech startups/scaleups with no tier/sector set
// ---------------------------------------------------------------------------
const NAME_FALLBACKS = {
  // AI/ML companies
  "Harvey AI": ["innovation", "autonomy", "commercial_intensity"],
  "Faculty AI": ["innovation", "autonomy", "social_impact"],
  "Hugging Face": ["innovation", "autonomy", "collaboration"],
  "Mistral AI": ["innovation", "autonomy"],
  "Cohere": ["innovation", "autonomy", "commercial_intensity"],
  "Anyscale": ["innovation", "autonomy"],
  "Together AI": ["innovation", "autonomy", "collaboration"],
  "Scale AI": ["innovation", "commercial_intensity", "autonomy"],
  "Replicate": ["innovation", "autonomy"],
  "Runway": ["innovation", "autonomy"],
  "LangChain": ["innovation", "autonomy", "collaboration"],
  "Weights & Biases": ["innovation", "autonomy", "collaboration"],
  "Pinecone": ["innovation", "autonomy"],
  "Modal": ["innovation", "autonomy"],
  "Character AI": ["innovation", "autonomy", "commercial_intensity"],
  "Perplexity": ["innovation", "autonomy", "commercial_intensity"],
  "Glean": ["innovation", "autonomy", "collaboration"],
  // Developer tools / infra
  "Cursor": ["innovation", "autonomy"],
  "Replit": ["innovation", "autonomy", "collaboration"],
  "Sourcegraph": ["innovation", "autonomy", "collaboration"],
  "GitLab": ["innovation", "autonomy", "collaboration"],
  "HashiCorp": ["innovation", "autonomy", "collaboration"],
  "Netlify": ["innovation", "autonomy", "collaboration"],
  "Vercel": ["innovation", "autonomy", "collaboration"],
  "Tailscale": ["innovation", "autonomy"],
  "Linear": ["innovation", "autonomy", "collaboration"],
  // Productivity / collaboration tools
  "Notion": ["innovation", "autonomy", "collaboration"],
  "Airtable": ["innovation", "autonomy", "collaboration"],
  "Miro": ["innovation", "collaboration", "autonomy"],
  "Figma": ["innovation", "collaboration", "autonomy"],
  // Consumer / social
  "Discord": ["innovation", "collaboration", "commercial_intensity"],
  "Reddit": ["innovation", "collaboration", "commercial_intensity"],
  "Snap": ["innovation", "commercial_intensity", "autonomy"],
  "Pinterest": ["innovation", "commercial_intensity", "collaboration"],
  "Roblox": ["innovation", "commercial_intensity", "collaboration"],
  // Fintech
  "Brex": ["innovation", "commercial_intensity", "autonomy"],
  "Ramp": ["innovation", "commercial_intensity", "autonomy"],
  "Mercury": ["innovation", "commercial_intensity", "autonomy"],
  "Plaid": ["innovation", "commercial_intensity", "collaboration"],
  "Zopa": ["innovation", "commercial_intensity", "autonomy"],
  // Security
  "1Password": ["innovation", "autonomy", "scale_and_stability"],
  "Wiz": ["innovation", "commercial_intensity", "autonomy"],
};

// ---------------------------------------------------------------------------
// Main tagging logic
// ---------------------------------------------------------------------------
function tagCompany(company) {
  // Use name-based fallback for null-tier null-sector companies
  if (!company.tier && !company.sector) {
    const fallback = NAME_FALLBACKS[company.name];
    if (fallback) return [...fallback].sort();
    // Default for unknown null/null companies: assume tech scaleup
    return ["autonomy", "innovation", "collaboration"];
  }

  const sectorQualities = SECTOR_QUALITIES[company.sector] || [];
  const withTier = applyTierModifiers(sectorQualities, company.tier);

  // Deduplicate and sort for consistency
  const unique = [...new Set(withTier)].sort();

  // Validate all keys are in taxonomy
  const valid = unique.filter((q) => QUALITY_KEYS.includes(q));

  return valid;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const companies = JSON.parse(readFileSync("/home/ubuntu/company_list.json", "utf-8"));

const results = companies.map((company) => ({
  id: company.id,
  name: company.name,
  tier: company.tier,
  sector: company.sector,
  qualities: tagCompany(company),
}));

// Stats
const totalTagged = results.filter((r) => r.qualities.length > 0).length;
const avgTags = results.reduce((sum, r) => sum + r.qualities.length, 0) / results.length;

console.log(`Tagged ${totalTagged}/${results.length} companies`);
console.log(`Average tags per company: ${avgTags.toFixed(2)}`);

// Quality distribution
const dist = {};
QUALITY_KEYS.forEach((k) => (dist[k] = 0));
results.forEach((r) => r.qualities.forEach((q) => dist[q]++));
console.log("\nQuality distribution:");
Object.entries(dist)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Sample untagged
const untagged = results.filter((r) => r.qualities.length === 0);
if (untagged.length > 0) {
  console.log(`\nUntagged companies (${untagged.length}):`);
  untagged.forEach((c) => console.log(`  ${c.name} (tier=${c.tier}, sector=${c.sector})`));
}

writeFileSync("/home/ubuntu/company_qualities.json", JSON.stringify(results, null, 2));
console.log("\nWritten to /home/ubuntu/company_qualities.json");
