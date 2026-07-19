#!/usr/bin/env python3
"""Evaluate an effect-size-first release decision from summary statistics.

This dependency-free reference implementation uses a Welch two-group design.
It is intentionally a decision-contract example, not a general statistics
library.  Production analyses must choose a design that matches pairing,
clustering, distribution, and repeated-measure structure.
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import re
import sys
from datetime import date
from pathlib import Path
from statistics import NormalDist
from typing import Any


DATASET_PATH = Path(__file__).with_name("cases.json")
REPOSITORY_ROOT = DATASET_PATH.parents[2]
SCHEMA = "statistical-decision-contract/v1"
DECISIONS = (
    "insufficient_sample",
    "no_practical_improvement",
    "inconclusive",
    "practical_improvement",
)


class ContractViolation(ValueError):
    """Raised when the statistical decision contract is incomplete or unsafe."""


def _non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _finite_number(value: Any) -> bool:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def _parse_date(value: Any, field: str) -> date:
    if not _non_empty_string(value) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ContractViolation(f"{field} must use YYYY-MM-DD")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ContractViolation(f"{field} is not a valid calendar date") from error


def _beta_continued_fraction(a: float, b: float, x: float) -> float:
    """Evaluate the continued fraction used by the regularized beta function."""

    maximum_iterations = 200
    epsilon = 3.0e-14
    floor = 1.0e-300
    qab = a + b
    qap = a + 1.0
    qam = a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < floor:
        d = floor
    d = 1.0 / d
    result = d

    for iteration in range(1, maximum_iterations + 1):
        doubled = 2 * iteration
        coefficient = iteration * (b - iteration) * x / (
            (qam + doubled) * (a + doubled)
        )
        d = 1.0 + coefficient * d
        if abs(d) < floor:
            d = floor
        c = 1.0 + coefficient / c
        if abs(c) < floor:
            c = floor
        d = 1.0 / d
        result *= d * c

        coefficient = -(a + iteration) * (qab + iteration) * x / (
            (a + doubled) * (qap + doubled)
        )
        d = 1.0 + coefficient * d
        if abs(d) < floor:
            d = floor
        c = 1.0 + coefficient / c
        if abs(c) < floor:
            c = floor
        d = 1.0 / d
        delta = d * c
        result *= delta
        if abs(delta - 1.0) < epsilon:
            return result

    raise ContractViolation("Student-t calculation did not converge")


def _regularized_beta(x: float, a: float, b: float) -> float:
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    log_term = (
        math.lgamma(a + b)
        - math.lgamma(a)
        - math.lgamma(b)
        + a * math.log(x)
        + b * math.log1p(-x)
    )
    factor = math.exp(log_term)
    if x < (a + 1.0) / (a + b + 2.0):
        return factor * _beta_continued_fraction(a, b, x) / a
    return 1.0 - factor * _beta_continued_fraction(b, a, 1.0 - x) / b


def _student_t_two_sided_p(t_statistic: float, degrees_of_freedom: float) -> float:
    if degrees_of_freedom <= 0 or not math.isfinite(degrees_of_freedom):
        raise ContractViolation("degrees of freedom must be positive and finite")
    if math.isnan(t_statistic):
        raise ContractViolation("t statistic must not be NaN")
    if math.isinf(t_statistic):
        return 0.0
    x = degrees_of_freedom / (degrees_of_freedom + t_statistic * t_statistic)
    return min(1.0, max(0.0, _regularized_beta(x, degrees_of_freedom / 2.0, 0.5)))


def _student_t_critical(confidence_level: float, degrees_of_freedom: float) -> float:
    target_alpha = 1.0 - confidence_level
    lower = 0.0
    upper = max(2.0, NormalDist().inv_cdf((1.0 + confidence_level) / 2.0))
    while _student_t_two_sided_p(upper, degrees_of_freedom) > target_alpha:
        upper *= 2.0
        if upper > 1.0e6:
            raise ContractViolation("could not bracket Student-t critical value")
    for _ in range(80):
        midpoint = (lower + upper) / 2.0
        if _student_t_two_sided_p(midpoint, degrees_of_freedom) > target_alpha:
            lower = midpoint
        else:
            upper = midpoint
    return (lower + upper) / 2.0


def validate_contract(document: dict[str, Any]) -> None:
    """Validate policy provenance, analysis design, and all synthetic cases."""

    errors: list[str] = []
    if not isinstance(document, dict):
        raise ContractViolation("document must be a JSON object")
    if document.get("schema") != SCHEMA:
        errors.append("unsupported schema")

    policy = document.get("policy")
    if not isinstance(policy, dict):
        errors.append("missing policy")
        policy = {}

    for field in ("version", "analysis_unit", "metric", "design", "direction"):
        if not _non_empty_string(policy.get(field)):
            errors.append(f"missing policy {field}")
    if policy.get("design") != "independent_two_group_welch":
        errors.append("design must be independent_two_group_welch")
    if policy.get("direction") not in ("lower_is_better", "higher_is_better"):
        errors.append("direction must be lower_is_better or higher_is_better")

    minimum_sample = policy.get("minimum_sample_per_group")
    if not isinstance(minimum_sample, int) or isinstance(minimum_sample, bool) or minimum_sample < 2:
        errors.append("minimum_sample_per_group must be an integer >= 2")
    threshold = policy.get("practical_threshold")
    if not _finite_number(threshold) or threshold <= 0:
        errors.append("practical_threshold must be positive and finite")
    confidence_level = policy.get("confidence_level")
    if not _finite_number(confidence_level) or not 0.5 < confidence_level < 1.0:
        errors.append("confidence_level must be between 0.5 and 1")
    alpha = policy.get("alpha")
    if not _finite_number(alpha) or not 0.0 < alpha < 0.5:
        errors.append("alpha must be between 0 and 0.5")
    elif _finite_number(confidence_level) and not math.isclose(
        alpha, 1.0 - confidence_level, rel_tol=0.0, abs_tol=1.0e-12
    ):
        errors.append("alpha must equal 1 - confidence_level")
    if policy.get("p_value_role") != "auxiliary_only":
        errors.append("p_value_role must be auxiliary_only")

    try:
        policy_locked_at = _parse_date(policy.get("policy_locked_at"), "policy_locked_at")
    except ContractViolation as error:
        errors.append(str(error))
        policy_locked_at = None

    multiple_testing = policy.get("multiple_testing")
    if not isinstance(multiple_testing, dict):
        errors.append("missing multiple_testing policy")
    else:
        if multiple_testing.get("method") != "holm":
            errors.append("reference fixture only supports holm multiple testing")
        if not _non_empty_string(multiple_testing.get("family_id")):
            errors.append("multiple_testing family_id is required")
        planned = multiple_testing.get("planned_comparisons")
        if not isinstance(planned, int) or isinstance(planned, bool) or planned < 1:
            errors.append("multiple_testing planned_comparisons must be >= 1")
        planned_metrics = multiple_testing.get("planned_metrics")
        if (
            not isinstance(planned_metrics, list)
            or not planned_metrics
            or not all(_non_empty_string(metric) for metric in planned_metrics)
            or len(set(planned_metrics)) != len(planned_metrics)
        ):
            errors.append("multiple_testing planned_metrics must be unique non-empty names")
        elif isinstance(planned, int) and planned != len(planned_metrics):
            errors.append("planned_comparisons must match planned_metrics")
        elif policy.get("metric") not in planned_metrics:
            errors.append("current metric must belong to the planned metric family")

    repeated_looks = policy.get("repeated_looks")
    if not isinstance(repeated_looks, dict):
        errors.append("missing repeated_looks policy")
    else:
        maximum_looks = repeated_looks.get("maximum_looks")
        method = repeated_looks.get("method")
        if not isinstance(maximum_looks, int) or isinstance(maximum_looks, bool) or maximum_looks < 1:
            errors.append("repeated_looks maximum_looks must be >= 1")
        if method != "fixed_horizon":
            errors.append("reference fixture only supports fixed_horizon")
        if isinstance(maximum_looks, int) and maximum_looks != 1:
            errors.append("fixed_horizon requires exactly one planned look")

    cases = document.get("cases")
    if not isinstance(cases, list) or not cases:
        errors.append("cases must be a non-empty list")
        cases = []
    seen_ids: set[str] = set()
    for index, case in enumerate(cases):
        prefix = f"case[{index}]"
        if not isinstance(case, dict):
            errors.append(f"{prefix} must be an object")
            continue
        case_id = case.get("id")
        if not _non_empty_string(case_id):
            errors.append(f"{prefix} missing id")
        elif case_id in seen_ids:
            errors.append(f"duplicate case id {case_id!r}")
        else:
            seen_ids.add(case_id)
        if case.get("expected_decision") not in DECISIONS:
            errors.append(f"{prefix} has invalid expected_decision")
        if "practical_threshold" in case:
            errors.append(f"{prefix} must not override the locked practical_threshold")
        try:
            observed_at = _parse_date(case.get("observed_at"), f"{prefix} observed_at")
            if policy_locked_at is not None and observed_at <= policy_locked_at:
                errors.append(f"{prefix} was observed on or before the policy lock date")
        except ContractViolation as error:
            errors.append(str(error))
        for group_name in ("baseline", "candidate"):
            group = case.get(group_name)
            if not isinstance(group, dict):
                errors.append(f"{prefix} missing {group_name} summary")
                continue
            n = group.get("n")
            if not isinstance(n, int) or isinstance(n, bool) or n < 2:
                errors.append(f"{prefix} {group_name}.n must be an integer >= 2")
            for field in ("mean", "sd"):
                if not _finite_number(group.get(field)):
                    errors.append(f"{prefix} {group_name}.{field} must be finite")
            if _finite_number(group.get("sd")) and group["sd"] <= 0:
                errors.append(f"{prefix} {group_name}.sd must be positive")

    multiple_example = document.get("multiple_testing_example")
    if not isinstance(multiple_example, list) or not multiple_example:
        errors.append("multiple_testing_example must be a non-empty list")
    else:
        example_metrics: list[str] = []
        for index, item in enumerate(multiple_example):
            prefix = f"multiple_testing_example[{index}]"
            if not isinstance(item, dict):
                errors.append(f"{prefix} must be an object")
                continue
            metric = item.get("metric")
            if not _non_empty_string(metric):
                errors.append(f"{prefix} missing metric")
            else:
                example_metrics.append(metric)
            for field in ("raw_p_value", "expected_adjusted_p_value"):
                value = item.get(field)
                if not _finite_number(value) or not 0.0 <= value <= 1.0:
                    errors.append(f"{prefix} {field} must be between 0 and 1")
        if isinstance(multiple_testing, dict):
            planned_metrics = multiple_testing.get("planned_metrics")
            if isinstance(planned_metrics, list) and set(example_metrics) != set(planned_metrics):
                errors.append("multiple_testing_example must cover the planned metric family")

    if errors:
        raise ContractViolation("; ".join(errors))


def _signed_improvement(
    baseline_mean: float, candidate_mean: float, direction: str
) -> float:
    if direction == "lower_is_better":
        return baseline_mean - candidate_mean
    return candidate_mean - baseline_mean


def evaluate_case(case: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    baseline = case["baseline"]
    candidate = case["candidate"]
    n_baseline = baseline["n"]
    n_candidate = candidate["n"]
    effect = _signed_improvement(
        baseline["mean"], candidate["mean"], policy["direction"]
    )

    pooled_degrees = n_baseline + n_candidate - 2
    pooled_variance = (
        (n_baseline - 1) * baseline["sd"] ** 2
        + (n_candidate - 1) * candidate["sd"] ** 2
    ) / pooled_degrees
    pooled_sd = math.sqrt(pooled_variance)
    cohen_d = effect / pooled_sd
    correction = 1.0 - 3.0 / (4.0 * pooled_degrees - 1.0)
    hedges_g = correction * cohen_d

    baseline_variance_term = baseline["sd"] ** 2 / n_baseline
    candidate_variance_term = candidate["sd"] ** 2 / n_candidate
    standard_error = math.sqrt(baseline_variance_term + candidate_variance_term)
    welch_df = (baseline_variance_term + candidate_variance_term) ** 2 / (
        baseline_variance_term**2 / (n_baseline - 1)
        + candidate_variance_term**2 / (n_candidate - 1)
    )
    t_statistic = effect / standard_error
    p_value = _student_t_two_sided_p(t_statistic, welch_df)
    critical = _student_t_critical(policy["confidence_level"], welch_df)
    margin = critical * standard_error
    lower = effect - margin
    upper = effect + margin

    minimum_sample = policy["minimum_sample_per_group"]
    threshold = policy["practical_threshold"]
    if min(n_baseline, n_candidate) < minimum_sample:
        decision = "insufficient_sample"
    elif effect < threshold:
        decision = "no_practical_improvement"
    elif lower < threshold:
        decision = "inconclusive"
    else:
        decision = "practical_improvement"

    return {
        "id": case["id"],
        "analysis_unit": policy["analysis_unit"],
        "n_baseline": n_baseline,
        "n_candidate": n_candidate,
        "minimum_sample_per_group": minimum_sample,
        "raw_effect": effect,
        "hedges_g": hedges_g,
        "confidence_interval": {
            "level": policy["confidence_level"],
            "lower": lower,
            "upper": upper,
        },
        "practical_threshold": threshold,
        "p_value_auxiliary": p_value,
        "p_value_role": policy["p_value_role"],
        "multiple_testing_method": policy["multiple_testing"]["method"],
        "repeated_looks_method": policy["repeated_looks"]["method"],
        "decision": decision,
    }


def _holm_adjust(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    indexed = sorted(
        enumerate(items), key=lambda entry: entry[1]["raw_p_value"]
    )
    adjusted_by_index: dict[int, float] = {}
    running_maximum = 0.0
    total = len(items)
    for rank, (original_index, item) in enumerate(indexed):
        adjusted = min(1.0, item["raw_p_value"] * (total - rank))
        running_maximum = max(running_maximum, adjusted)
        adjusted_by_index[original_index] = running_maximum
    return [
        {
            "metric": item["metric"],
            "raw_p_value": item["raw_p_value"],
            "adjusted_p_value": adjusted_by_index[index],
        }
        for index, item in enumerate(items)
    ]


def run_contract(document: dict[str, Any]) -> dict[str, Any]:
    validate_contract(document)
    policy = document["policy"]
    results = [evaluate_case(case, policy) for case in document["cases"]]
    mismatches = [
        result["id"]
        for case, result in zip(document["cases"], results, strict=True)
        if case["expected_decision"] != result["decision"]
    ]
    if mismatches:
        raise ContractViolation(
            "decision mismatch for case(s): " + ", ".join(mismatches)
        )
    multiple_results = _holm_adjust(document["multiple_testing_example"])
    for expected, observed in zip(
        document["multiple_testing_example"], multiple_results, strict=True
    ):
        if not math.isclose(
            expected["expected_adjusted_p_value"],
            observed["adjusted_p_value"],
            rel_tol=0.0,
            abs_tol=1.0e-12,
        ):
            raise ContractViolation(
                f"Holm adjusted p-value mismatch for {observed['metric']}"
            )
    return {
        "status": "pass",
        "policy_version": policy["version"],
        "checked_cases": len(results),
        "results": results,
        "multiple_testing_example": {
            "family_id": policy["multiple_testing"]["family_id"],
            "method": policy["multiple_testing"]["method"],
            "results": multiple_results,
        },
    }


def _published_payload(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ContractViolation(f"{path.relative_to(REPOSITORY_ROOT)} missing front matter")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise ContractViolation(f"{path.relative_to(REPOSITORY_ROOT)} has invalid front matter")
    return text[end + len("\n---\n") :].lstrip("\n")


def validate_repository_contract() -> None:
    """Keep the canonical manuscript, published mirror, and p-value gate aligned."""

    chapter_source = REPOSITORY_ROOT / "src/chapters/chapter-07-quality-metrics-evaluation.md"
    chapter_docs = REPOSITORY_ROOT / "docs/chapters/chapter-07-quality-metrics-evaluation.md"
    checklist_source = REPOSITORY_ROOT / "src/appendices/appendix-b-checklists.md"
    checklist_docs = REPOSITORY_ROOT / "docs/appendices/appendix-b-checklists.md"
    for source, published in (
        (chapter_source, chapter_docs),
        (checklist_source, checklist_docs),
    ):
        if not source.is_file() or not published.is_file():
            raise ContractViolation("statistical decision manuscript path is missing")
        if source.read_text(encoding="utf-8") != _published_payload(published):
            raise ContractViolation(
                f"source/docs drift: {source.relative_to(REPOSITORY_ROOT)}"
            )

    chapter = chapter_source.read_text(encoding="utf-8")
    required_chapter_markers = (
        "Effect-size-first decision contract",
        "analysis_unit=policy.analysis_unit",
        "minimum_sample_per_group=policy.minimum_sample_per_group",
        "raw_effect=effect.raw_effect",
        "standardized_effect=effect.hedges_g",
        "confidence_interval=effect.confidence_interval",
        "practical_threshold=policy.practical_threshold",
        "p_value_auxiliary=effect.p_value",
        "multiple_testing_method=policy.multiple_testing_method",
        "repeated_looks_method=policy.repeated_looks_method",
        "decision=decision",
    )
    missing = [marker for marker in required_chapter_markers if marker not in chapter]
    if missing:
        raise ContractViolation("Chapter 7 missing marker(s): " + ", ".join(missing))
    forbidden = re.compile(r"p_value\s*(?:<=|>=|<|>)")
    if forbidden.search(chapter):
        raise ContractViolation("Chapter 7 contains a p-value-only decision gate")
    checklist = checklist_source.read_text(encoding="utf-8")
    if "### 6. Statistical decision gate" not in checklist:
        raise ContractViolation("Appendix B missing statistical decision gate")


def _expect_contract_failure(
    name: str, document: dict[str, Any], fragment: str
) -> dict[str, str]:
    try:
        run_contract(document)
    except ContractViolation as error:
        message = str(error)
        if fragment not in message:
            raise AssertionError(
                f"{name}: failure did not mention {fragment!r}: {message}"
            ) from error
        return {"name": name, "status": "pass", "observed": "fail_closed"}
    raise AssertionError(f"{name}: invalid contract was accepted")


def run_self_tests(document: dict[str, Any]) -> dict[str, Any]:
    validate_repository_contract()
    report = run_contract(document)
    results = {result["id"]: result for result in report["results"]}
    cases: list[dict[str, str]] = []

    small = results["small-but-statistically-significant"]
    if not small["p_value_auxiliary"] < document["policy"]["alpha"]:
        raise AssertionError("small synthetic case was not statistically significant")
    if small["decision"] == "practical_improvement":
        raise AssertionError("p-value alone passed the practical decision gate")
    cases.append(
        {
            "name": "p_value_alone_cannot_pass",
            "status": "pass",
            "observed": "fail_closed",
        }
    )

    for case_id, expected in (
        ("no-effect", "no_practical_improvement"),
        ("small-but-statistically-significant", "no_practical_improvement"),
        ("threshold-crossing-interval", "inconclusive"),
        ("large-effect", "practical_improvement"),
    ):
        if results[case_id]["decision"] != expected:
            raise AssertionError(f"{case_id}: expected {expected}")
        cases.append(
            {
                "name": f"synthetic_{case_id}",
                "status": "pass",
                "observed": expected,
            }
        )

    threshold_case = next(
        case for case in document["cases"] if case["id"] == "threshold-crossing-interval"
    )
    if threshold_case["baseline"]["sd"] == threshold_case["candidate"]["sd"]:
        raise AssertionError("Welch fixture must exercise unequal variances")
    cases.append(
        {
            "name": "welch_heteroscedastic_fixture",
            "status": "pass",
            "observed": "unequal_variances",
        }
    )

    p_gate = copy.deepcopy(document)
    p_gate["policy"]["p_value_role"] = "release_gate"
    cases.append(
        _expect_contract_failure(
            "p_value_role_is_auxiliary_only", p_gate, "p_value_role must be auxiliary_only"
        )
    )

    missing_unit = copy.deepcopy(document)
    missing_unit["policy"].pop("analysis_unit")
    cases.append(
        _expect_contract_failure(
            "analysis_unit_is_required", missing_unit, "missing policy analysis_unit"
        )
    )

    missing_threshold = copy.deepcopy(document)
    missing_threshold["policy"].pop("practical_threshold")
    cases.append(
        _expect_contract_failure(
            "practical_threshold_is_required",
            missing_threshold,
            "practical_threshold must be positive and finite",
        )
    )

    no_multiple_testing = copy.deepcopy(document)
    no_multiple_testing["policy"]["multiple_testing"]["method"] = "none"
    cases.append(
        _expect_contract_failure(
            "multiple_testing_plan_is_required",
            no_multiple_testing,
            "reference fixture only supports holm",
        )
    )

    unimplemented_multiple_method = copy.deepcopy(document)
    unimplemented_multiple_method["policy"]["multiple_testing"]["method"] = "bonferroni"
    cases.append(
        _expect_contract_failure(
            "unimplemented_multiple_method_fails_closed",
            unimplemented_multiple_method,
            "reference fixture only supports holm",
        )
    )

    invalid_repeated_looks = copy.deepcopy(document)
    invalid_repeated_looks["policy"]["repeated_looks"]["maximum_looks"] = 2
    cases.append(
        _expect_contract_failure(
            "repeated_looks_need_a_valid_plan",
            invalid_repeated_looks,
            "fixed_horizon requires exactly one planned look",
        )
    )

    unsupported_sequential_method = copy.deepcopy(document)
    unsupported_sequential_method["policy"]["repeated_looks"] = {
        "method": "alpha_spending",
        "maximum_looks": 3,
    }
    cases.append(
        _expect_contract_failure(
            "unimplemented_sequential_method_fails_closed",
            unsupported_sequential_method,
            "reference fixture only supports fixed_horizon",
        )
    )

    post_hoc_threshold = copy.deepcopy(document)
    post_hoc_threshold["policy"]["policy_locked_at"] = "2026-07-31"
    cases.append(
        _expect_contract_failure(
            "threshold_must_be_locked_before_observation",
            post_hoc_threshold,
            "observed on or before the policy lock date",
        )
    )

    try:
        _student_t_two_sided_p(float("nan"), 30.0)
    except ContractViolation as error:
        if "must not be NaN" not in str(error):
            raise AssertionError("NaN t-statistic failed without an actionable reason") from error
    else:
        raise AssertionError("NaN t-statistic was accepted")
    if _student_t_two_sided_p(float("inf"), 30.0) != 0.0:
        raise AssertionError("infinite t-statistic did not use the p=0 limiting value")
    cases.append(
        {
            "name": "non_finite_t_statistic_contract",
            "status": "pass",
            "observed": "nan_rejected_infinity_limited",
        }
    )

    insufficient = copy.deepcopy(document)
    insufficient_case = insufficient["cases"][2]
    insufficient_case["baseline"]["n"] = 10
    insufficient_case["candidate"]["n"] = 10
    insufficient_case["expected_decision"] = "insufficient_sample"
    insufficient_result = run_contract(insufficient)["results"][2]
    if insufficient_result["decision"] != "insufficient_sample":
        raise AssertionError("minimum sample gate did not fail closed")
    cases.append(
        {
            "name": "minimum_sample_gate",
            "status": "pass",
            "observed": "insufficient_sample",
        }
    )

    required_output = {
        "analysis_unit",
        "n_baseline",
        "n_candidate",
        "raw_effect",
        "hedges_g",
        "confidence_interval",
        "practical_threshold",
        "p_value_auxiliary",
        "decision",
    }
    if any(required_output - set(result) for result in report["results"]):
        raise AssertionError("required statistical decision output is missing")
    cases.append(
        {
            "name": "required_output_contract",
            "status": "pass",
            "observed": "complete",
        }
    )

    holm_results = report["multiple_testing_example"]["results"]
    if [round(item["adjusted_p_value"], 12) for item in holm_results] != [
        0.03,
        0.06,
        0.06,
    ]:
        raise AssertionError("Holm worked example did not match the locked result")
    cases.append(
        {
            "name": "holm_multiple_testing_worked_example",
            "status": "pass",
            "observed": "0.03/0.06/0.06",
        }
    )

    nist_critical_values = {
        1: 12.706,
        2: 4.303,
        5: 2.571,
        10: 2.228,
        30: 2.042,
        60: 2.000,
        100: 1.984,
    }
    for degrees_of_freedom, expected in nist_critical_values.items():
        observed = _student_t_critical(0.95, float(degrees_of_freedom))
        if round(observed, 3) != expected:
            raise AssertionError(
                f"Student-t critical value mismatch for df={degrees_of_freedom}: {observed}"
            )
    cases.append(
        {
            "name": "student_t_critical_values_match_nist_table",
            "status": "pass",
            "observed": "7/7",
        }
    )

    cases.append(
        {
            "name": "repository_contract",
            "status": "pass",
            "observed": "source_docs_synced_and_no_p_only_gate",
        }
    )

    return {"status": "pass", "self_tests": cases, "in_memory_only": True}


def _load_document(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as handle:
            value = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise ContractViolation(f"cannot load contract: {error}") from error
    if not isinstance(value, dict):
        raise ContractViolation("document must be a JSON object")
    return value


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--dataset", type=Path, default=DATASET_PATH)
    args = parser.parse_args(argv)
    try:
        document = _load_document(args.dataset)
        validate_repository_contract()
        report = run_self_tests(document) if args.self_test else run_contract(document)
    except (AssertionError, ContractViolation) as error:
        print(
            json.dumps(
                {"status": "fail", "error": str(error)},
                ensure_ascii=False,
                allow_nan=False,
            ),
            file=sys.stderr,
        )
        return 1
    print(json.dumps(report, ensure_ascii=False, sort_keys=True, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
