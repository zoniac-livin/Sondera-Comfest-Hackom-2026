export interface KnownBrand {
  name: string;
  /** Domains used only to suppress false lookalike flags; this is not a trust list. */
  officialDomains: string[];
}

// A deliberately small India and global brand set. These entries are clues for
// explainable local rules, not a directory of every legitimate brand domain.
export const KNOWN_BRANDS: KnownBrand[] = [
  { name: "google", officialDomains: ["google.com", "google.co.in"] },
  { name: "microsoft", officialDomains: ["microsoft.com"] },
  { name: "apple", officialDomains: ["apple.com"] },
  { name: "amazon", officialDomains: ["amazon.com", "amazon.in"] },
  { name: "paypal", officialDomains: ["paypal.com"] },
  { name: "netflix", officialDomains: ["netflix.com"] },
  { name: "facebook", officialDomains: ["facebook.com"] },
  { name: "instagram", officialDomains: ["instagram.com"] },
  { name: "whatsapp", officialDomains: ["whatsapp.com"] },
  { name: "sbi", officialDomains: ["sbi.co.in"] },
  { name: "hdfc", officialDomains: ["hdfcbank.com"] },
  { name: "icici", officialDomains: ["icicibank.com"] },
  { name: "axis", officialDomains: ["axisbank.com"] },
  { name: "paytm", officialDomains: ["paytm.com"] },
  { name: "phonepe", officialDomains: ["phonepe.com"] },
  { name: "gpay", officialDomains: ["google.com", "google.co.in"] },
  { name: "flipkart", officialDomains: ["flipkart.com"] },
  { name: "irctc", officialDomains: ["irctc.co.in"] },
  { name: "uidai", officialDomains: ["uidai.gov.in"] },
  { name: "aadhaar", officialDomains: ["uidai.gov.in"] },
  { name: "incometax", officialDomains: ["incometax.gov.in"] },
  { name: "epfo", officialDomains: ["epfindia.gov.in"] },
];
