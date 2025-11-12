from pathlib import Path
import sys

# Ensure tests can import the FastAPI app in src/app.py
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # basic sanity: one known activity should exist
    assert "Chess Club" in data


def test_signup_and_remove_participant():
    activity = "Chess Club"
    email = "test.user@example.com"

    # Ensure clean state: remove if already present
    resp = client.get("/activities")
    participants = resp.json()[activity]["participants"]
    if email in participants:
        client.delete(f"/activities/{activity}/participants/{email}")

    # Sign up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify participant present
    resp = client.get("/activities")
    assert email in resp.json()[activity]["participants"]

    # Remove participant
    resp = client.delete(f"/activities/{activity}/participants/{email}")
    assert resp.status_code == 200

    # Verify removed
    resp = client.get("/activities")
    assert email not in resp.json()[activity]["participants"]


def test_remove_nonexistent_participant():
    activity = "Chess Club"
    email = "nonexistent@example.com"

    # Ensure not present
    resp = client.get("/activities")
    if email in resp.json()[activity]["participants"]:
        client.delete(f"/activities/{activity}/participants/{email}")

    # Attempt to delete non-existent participant -> should get 404
    resp = client.delete(f"/activities/{activity}/participants/{email}")
    assert resp.status_code == 404
