export function applyDiscountCents(priceCents, rateBps) {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new RangeError('priceCents must be an integer >= 0');
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) {
    throw new RangeError('rateBps must be an integer between 0 and 10_000');
  }

  const discountedScaled = priceCents * (10_000 - rateBps);
  return Math.floor(discountedScaled / 10_000);
}
