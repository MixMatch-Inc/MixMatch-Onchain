"""Alert rules and the dashboard may only reference metrics the API exports (#1456)."""

import json
import re
from pathlib import Path

import yaml
from prometheus_client import REGISTRY

import src.core.prometheus  # noqa: F401  (registers the metrics)

MONITORING = Path(__file__).resolve().parents[3] / "infra" / "monitoring"
SUFFIXES = ("_bucket", "_sum", "_count", "_total", "_created")
OURS = re.compile(r"\b((?:http_|sse_|db_pool|reconciliation_)[a-z0-9_]*)")


def exported_names() -> set[str]:
    names = set()
    for family in REGISTRY.collect():
        names.add(family.name)
        for sample in family.samples:
            names.add(sample.name)
    return names


def referenced_metrics(expression: str) -> set[str]:
    found = set()
    for token in OURS.findall(expression):
        found.add(token)
    return found


def known(token: str, names: set[str]) -> bool:
    candidates = {token}
    for suffix in SUFFIXES:
        if token.endswith(suffix):
            candidates.add(token[: -len(suffix)])
    return bool(candidates & names) or any(name.startswith(token) for name in names)


def load_rules() -> list[dict]:
    document = yaml.safe_load((MONITORING / "alerts.rules.yml").read_text())
    return [rule for group in document["groups"] for rule in group["rules"]]


def test_every_rule_is_complete():
    rules = load_rules()
    assert len(rules) >= 10
    for rule in rules:
        assert rule["alert"].startswith("MixMatch")
        assert rule["expr"].strip()
        assert rule["labels"]["severity"] in {"critical", "warning"}
        assert rule["annotations"]["summary"]


def test_rule_names_are_unique():
    names = [rule["alert"] for rule in load_rules()]
    assert len(names) == len(set(names))


def test_rules_only_reference_exported_metrics():
    names = exported_names()
    unknown = {
        (rule["alert"], token)
        for rule in load_rules()
        for token in referenced_metrics(rule["expr"])
        if not known(token, names)
    }
    assert not unknown, f"rules reference metrics the API does not export: {sorted(unknown)}"


def test_dashboard_is_valid_and_only_uses_exported_metrics():
    dashboard = json.loads((MONITORING / "grafana" / "mixmatch-api-overview.json").read_text())
    assert dashboard["panels"]
    names = exported_names()
    for panel in dashboard["panels"]:
        assert panel["targets"], panel["title"]
        for target in panel["targets"]:
            for token in referenced_metrics(target["expr"]):
                assert known(token, names), f"{panel['title']}: unknown metric {token}"


def test_prometheus_config_loads_the_rules_file():
    config = yaml.safe_load((MONITORING / "prometheus.yml").read_text())
    assert "alerts.rules.yml" in config["rule_files"]
    assert (MONITORING / "alerts.rules.yml").exists()
