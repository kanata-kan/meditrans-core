export class PricingRuleNotFoundError extends Error {
  constructor(catalogCode: string, context?: string) {
    super(
      `Aucune règle tarifaire trouvée pour le catalogue "${catalogCode}"${context ? ` (${context})` : ""}.`,
    );
    this.name = "PricingRuleNotFoundError";
  }
}

export class PricingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingValidationError";
  }
}

export class PricingCatalogNotFoundError extends Error {
  constructor(catalogCode: string) {
    super(`Catalogue de service introuvable : "${catalogCode}".`);
    this.name = "PricingCatalogNotFoundError";
  }
}
