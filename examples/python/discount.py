def apply_discount_cents(price_cents: int, rate_bps: int) -> int:
    if price_cents < 0:
        raise ValueError("price_cents must be >= 0")
    if rate_bps < 0 or rate_bps > 10_000:
        raise ValueError("rate_bps must be between 0 and 10_000")

    discounted_scaled = price_cents * (10_000 - rate_bps)
    return (discounted_scaled + 5_000) // 10_000

