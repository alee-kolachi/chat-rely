from app.domains.public_widget.launcher import (
    resolve_widget_animation_enabled,
    resolve_widget_border_radius,
)


def test_resolve_widget_border_radius_defaults() -> None:
    assert resolve_widget_border_radius({}) == 28
    assert resolve_widget_border_radius({"widget_border_radius": None}) == 28


def test_resolve_widget_border_radius_clamps() -> None:
    assert resolve_widget_border_radius({"widget_border_radius": 20}) == 20
    assert resolve_widget_border_radius({"widget_border_radius": 99}) == 28
    assert resolve_widget_border_radius({"widget_border_radius": -4}) == 0
    assert resolve_widget_border_radius({"widget_border_radius": "16"}) == 16
    assert resolve_widget_border_radius({"widget_border_radius": "bad"}) == 28


def test_resolve_widget_animation_enabled_defaults() -> None:
    assert resolve_widget_animation_enabled({}) is True
    assert resolve_widget_animation_enabled({"widget_animation_enabled": None}) is True


def test_resolve_widget_animation_enabled_parses() -> None:
    assert resolve_widget_animation_enabled({"widget_animation_enabled": False}) is False
    assert resolve_widget_animation_enabled({"widget_animation_enabled": True}) is True
    assert resolve_widget_animation_enabled({"widget_animation_enabled": 0}) is False
    assert resolve_widget_animation_enabled({"widget_animation_enabled": "off"}) is False
    assert resolve_widget_animation_enabled({"widget_animation_enabled": "yes"}) is True
