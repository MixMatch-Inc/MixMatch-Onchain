from unittest.mock import MagicMock

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def database(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:secret@db/mixmatch")
    connect = MagicMock()
    monkeypatch.setattr("app.main.psycopg.connect", connect)
    connection = connect.return_value.__enter__.return_value
    cursor = connection.cursor.return_value.__enter__.return_value
    cursor.fetchone.return_value = (1,)
    return connect, connection, cursor


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_liveness_does_not_access_database(client, database, monkeypatch):
    connect, _, _ = database
    monkeypatch.delenv("DATABASE_URL")
    connect.side_effect = psycopg.OperationalError("database down")
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    connect.assert_not_called()


def test_readiness_queries_database_and_releases_resources(client, database):
    connect, connection, cursor = database
    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    connect.assert_called_once_with(
        "postgresql://user:secret@db/mixmatch",
        connect_timeout=3,
        options="-c statement_timeout=3000",
        autocommit=True,
    )
    cursor.execute.assert_called_once_with("SELECT 1")
    cursor.fetchone.assert_called_once_with()
    connection.cursor.return_value.__exit__.assert_called_once()
    connect.return_value.__exit__.assert_called_once()


@pytest.mark.parametrize("value", [None, "", "   "])
def test_readiness_requires_database_url(client, database, monkeypatch, value):
    connect, _, _ = database
    if value is None:
        monkeypatch.delenv("DATABASE_URL")
    else:
        monkeypatch.setenv("DATABASE_URL", value)
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
    connect.assert_not_called()


def test_readiness_connection_failure_and_recovery(client, database):
    connect, _, _ = database
    connect.side_effect = psycopg.OperationalError("secret database details")
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
    assert client.get("/healthz").status_code == 200
    connect.side_effect = None
    assert client.get("/readyz").status_code == 200


@pytest.mark.parametrize(
    "error", [psycopg.OperationalError, psycopg.errors.QueryCanceled]
)
def test_readiness_query_failure_closes_connection(client, database, error):
    connect, connection, cursor = database
    cursor.execute.side_effect = error("secret database details")
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
    connection.cursor.return_value.__exit__.assert_called_once()
    connect.return_value.__exit__.assert_called_once()


def test_readiness_rejects_unexpected_query_result(client, database):
    _, _, cursor = database
    cursor.fetchone.return_value = None
    response = client.get("/readyz")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
