/**
 * Seed script: UK 300 Graduate Employers (Cibyl 2025 rankings)
 * Run: node server/scripts/seedGraduateUniverse.mjs
 *
 * Inserts all 300 companies with is_graduate=true.
 * Sectors mapped to the vocabulary used by the existing company universe.
 * ATS provider / careersUrl left null — can be enriched later.
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

// ── UK 300 companies with sector/tier classification ──────────────────────────
// tier vocabulary: law_firm | consulting | banking | tech | public_sector |
//                  fmcg | energy | engineering | media | retail | pharma |
//                  defence | insurance | graduate_scheme
// sector vocabulary: free-form, used for display and LLM weighting

const UK300 = [
  // ── Media & Entertainment ─────────────────────────────────────────────────
  { rank: 1,   name: "BBC",                                     tier: "media",         sector: "broadcasting" },
  { rank: 3,   name: "The Walt Disney Company",                 tier: "media",         sector: "entertainment" },
  { rank: 21,  name: "Sky",                                     tier: "media",         sector: "broadcasting" },
  { rank: 40,  name: "Rockstar Games",                          tier: "tech",          sector: "gaming" },
  { rank: 42,  name: "Sony",                                    tier: "tech",          sector: "consumer_electronics" },
  { rank: 88,  name: "Ubisoft",                                 tier: "tech",          sector: "gaming" },
  { rank: 196, name: "LVMH",                                    tier: "fmcg",          sector: "luxury_goods" },
  { rank: 282, name: "Jagex",                                   tier: "tech",          sector: "gaming" },

  // ── Technology ────────────────────────────────────────────────────────────
  { rank: 5,   name: "Google",                                  tier: "tech",          sector: "big_tech" },
  { rank: 6,   name: "Amazon",                                  tier: "tech",          sector: "big_tech" },
  { rank: 10,  name: "Apple",                                   tier: "tech",          sector: "big_tech" },
  { rank: 11,  name: "Microsoft",                               tier: "tech",          sector: "big_tech" },
  { rank: 27,  name: "IBM",                                     tier: "tech",          sector: "enterprise_tech" },
  { rank: 43,  name: "Meta",                                    tier: "tech",          sector: "big_tech" },
  { rank: 47,  name: "Samsung",                                 tier: "tech",          sector: "consumer_electronics" },
  { rank: 61,  name: "TikTok",                                  tier: "tech",          sector: "social_media" },
  { rank: 66,  name: "Dyson",                                   tier: "tech",          sector: "consumer_electronics" },
  { rank: 73,  name: "Intel",                                   tier: "tech",          sector: "semiconductors" },
  { rank: 78,  name: "Adobe",                                   tier: "tech",          sector: "enterprise_tech" },
  { rank: 85,  name: "Accenture",                               tier: "consulting",    sector: "technology_consulting" },
  { rank: 95,  name: "BT Group",                                tier: "tech",          sector: "telecoms" },
  { rank: 99,  name: "AMD",                                     tier: "tech",          sector: "semiconductors" },
  { rank: 108, name: "Cisco",                                   tier: "tech",          sector: "enterprise_tech" },
  { rank: 116, name: "Oracle",                                  tier: "tech",          sector: "enterprise_tech" },
  { rank: 145, name: "Capgemini",                               tier: "consulting",    sector: "technology_consulting" },
  { rank: 165, name: "Arm",                                     tier: "tech",          sector: "semiconductors" },
  { rank: 173, name: "Vodafone",                                tier: "tech",          sector: "telecoms" },
  { rank: 180, name: "Skyscanner",                              tier: "tech",          sector: "travel_tech" },
  { rank: 195, name: "Ocado Group",                             tier: "tech",          sector: "retail_tech" },
  { rank: 207, name: "Imagination Technologies",                tier: "tech",          sector: "semiconductors" },
  { rank: 209, name: "Vinted",                                  tier: "tech",          sector: "marketplace" },
  { rank: 213, name: "Fujitsu",                                 tier: "tech",          sector: "enterprise_tech" },
  { rank: 214, name: "Just Eat",                                tier: "tech",          sector: "food_tech" },
  { rank: 223, name: "Hewlett Packard Enterprise",              tier: "tech",          sector: "enterprise_tech" },
  { rank: 227, name: "Qualcomm",                                tier: "tech",          sector: "semiconductors" },
  { rank: 242, name: "Salesforce",                              tier: "tech",          sector: "enterprise_tech" },
  { rank: 246, name: "Expedia",                                 tier: "tech",          sector: "travel_tech" },
  { rank: 247, name: "xDesign",                                 tier: "tech",          sector: "digital_agency" },
  { rank: 250, name: "SAP",                                     tier: "tech",          sector: "enterprise_tech" },
  { rank: 274, name: "Sage",                                    tier: "tech",          sector: "enterprise_tech" },
  { rank: 286, name: "Iris Software",                           tier: "tech",          sector: "enterprise_tech" },
  { rank: 289, name: "CGI",                                     tier: "tech",          sector: "technology_consulting" },
  { rank: 298, name: "Kainos",                                  tier: "tech",          sector: "digital_transformation" },

  // ── Banking & Finance ─────────────────────────────────────────────────────
  { rank: 9,   name: "J.P. Morgan",                             tier: "banking",       sector: "investment_banking" },
  { rank: 19,  name: "Goldman Sachs",                           tier: "banking",       sector: "investment_banking" },
  { rank: 24,  name: "Barclays",                                tier: "banking",       sector: "retail_banking" },
  { rank: 25,  name: "HSBC",                                    tier: "banking",       sector: "retail_banking" },
  { rank: 29,  name: "Lloyds Banking Group",                    tier: "banking",       sector: "retail_banking" },
  { rank: 31,  name: "BlackRock",                               tier: "banking",       sector: "asset_management" },
  { rank: 36,  name: "Morgan Stanley",                          tier: "banking",       sector: "investment_banking" },
  { rank: 38,  name: "Bank of England",                         tier: "public_sector", sector: "central_banking" },
  { rank: 44,  name: "Bloomberg",                               tier: "banking",       sector: "financial_data" },
  { rank: 58,  name: "Visa",                                    tier: "banking",       sector: "payments" },
  { rank: 60,  name: "Lloyd's",                                 tier: "insurance",     sector: "insurance_market" },
  { rank: 65,  name: "American Express",                        tier: "banking",       sector: "payments" },
  { rank: 68,  name: "Mastercard",                              tier: "banking",       sector: "payments" },
  { rank: 69,  name: "Bank of America",                         tier: "banking",       sector: "investment_banking" },
  { rank: 71,  name: "London Stock Exchange Group",             tier: "banking",       sector: "financial_infrastructure" },
  { rank: 72,  name: "Santander",                               tier: "banking",       sector: "retail_banking" },
  { rank: 81,  name: "Deutsche Bank",                           tier: "banking",       sector: "investment_banking" },
  { rank: 83,  name: "NatWest Group",                           tier: "banking",       sector: "retail_banking" },
  { rank: 91,  name: "Rothschild & Co",                         tier: "banking",       sector: "investment_banking" },
  { rank: 97,  name: "Financial Conduct Authority (FCA)",       tier: "public_sector", sector: "financial_regulation" },
  { rank: 100, name: "Capital One",                             tier: "banking",       sector: "retail_banking" },
  { rank: 102, name: "Nationwide Building Society",             tier: "banking",       sector: "retail_banking" },
  { rank: 129, name: "Citi",                                    tier: "banking",       sector: "investment_banking" },
  { rank: 132, name: "Standard Chartered",                      tier: "banking",       sector: "investment_banking" },
  { rank: 137, name: "UBS",                                     tier: "banking",       sector: "investment_banking" },
  { rank: 139, name: "Jane Street",                             tier: "banking",       sector: "trading" },
  { rank: 149, name: "National Audit Office (NAO)",             tier: "public_sector", sector: "audit" },
  { rank: 170, name: "Legal & General",                         tier: "insurance",     sector: "insurance" },
  { rank: 183, name: "Aviva",                                   tier: "insurance",     sector: "insurance" },
  { rank: 189, name: "BNP Paribas",                             tier: "banking",       sector: "investment_banking" },
  { rank: 208, name: "G-Research",                              tier: "banking",       sector: "quantitative_finance" },
  { rank: 216, name: "Fidelity International",                  tier: "banking",       sector: "asset_management" },
  { rank: 235, name: "Lazard",                                  tier: "banking",       sector: "investment_banking" },
  { rank: 241, name: "Aon",                                     tier: "insurance",     sector: "insurance_broking" },
  { rank: 245, name: "Société Générale",                        tier: "banking",       sector: "investment_banking" },
  { rank: 255, name: "Wells Fargo",                             tier: "banking",       sector: "investment_banking" },
  { rank: 257, name: "Schroders",                               tier: "banking",       sector: "asset_management" },
  { rank: 260, name: "Milbank",                                 tier: "law_firm",      sector: "finance_law" },
  { rank: 277, name: "bet365",                                  tier: "tech",          sector: "gambling" },
  { rank: 291, name: "M&G",                                     tier: "banking",       sector: "asset_management" },
  { rank: 297, name: "Nomura",                                  tier: "banking",       sector: "investment_banking" },

  // ── Management Consulting ─────────────────────────────────────────────────
  { rank: 39,  name: "McKinsey & Company",                      tier: "consulting",    sector: "strategy_consulting" },
  { rank: 76,  name: "Boston Consulting Group",                 tier: "consulting",    sector: "strategy_consulting" },
  { rank: 124, name: "Bain & Company",                          tier: "consulting",    sector: "strategy_consulting" },
  { rank: 161, name: "PA Consulting Group",                     tier: "consulting",    sector: "management_consulting" },
  { rank: 178, name: "FTI Consulting",                          tier: "consulting",    sector: "management_consulting" },
  { rank: 184, name: "Ipsos Mori",                              tier: "consulting",    sector: "research_consulting" },
  { rank: 190, name: "Newton",                                  tier: "consulting",    sector: "management_consulting" },
  { rank: 191, name: "OC&C Strategy Consultants",               tier: "consulting",    sector: "strategy_consulting" },
  { rank: 193, name: "Grant Thornton",                          tier: "consulting",    sector: "professional_services" },
  { rank: 212, name: "BDO",                                     tier: "consulting",    sector: "professional_services" },
  { rank: 231, name: "RSM",                                     tier: "consulting",    sector: "professional_services" },
  { rank: 253, name: "LEK Consulting",                          tier: "consulting",    sector: "strategy_consulting" },
  { rank: 254, name: "Oliver Wyman",                            tier: "consulting",    sector: "strategy_consulting" },
  { rank: 284, name: "Phaidon International",                   tier: "consulting",    sector: "executive_search" },
  { rank: 295, name: "Azets",                                   tier: "consulting",    sector: "professional_services" },

  // ── Professional Services / Accountancy ──────────────────────────────────
  { rank: 16,  name: "Deloitte",                                tier: "consulting",    sector: "big_four" },
  { rank: 17,  name: "PwC",                                     tier: "consulting",    sector: "big_four" },
  { rank: 26,  name: "KPMG",                                    tier: "consulting",    sector: "big_four" },
  { rank: 33,  name: "EY",                                      tier: "consulting",    sector: "big_four" },

  // ── Law Firms ─────────────────────────────────────────────────────────────
  { rank: 50,  name: "Clifford Chance",                         tier: "law_firm",      sector: "magic_circle" },
  { rank: 74,  name: "Slaughter & May",                         tier: "law_firm",      sector: "magic_circle" },
  { rank: 105, name: "Linklaters",                              tier: "law_firm",      sector: "magic_circle" },
  { rank: 109, name: "A&O Shearman",                            tier: "law_firm",      sector: "magic_circle" },
  { rank: 122, name: "White & Case LLP",                        tier: "law_firm",      sector: "us_law_uk" },
  { rank: 123, name: "Irwin Mitchell",                          tier: "law_firm",      sector: "national_firm" },
  { rank: 135, name: "Bird & Bird",                             tier: "law_firm",      sector: "international_firm" },
  { rank: 143, name: "DLA Piper",                               tier: "law_firm",      sector: "international_firm" },
  { rank: 144, name: "Clyde & Co LLP",                          tier: "law_firm",      sector: "international_firm" },
  { rank: 155, name: "Simmons & Simmons",                       tier: "law_firm",      sector: "international_firm" },
  { rank: 158, name: "Baker McKenzie",                          tier: "law_firm",      sector: "international_firm" },
  { rank: 162, name: "Slater & Gordon",                         tier: "law_firm",      sector: "national_firm" },
  { rank: 164, name: "Kennedys",                                tier: "law_firm",      sector: "international_firm" },
  { rank: 167, name: "Pinsent Masons LLP",                      tier: "law_firm",      sector: "national_firm" },
  { rank: 171, name: "Freshfields Bruckhaus Deringer LLP",      tier: "law_firm",      sector: "magic_circle" },
  { rank: 174, name: "Hogan Lovells",                           tier: "law_firm",      sector: "international_firm" },
  { rank: 182, name: "Herbert Smith Freehills LLP",             tier: "law_firm",      sector: "international_firm" },
  { rank: 192, name: "Osborne Clarke LLP",                      tier: "law_firm",      sector: "international_firm" },
  { rank: 194, name: "Addleshaw Goddard",                       tier: "law_firm",      sector: "national_firm" },
  { rank: 197, name: "Latham & Watkins LLP",                    tier: "law_firm",      sector: "us_law_uk" },
  { rank: 198, name: "Kirkland & Ellis International LLP",      tier: "law_firm",      sector: "us_law_uk" },
  { rank: 210, name: "Shoosmiths",                              tier: "law_firm",      sector: "national_firm" },
  { rank: 211, name: "CMS",                                     tier: "law_firm",      sector: "international_firm" },
  { rank: 218, name: "Dentons",                                 tier: "law_firm",      sector: "international_firm" },
  { rank: 219, name: "Weightmans",                              tier: "law_firm",      sector: "national_firm" },
  { rank: 222, name: "Mishcon de Reya",                         tier: "law_firm",      sector: "london_firm" },
  { rank: 224, name: "Ashurst LLP",                             tier: "law_firm",      sector: "international_firm" },
  { rank: 226, name: "Reed Smith",                              tier: "law_firm",      sector: "us_law_uk" },
  { rank: 230, name: "Macfarlanes LLP",                         tier: "law_firm",      sector: "london_firm" },
  { rank: 232, name: "Browne Jacobson LLP",                     tier: "law_firm",      sector: "national_firm" },
  { rank: 233, name: "Blake Morgan",                            tier: "law_firm",      sector: "national_firm" },
  { rank: 236, name: "Ashfords",                                tier: "law_firm",      sector: "national_firm" },
  { rank: 237, name: "Goodwin",                                 tier: "law_firm",      sector: "us_law_uk" },
  { rank: 248, name: "Womble Bond Dickinson",                   tier: "law_firm",      sector: "national_firm" },
  { rank: 249, name: "Farrer & Co",                             tier: "law_firm",      sector: "london_firm" },
  { rank: 251, name: "Travers Smith LLP",                       tier: "law_firm",      sector: "london_firm" },
  { rank: 264, name: "Norton Rose Fulbright",                   tier: "law_firm",      sector: "international_firm" },
  { rank: 266, name: "Paul, Weiss",                             tier: "law_firm",      sector: "us_law_uk" },
  { rank: 267, name: "Knights",                                 tier: "law_firm",      sector: "national_firm" },
  { rank: 269, name: "Charles Russell Speechlys",               tier: "law_firm",      sector: "london_firm" },
  { rank: 272, name: "Forsters LLP",                            tier: "law_firm",      sector: "london_firm" },
  { rank: 273, name: "Morrison & Foerster LLP",                 tier: "law_firm",      sector: "us_law_uk" },
  { rank: 275, name: "Brodies LLP",                             tier: "law_firm",      sector: "scottish_firm" },
  { rank: 276, name: "DWF",                                     tier: "law_firm",      sector: "national_firm" },
  { rank: 278, name: "Burges Salmon",                           tier: "law_firm",      sector: "national_firm" },
  { rank: 279, name: "Paul Hastings",                           tier: "law_firm",      sector: "us_law_uk" },
  { rank: 280, name: "Digby Brown",                             tier: "law_firm",      sector: "scottish_firm" },
  { rank: 285, name: "Morgan, Lewis & Bockius UK LLP",          tier: "law_firm",      sector: "us_law_uk" },
  { rank: 287, name: "RPC",                                     tier: "law_firm",      sector: "london_firm" },
  { rank: 288, name: "Eversheds Sutherland",                    tier: "law_firm",      sector: "international_firm" },
  { rank: 290, name: "Fieldfisher",                             tier: "law_firm",      sector: "international_firm" },
  { rank: 292, name: "Stewarts",                                tier: "law_firm",      sector: "london_firm" },
  { rank: 293, name: "Cooley LLP",                              tier: "law_firm",      sector: "us_law_uk" },
  { rank: 296, name: "Skadden, Arps, Slate, Meagher & Flom LLP", tier: "law_firm",    sector: "us_law_uk" },

  // ── Public Sector & Government ────────────────────────────────────────────
  { rank: 2,   name: "NHS Graduate Management Training Scheme (GMTS)", tier: "public_sector", sector: "healthcare_management" },
  { rank: 4,   name: "MI6 - Secret Intelligence Service",       tier: "public_sector", sector: "intelligence" },
  { rank: 13,  name: "MI5 - The Security Service",              tier: "public_sector", sector: "intelligence" },
  { rank: 18,  name: "Get Into Teaching",                       tier: "public_sector", sector: "education" },
  { rank: 20,  name: "The Civil Service Fast Stream",           tier: "public_sector", sector: "civil_service" },
  { rank: 22,  name: "British Council",                         tier: "public_sector", sector: "international_development" },
  { rank: 30,  name: "Teach First",                             tier: "public_sector", sector: "education" },
  { rank: 32,  name: "STFC (Science & Technology Facilities Council)", tier: "public_sector", sector: "research" },
  { rank: 34,  name: "Local Government - National Graduate Development Programme (NGDP)", tier: "public_sector", sector: "local_government" },
  { rank: 37,  name: "HM Revenue & Customs",                    tier: "public_sector", sector: "civil_service" },
  { rank: 46,  name: "Ministry of Defence",                     tier: "public_sector", sector: "defence" },
  { rank: 49,  name: "The Army",                                tier: "public_sector", sector: "military" },
  { rank: 53,  name: "GCHQ",                                    tier: "public_sector", sector: "intelligence" },
  { rank: 54,  name: "The Royal Air Force",                     tier: "public_sector", sector: "military" },
  { rank: 62,  name: "Met Office",                              tier: "public_sector", sector: "science" },
  { rank: 64,  name: "The Royal Navy",                          tier: "public_sector", sector: "military" },
  { rank: 96,  name: "National Grid",                           tier: "public_sector", sector: "utilities" },
  { rank: 101, name: "Transport for London",                    tier: "public_sector", sector: "transport" },
  { rank: 107, name: "Network Rail",                            tier: "public_sector", sector: "transport" },
  { rank: 112, name: "CERN",                                    tier: "public_sector", sector: "science" },
  { rank: 113, name: "Police Now",                              tier: "public_sector", sector: "policing" },
  { rank: 117, name: "National Nuclear Laboratory (NNL)",       tier: "public_sector", sector: "nuclear" },
  { rank: 118, name: "AWE: Nuclear Security Technologies",      tier: "public_sector", sector: "nuclear" },
  { rank: 134, name: "Frontline",                               tier: "public_sector", sector: "social_work" },
  { rank: 147, name: "Wellcome",                                tier: "public_sector", sector: "research_funding" },
  { rank: 166, name: "Think Ahead",                             tier: "public_sector", sector: "social_work" },
  { rank: 176, name: "nucleargraduates",                        tier: "public_sector", sector: "nuclear" },
  { rank: 204, name: "Unlocked Graduates",                      tier: "public_sector", sector: "criminal_justice" },
  { rank: 220, name: "Sellafield",                              tier: "public_sector", sector: "nuclear" },
  { rank: 271, name: "DSTL",                                    tier: "public_sector", sector: "defence_research" },
  { rank: 299, name: "United Utilities",                        tier: "public_sector", sector: "utilities" },

  // ── Pharma & Life Sciences ────────────────────────────────────────────────
  { rank: 7,   name: "Cancer Research UK",                      tier: "pharma",        sector: "research_charity" },
  { rank: 12,  name: "Pfizer",                                  tier: "pharma",        sector: "big_pharma" },
  { rank: 14,  name: "AstraZeneca",                             tier: "pharma",        sector: "big_pharma" },
  { rank: 23,  name: "GSK",                                     tier: "pharma",        sector: "big_pharma" },
  { rank: 55,  name: "Johnson & Johnson",                       tier: "pharma",        sector: "big_pharma" },
  { rank: 56,  name: "Thermo Fisher Scientific",                tier: "pharma",        sector: "life_sciences" },
  { rank: 93,  name: "Bupa",                                    tier: "pharma",        sector: "healthcare" },
  { rank: 114, name: "Roche",                                   tier: "pharma",        sector: "big_pharma" },
  { rank: 141, name: "Bayer",                                   tier: "pharma",        sector: "big_pharma" },
  { rank: 151, name: "MSD UK",                                  tier: "pharma",        sector: "big_pharma" },
  { rank: 168, name: "Illumina",                                tier: "pharma",        sector: "genomics" },

  // ── Engineering & Aerospace ───────────────────────────────────────────────
  { rank: 8,   name: "Rolls-Royce",                             tier: "engineering",   sector: "aerospace" },
  { rank: 35,  name: "McLaren",                                 tier: "engineering",   sector: "motorsport" },
  { rank: 45,  name: "Siemens",                                 tier: "engineering",   sector: "industrial_engineering" },
  { rank: 48,  name: "BAE Systems",                             tier: "defence",       sector: "defence_manufacturing" },
  { rank: 57,  name: "Airbus",                                  tier: "engineering",   sector: "aerospace" },
  { rank: 59,  name: "Mercedes AMG High Performance Powertrains", tier: "engineering", sector: "motorsport" },
  { rank: 77,  name: "Arup",                                    tier: "engineering",   sector: "civil_engineering" },
  { rank: 80,  name: "BMW Group",                               tier: "engineering",   sector: "automotive" },
  { rank: 89,  name: "Lockheed Martin",                         tier: "defence",       sector: "defence_manufacturing" },
  { rank: 90,  name: "Boeing",                                  tier: "engineering",   sector: "aerospace" },
  { rank: 92,  name: "JLR",                                     tier: "engineering",   sector: "automotive" },
  { rank: 94,  name: "Toyota",                                  tier: "engineering",   sector: "automotive" },
  { rank: 106, name: "GE (General Electric)",                   tier: "engineering",   sector: "industrial_engineering" },
  { rank: 111, name: "Aston Martin Lagonda",                    tier: "engineering",   sector: "automotive" },
  { rank: 115, name: "Mott MacDonald",                          tier: "engineering",   sector: "civil_engineering" },
  { rank: 119, name: "AECOM",                                   tier: "engineering",   sector: "civil_engineering" },
  { rank: 125, name: "Bentley Motors",                          tier: "engineering",   sector: "automotive" },
  { rank: 127, name: "Volkswagen Group",                        tier: "engineering",   sector: "automotive" },
  { rank: 131, name: "AtkinsRéalis",                            tier: "engineering",   sector: "civil_engineering" },
  { rank: 140, name: "Ford",                                    tier: "engineering",   sector: "automotive" },
  { rank: 142, name: "Nissan",                                  tier: "engineering",   sector: "automotive" },
  { rank: 148, name: "WSP",                                     tier: "engineering",   sector: "civil_engineering" },
  { rank: 156, name: "Jacobs",                                  tier: "engineering",   sector: "civil_engineering" },
  { rank: 160, name: "Bosch",                                   tier: "engineering",   sector: "industrial_engineering" },
  { rank: 163, name: "Thales",                                  tier: "engineering",   sector: "defence_tech" },
  { rank: 177, name: "Balfour Beatty",                          tier: "engineering",   sector: "construction" },
  { rank: 181, name: "Leonardo",                                tier: "defence",       sector: "defence_manufacturing" },
  { rank: 185, name: "Arcadis",                                 tier: "engineering",   sector: "civil_engineering" },
  { rank: 186, name: "Honda",                                   tier: "engineering",   sector: "automotive" },
  { rank: 187, name: "Caterpillar",                             tier: "engineering",   sector: "industrial_engineering" },
  { rank: 200, name: "MBDA",                                    tier: "defence",       sector: "defence_manufacturing" },
  { rank: 201, name: "Babcock",                                 tier: "defence",       sector: "defence_services" },
  { rank: 203, name: "Schlumberger",                            tier: "engineering",   sector: "oil_gas_services" },
  { rank: 205, name: "BAM Construct UK",                        tier: "engineering",   sector: "construction" },
  { rank: 206, name: "Tata Steel",                              tier: "engineering",   sector: "steel" },
  { rank: 228, name: "Northrop Grumman",                        tier: "defence",       sector: "defence_manufacturing" },
  { rank: 238, name: "JCB",                                     tier: "engineering",   sector: "industrial_engineering" },
  { rank: 239, name: "Kier Group",                              tier: "engineering",   sector: "construction" },
  { rank: 240, name: "Turner & Townsend",                       tier: "engineering",   sector: "project_management" },
  { rank: 252, name: "Buro Happold",                            tier: "engineering",   sector: "civil_engineering" },
  { rank: 258, name: "Mace",                                    tier: "engineering",   sector: "construction" },
  { rank: 261, name: "XPO Logistics",                           tier: "engineering",   sector: "logistics" },
  { rank: 265, name: "Wood",                                    tier: "engineering",   sector: "oil_gas_services" },
  { rank: 270, name: "Cummins",                                 tier: "engineering",   sector: "industrial_engineering" },
  { rank: 300, name: "Frazer-Nash Consultancy",                 tier: "engineering",   sector: "defence_tech" },

  // ── Energy & Utilities ────────────────────────────────────────────────────
  { rank: 84,  name: "Shell",                                   tier: "energy",        sector: "oil_gas" },
  { rank: 128, name: "BP",                                      tier: "energy",        sector: "oil_gas" },
  { rank: 146, name: "ExxonMobil",                              tier: "energy",        sector: "oil_gas" },
  { rank: 152, name: "ScottishPower",                           tier: "energy",        sector: "renewable_energy" },
  { rank: 153, name: "EDF",                                     tier: "energy",        sector: "nuclear_energy" },
  { rank: 159, name: "SSE (Scottish and Southern Energy)",      tier: "energy",        sector: "renewable_energy" },
  { rank: 175, name: "Thames Water",                            tier: "public_sector", sector: "utilities" },
  { rank: 202, name: "Yorkshire Water",                         tier: "public_sector", sector: "utilities" },
  { rank: 215, name: "Ovo Energy",                              tier: "energy",        sector: "renewable_energy" },
  { rank: 217, name: "INEOS",                                   tier: "energy",        sector: "chemicals" },
  { rank: 225, name: "Welsh Water (Dwr Cymru)",                 tier: "public_sector", sector: "utilities" },
  { rank: 234, name: "Severn Trent",                            tier: "public_sector", sector: "utilities" },
  { rank: 262, name: "Anglian Water",                           tier: "public_sector", sector: "utilities" },
  { rank: 283, name: "Centrica (British Gas)",                  tier: "energy",        sector: "energy_retail" },

  // ── FMCG & Retail ─────────────────────────────────────────────────────────
  { rank: 15,  name: "British Airways",                         tier: "fmcg",          sector: "aviation" },
  { rank: 28,  name: "ASOS",                                    tier: "retail",        sector: "fashion_retail" },
  { rank: 41,  name: "Marks & Spencer",                         tier: "retail",        sector: "general_retail" },
  { rank: 51,  name: "Boots",                                   tier: "retail",        sector: "pharmacy_retail" },
  { rank: 52,  name: "Hilton",                                  tier: "fmcg",          sector: "hospitality" },
  { rank: 63,  name: "L'Oréal",                                 tier: "fmcg",          sector: "beauty" },
  { rank: 67,  name: "Marriott International",                  tier: "fmcg",          sector: "hospitality" },
  { rank: 70,  name: "Tesco",                                   tier: "retail",        sector: "grocery_retail" },
  { rank: 75,  name: "Merlin Entertainments",                   tier: "fmcg",          sector: "leisure" },
  { rank: 79,  name: "Unilever",                                tier: "fmcg",          sector: "consumer_goods" },
  { rank: 82,  name: "Virgin Media O2",                         tier: "tech",          sector: "telecoms" },
  { rank: 86,  name: "Coca-Cola",                               tier: "fmcg",          sector: "beverages" },
  { rank: 87,  name: "Nestlé",                                  tier: "fmcg",          sector: "food_beverage" },
  { rank: 98,  name: "TJX Europe (TK Maxx)",                    tier: "retail",        sector: "discount_retail" },
  { rank: 103, name: "Procter & Gamble (P&G)",                  tier: "fmcg",          sector: "consumer_goods" },
  { rank: 104, name: "Next",                                    tier: "retail",        sector: "fashion_retail" },
  { rank: 110, name: "Lidl",                                    tier: "retail",        sector: "grocery_retail" },
  { rank: 120, name: "Explore Learning",                        tier: "fmcg",          sector: "education" },
  { rank: 121, name: "Aldi",                                    tier: "retail",        sector: "grocery_retail" },
  { rank: 126, name: "Asda",                                    tier: "retail",        sector: "grocery_retail" },
  { rank: 130, name: "McDonald's",                              tier: "retail",        sector: "food_service" },
  { rank: 133, name: "PepsiCo",                                 tier: "fmcg",          sector: "food_beverage" },
  { rank: 136, name: "Royal Mail Group",                        tier: "public_sector", sector: "postal_services" },
  { rank: 138, name: "Sainsbury's",                             tier: "retail",        sector: "grocery_retail" },
  { rank: 150, name: "Mondelez International (Cadbury, Oreo etc)", tier: "fmcg",       sector: "food_beverage" },
  { rank: 154, name: "Co-op",                                   tier: "retail",        sector: "grocery_retail" },
  { rank: 169, name: "Morrisons",                               tier: "retail",        sector: "grocery_retail" },
  { rank: 179, name: "DHL",                                     tier: "engineering",   sector: "logistics" },
  { rank: 188, name: "Associated British Foods (ABF)",          tier: "fmcg",          sector: "food_beverage" },
  { rank: 199, name: "Mars",                                    tier: "fmcg",          sector: "food_beverage" },
  { rank: 221, name: "Diageo",                                  tier: "fmcg",          sector: "beverages" },
  { rank: 243, name: "Enterprise Mobility",                     tier: "fmcg",          sector: "car_rental" },
  { rank: 256, name: "Reckitt",                                 tier: "fmcg",          sector: "consumer_goods" },
  { rank: 259, name: "Savills",                                 tier: "consulting",    sector: "real_estate" },
  { rank: 263, name: "CBRE",                                    tier: "consulting",    sector: "real_estate" },
  { rank: 268, name: "Barratt Developments",                    tier: "engineering",   sector: "housebuilding" },
  { rank: 294, name: "Three",                                   tier: "tech",          sector: "telecoms" },
];

async function seed() {
  const conn = await mysql.createConnection(DB_URL);
  console.log(`Seeding ${UK300.length} UK 300 graduate companies...`);

  let inserted = 0;
  let skipped = 0;

  for (const co of UK300) {
    const domain = null; // can be enriched later
    const careersUrl = null;

    // Check if already exists (by name, case-insensitive)
    const [existing] = await conn.execute(
      "SELECT id FROM company_universe WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [co.name]
    );

    if (existing.length > 0) {
      // Update is_graduate flag on existing record
      await conn.execute(
        "UPDATE company_universe SET is_graduate = true WHERE LOWER(name) = LOWER(?)",
        [co.name]
      );
      skipped++;
    } else {
      await conn.execute(
        `INSERT INTO company_universe (name, domain, tier, sector, ats_provider, ats_slug, careers_url, qualities, is_graduate, active)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, true, true)`,
        [co.name, domain, co.tier, co.sector, careersUrl]
      );
      inserted++;
    }
  }

  await conn.end();
  console.log(`Done. Inserted: ${inserted}, Updated existing: ${skipped}`);
}

seed().catch(err => { console.error(err); process.exit(1); });
