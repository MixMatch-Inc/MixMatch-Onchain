"""Fails when apps/api-py/.env.example and the Settings fields drift apart (#1446)."""

import re
from pathlib import Path

from src.core.config import Settings

TEMPLATE = Path(__file__).resolve().parents[1] / ".env.example"
KEY_LINE = re.compile(r"^\s*#?\s*([A-Z][A-Z0-9_]*)=")


def settings_keys() -> set[str]:
    # The env var name is the alias when one is declared, otherwise the field name.
    return {field.alias or name for name, field in Settings.model_fields.items()}


def template_keys() -> set[str]:
    keys = set()
    for line in TEMPLATE.read_text().splitlines():
        match = KEY_LINE.match(line)
        if match:
            keys.add(match.group(1))
    return keys


def test_every_setting_is_documented_in_the_template():
    missing = sorted(settings_keys() - template_keys())
    assert not missing, f"add these settings to apps/api-py/.env.example: {missing}"


def test_template_has_no_unknown_settings():
    unknown = sorted(template_keys() - settings_keys())
    assert not unknown, f"apps/api-py/.env.example lists settings config.py does not read: {unknown}"
