import pytest

from discount import apply_discount_cents


def test_apply_discount_cents_returns_same_when_rate_is_zero():
    assert apply_discount_cents(1000, 0) == 1000


def test_apply_discount_cents_returns_zero_when_rate_is_full():
    assert apply_discount_cents(1000, 10_000) == 0


@pytest.mark.parametrize(
    ("price_cents", "rate_bps", "expected"),
    [
        (999, 3_333, 666),  # 9.99 * 0.6667 -> 6.660333 -> 6.66
        (1, 5_000, 1),  # 0.01 * 0.5 -> 0.005 -> 0.01 (round half up)
        (1, 4_999, 1),  # 0.01 * 0.5001 -> 0.005001 -> 0.01
        (1, 5_001, 0),  # 0.01 * 0.4999 -> 0.004999 -> 0.00
    ],
)
def test_apply_discount_cents_rounds_half_up(price_cents: int, rate_bps: int, expected: int):
    assert apply_discount_cents(price_cents, rate_bps) == expected


@pytest.mark.parametrize(
    ("price_cents", "rate_bps"),
    [
        (-1, 0),
        (0, -1),
        (0, 10_001),
    ],
)
def test_apply_discount_cents_rejects_invalid_input(price_cents: int, rate_bps: int):
    with pytest.raises(ValueError):
        apply_discount_cents(price_cents, rate_bps)

