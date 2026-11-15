"""/meta, /experiments, /coverage, /queries, /gaps, /compare, CORS y errores (docs/API.md)."""
import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend import data

FLEX_DOI, BASS_DOI = "10.60555/mbq8-0451", "10.60555/4qc4-de67"


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


def test_meta(client):
    r = client.get("/api/meta")
    assert r.status_code == 200
    m = r.json()
    assert {p["program"]: p["n"] for p in m["programs"]} == {"FLEX": 274, "BASS-II": 129}
    assert m["sources"] == sorted([FLEX_DOI, BASS_DOI])
    assert m["limitations"] and all(isinstance(x, str) for x in m["limitations"])
    assert m["min_n"] == 5


def test_root_alias(client):
    assert client.get("/meta").json() == client.get("/api/meta").json()


def test_experiments_filters_and_paging(client):
    r = client.get("/api/experiments", params={"program": "FLEX", "fuel": "methanol", "limit": 5})
    body = r.json()
    assert r.status_code == 200 and len(body["items"]) == 5 and body["total"] > 5
    assert all(isinstance(x["qc_flags"], list) for x in body["items"])
    assert body["sources"] == [FLEX_DOI]
    total = client.get("/api/experiments", params={"limit": 500}).json()["total"]
    assert total == 403


def test_experiments_not_stated(client):
    body = client.get("/api/experiments", params={"outcome": "not_stated", "limit": 500}).json()
    assert body["total"] > 0 and all(x["program"] == "BASS-II" and x["outcome"] is None for x in body["items"])


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 501}, {"o2_min": 2}, {"program": "SOFIE"},
                                    {"outcome": "safe"}, {"suppressant": "water"}, {"o2_min": 0.3, "o2_max": 0.2}])
def test_experiments_400(client, params):
    r = client.get("/api/experiments", params=params)
    assert r.status_code == 400, r.text
    assert "detail" in r.json()


def test_coverage(client):
    body = client.get("/api/coverage", params={"fuel": "methanol", "suppressant": "none"}).json()
    assert body["cells"] and all(c["fuel"] == "methanol" and c["suppressant"] == "none" for c in body["cells"])
    for c in body["cells"]:
        assert c["pct_note"] == "descriptive, not a probability"
        assert (c["warning"] is not None) == (c["n"] < 5)
    assert client.get("/api/coverage", params={"suppressant": "x"}).status_code == 400


def test_queries(client):
    r = client.get("/api/queries/q1_extinction_rate_by_o2_pressure", params={"fuel": "methanol", "pressure_min": 0.9,
                                                                             "pressure_max": 1.1})
    body = r.json()
    assert r.status_code == 200 and body["rows"] and body["params"]["pressure_range"] == [0.9, 1.1]
    assert all(0.9 <= x["pressure_atm"] <= 1.1 for x in body["rows"])
    q6 = client.get("/api/queries/q6_bass2_outcomes_by_o2_band").json()
    assert q6["sources"] == [BASS_DOI] and all("pct_extinction" not in x for x in q6["rows"])
    assert client.get("/api/queries/q9_nope").status_code == 404
    assert client.get("/api/queries/q6_bass2_outcomes_by_o2_band", params={"fuel": "heptane"}).status_code == 400


def test_gaps_and_compare(client):
    gaps = client.get("/api/gaps").json()
    assert any(g["id"] == "partial_gravity" for g in gaps["gaps"])
    cmp_ = client.get("/api/compare", params={"a": "FLEX:193F001", "b": "20CAL08"}).json()
    assert len(cmp_["a"]) == 2  # duplicado documentado
    assert "o2_fraction" in cmp_["same"] + cmp_["different"]
    assert client.get("/api/compare", params={"a": "NOPE1", "b": "20CAL08"}).status_code == 404


def test_cors(client):
    ok = client.options("/api/meta", headers={"Origin": "http://127.0.0.1:5173", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"
    bad = client.get("/api/meta", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in bad.headers


def test_cors_env(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://team.github.io, *")
    from backend.config import get_settings
    s = get_settings()
    assert "https://team.github.io" in s.cors_origins and "*" not in s.cors_origins


def test_missing_db_is_503(tmp_path):
    from backend.config import Settings
    c = TestClient(create_app(Settings(db_path=str(tmp_path / "nope.sqlite"))))
    r = c.get("/api/meta")
    assert r.status_code == 503 and "build_experiments" in r.json()["detail"]


def test_query_test_ids_match_counts():
    con = data.connect()
    for name, fn in data.q.ALL_QUERIES.items():
        rows = fn(con)
        ids = data.q.query_test_ids(con, name)
        n_ids = sum(len(v) for v in ids.values())
        # 193F001 is duplicated: the row count can exceed the unique-ID count by 1
        assert sum(r["n"] for r in rows) - n_ids in (0, 1), name
