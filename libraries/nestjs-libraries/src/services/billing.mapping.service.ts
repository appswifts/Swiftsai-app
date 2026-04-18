import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

/**
 * Centralized mapping of SwiftsAI subscription tiers + periods to Polar Product IDs.
 * All product IDs are loaded from environment variables.
 * This replaces the scattered `process.env[...]` calls throughout the billing flow.
 */

type Tier = 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE';
type Period = 'MONTHLY' | 'YEARLY';

interface ProductMapping {
  tier: Tier;
  period: Period;
  envKey: string;
}

const PRODUCT_MAPPINGS: ProductMapping[] = [
  { tier: 'STANDARD', period: 'MONTHLY', envKey: 'POLAR_PRODUCT_STANDARD_MONTHLY_ID' },
  { tier: 'STANDARD', period: 'YEARLY',  envKey: 'POLAR_PRODUCT_STANDARD_YEARLY_ID' },
  { tier: 'TEAM',     period: 'MONTHLY', envKey: 'POLAR_PRODUCT_TEAM_MONTHLY_ID' },
  { tier: 'TEAM',     period: 'YEARLY',  envKey: 'POLAR_PRODUCT_TEAM_YEARLY_ID' },
  { tier: 'PRO',      period: 'MONTHLY', envKey: 'POLAR_PRODUCT_PRO_MONTHLY_ID' },
  { tier: 'PRO',      period: 'YEARLY',  envKey: 'POLAR_PRODUCT_PRO_YEARLY_ID' },
  { tier: 'ULTIMATE', period: 'MONTHLY', envKey: 'POLAR_PRODUCT_ULTIMATE_MONTHLY_ID' },
  { tier: 'ULTIMATE', period: 'YEARLY',  envKey: 'POLAR_PRODUCT_ULTIMATE_YEARLY_ID' },
];

// Reverse lookup: given a Polar product ID, find the tier + period
const REVERSE_MAP = new Map<string, { tier: Tier; period: Period }>();

@Injectable()
export class BillingMappingService {
  private readonly logger = new Logger(BillingMappingService.name);
  private readonly productMap = new Map<string, string>();

  constructor() {
    this.loadMappings();
  }

  private loadMappings() {
    for (const mapping of PRODUCT_MAPPINGS) {
      const productId = process.env[mapping.envKey];
      if (productId) {
        const key = `${mapping.tier}_${mapping.period}`;
        this.productMap.set(key, productId);
        REVERSE_MAP.set(productId, { tier: mapping.tier, period: mapping.period });
        this.logger.log(`Loaded Polar product: ${key} -> ${productId}`);
      }
    }
  }

  /**
   * Get the Polar product ID for a tier+period combo.
   * Throws 400 if not configured.
   */
  getProductId(tier: string, period: string): string {
    const key = `${tier.toUpperCase()}_${period.toUpperCase()}`;
    const productId = this.productMap.get(key);

    if (!productId) {
      this.logger.error(
        `No Polar product ID configured for ${key}. Set env var POLAR_PRODUCT_${key}_ID`
      );
      throw new HttpException(
        {
          message: `Subscription plan "${tier} ${period}" is not available. Please contact support.`,
          code: 'MISSING_PRODUCT_MAPPING',
          detail: `Set environment variable POLAR_PRODUCT_${key}_ID`,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    return productId;
  }

  /**
   * Reverse lookup: given a Polar product ID from a webhook, determine the tier + period.
   */
  getTierFromProductId(productId: string): { tier: Tier; period: Period } | null {
    return REVERSE_MAP.get(productId) || null;
  }

  /**
   * Check if all required product mappings are configured.
   * Useful for health checks.
   */
  getConfigurationStatus(): { configured: string[]; missing: string[] } {
    const configured: string[] = [];
    const missing: string[] = [];

    for (const mapping of PRODUCT_MAPPINGS) {
      const key = `${mapping.tier}_${mapping.period}`;
      if (this.productMap.has(key)) {
        configured.push(key);
      } else {
        missing.push(mapping.envKey);
      }
    }

    return { configured, missing };
  }
}
