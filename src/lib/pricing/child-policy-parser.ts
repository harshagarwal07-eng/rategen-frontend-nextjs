/**
 * Child Policy Parser
 *
 * Parses free-text child policy strings to extract pricing rules
 * Examples:
 * - "Upto 2 children (0-11yrs) can stay for free if sharing bed"
 * - "Upto 2 teens (12-17yrs) can stay by paying 77USD per person"
 * - "Children 3-6 years: 50% of adult rate"
 */

export interface ChildPolicyRule {
  ageMin: number;
  ageMax: number;
  type: "free" | "percentage" | "fixed";
  value: number; // 0 for free, 0-1 for percentage, fixed amount for fixed
}

/**
 * Parse child policy text and extract pricing rules
 */
export function parseChildPolicy(text: string): ChildPolicyRule[] {
  if (!text || text.trim() === "") {
    return [];
  }

  const rules: ChildPolicyRule[] = [];

  // Pattern 1: Free stays
  // Matches: "0-11yrs) can stay for free", "(0-11) free", "0-11 years free"
  const freePattern = /(\d+)\s*-\s*(\d+)\s*(?:yrs?|years?)?\)?.*?free/gi;
  let match: RegExpExecArray | null;

  while ((match = freePattern.exec(text)) !== null) {
    rules.push({
      ageMin: parseInt(match[1], 10),
      ageMax: parseInt(match[2], 10),
      type: "free",
      value: 0,
    });
  }

  // Pattern 2: Fixed USD amount
  // Matches: "12-17yrs...77USD", "(12-17)...paying 77 USD"
  const fixedPattern = /(\d+)\s*-\s*(\d+)\s*(?:yrs?|years?)?\)?.*?(\d+)\s*(?:USD|usd|\$)/gi;
  freePattern.lastIndex = 0; // Reset regex

  while ((match = fixedPattern.exec(text)) !== null) {
    // Skip if this range was already matched as free
    const ageMin = parseInt(match[1], 10);
    const ageMax = parseInt(match[2], 10);
    const isDuplicate = rules.some(
      (r) => r.ageMin === ageMin && r.ageMax === ageMax
    );

    if (!isDuplicate) {
      rules.push({
        ageMin,
        ageMax,
        type: "fixed",
        value: parseInt(match[3], 10),
      });
    }
  }

  // Pattern 3: Percentage of rate
  // Matches: "3-6...50%", "(3-6 years) 50% of rate"
  const percentPattern = /(\d+)\s*-\s*(\d+)\s*(?:yrs?|years?)?\)?.*?(\d+)\s*%/gi;

  while ((match = percentPattern.exec(text)) !== null) {
    const ageMin = parseInt(match[1], 10);
    const ageMax = parseInt(match[2], 10);
    const isDuplicate = rules.some(
      (r) => r.ageMin === ageMin && r.ageMax === ageMax
    );

    if (!isDuplicate) {
      rules.push({
        ageMin,
        ageMax,
        type: "percentage",
        value: parseInt(match[3], 10) / 100,
      });
    }
  }

  return rules;
}

/**
 * Get the rate for a child based on policy rules
 * Falls back to full adult rate if no matching rule found
 */
export function getChildRate(
  policy: ChildPolicyRule[],
  childAge: number,
  baseRate: number
): number {
  // Find matching rule for this child's age
  const rule = policy.find(
    (r) => childAge >= r.ageMin && childAge <= r.ageMax
  );

  if (!rule) {
    // No rule found → charge full adult rate (as per decision #10)
    return baseRate;
  }

  switch (rule.type) {
    case "free":
      return 0;

    case "percentage":
      return baseRate * rule.value;

    case "fixed":
      return rule.value;

    default:
      return baseRate;
  }
}

/**
 * Format policy rules for display (useful for debugging/logging)
 */
export function formatPolicyRules(rules: ChildPolicyRule[]): string {
  if (rules.length === 0) {
    return "No child policy rules found (children charged full adult rate)";
  }

  return rules
    .map((rule) => {
      const ageRange = `${rule.ageMin}-${rule.ageMax} years`;
      switch (rule.type) {
        case "free":
          return `${ageRange}: Free`;
        case "percentage":
          return `${ageRange}: ${rule.value * 100}% of adult rate`;
        case "fixed":
          return `${ageRange}: $${rule.value} per child`;
        default:
          return `${ageRange}: Unknown rule type`;
      }
    })
    .join("; ");
}
