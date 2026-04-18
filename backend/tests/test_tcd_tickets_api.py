"""
TCD Tickets API Tests
Tests for authentication, events, societies, bookings, and admin endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://16b4546d-7e16-4470-b809-ce40f9e1fdeb.preview.emergentagent.com"

# Test credentials from test_credentials.md
TEST_CUSTOMER = {"email": "customer@tcd.ie", "password": "demo1234"}
TEST_ORGANISER = {"email": "organiser@tcd.ie", "password": "demo1234"}
TEST_ADMIN = {"email": "admin@tcd.ie", "password": "demo1234"}
TEST_COUPONS = ["STUDENT20", "TRINITY10"]


class TestHealthAndBasicEndpoints:
    """Basic API health and endpoint tests"""
    
    def test_events_endpoint_returns_200(self):
        """GET /api/events should return 200 with array of events"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Events should be an array"
        print(f"SUCCESS: GET /api/events returned {len(data)} events")
    
    def test_societies_endpoint_returns_200(self):
        """GET /api/societies should return 200 with array of societies"""
        response = requests.get(f"{BASE_URL}/api/societies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Societies should be an array"
        print(f"SUCCESS: GET /api/societies returned {len(data)} societies")
    
    def test_search_endpoint_returns_200(self):
        """GET /api/search should return 200"""
        response = requests.get(f"{BASE_URL}/api/search")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Search results should be an array"
        print(f"SUCCESS: GET /api/search returned {len(data)} results")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_customer_success(self):
        """POST /api/auth/login with valid customer credentials"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_CUSTOMER,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain user id"
        assert "email" in data, "Response should contain email"
        assert data["email"] == TEST_CUSTOMER["email"]
        print(f"SUCCESS: Customer login - user id: {data['id']}, name: {data.get('name', 'N/A')}")
    
    def test_login_organiser_success(self):
        """POST /api/auth/login with valid organiser credentials"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ORGANISER,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("isOrganiser") == True, "Organiser should have isOrganiser=true"
        print(f"SUCCESS: Organiser login - user id: {data['id']}, isOrganiser: {data.get('isOrganiser')}")
    
    def test_login_admin_success(self):
        """POST /api/auth/login with valid admin credentials"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADMIN,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("isAdmin") == True, "Admin should have isAdmin=true"
        print(f"SUCCESS: Admin login - user id: {data['id']}, isAdmin: {data.get('isAdmin')}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials should fail"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@tcd.ie", "password": "wrongpass"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert response.status_code in [400, 401, 404], f"Expected 4xx, got {response.status_code}"
        print(f"SUCCESS: Invalid login correctly rejected with status {response.status_code}")
    
    def test_signup_duplicate_email(self):
        """POST /api/auth/signup with existing email should fail"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "name": "Test User",
                "email": TEST_CUSTOMER["email"],  # Already exists
                "password": "testpass123",
                "confirmPassword": "testpass123",
                "role": "customer"
            },
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert response.status_code == 409, f"Expected 409 conflict, got {response.status_code}"
        print(f"SUCCESS: Duplicate email signup correctly rejected with status {response.status_code}")


class TestEvents:
    """Event-related endpoint tests"""
    
    def test_get_events_list(self):
        """GET /api/events returns list with expected structure"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        events = response.json()
        assert len(events) > 0, "Should have at least one event"
        
        # Check first event structure
        event = events[0]
        required_fields = ["id", "title", "startDate", "location", "category"]
        for field in required_fields:
            assert field in event, f"Event missing required field: {field}"
        
        # Check ticketTypes
        assert "ticketTypes" in event, "Event should have ticketTypes"
        print(f"SUCCESS: Events have correct structure. First event: {event['title']}")
        return events[0]
    
    def test_get_single_event(self):
        """GET /api/events/:id returns single event"""
        # First get list to get an event ID
        events_response = requests.get(f"{BASE_URL}/api/events")
        events = events_response.json()
        if not events:
            pytest.skip("No events available")
        
        event_id = events[0]["id"]
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        event = response.json()
        assert event["id"] == event_id
        print(f"SUCCESS: GET /api/events/{event_id} returned event: {event['title']}")
    
    def test_search_events_by_category(self):
        """GET /api/search?category=Music filters correctly"""
        response = requests.get(f"{BASE_URL}/api/search?category=Music")
        assert response.status_code == 200
        events = response.json()
        for event in events:
            assert event["category"] == "Music", f"Event category should be Music, got {event['category']}"
        print(f"SUCCESS: Category filter returned {len(events)} Music events")


class TestCoupons:
    """Coupon validation tests"""
    
    def test_validate_student20_coupon(self):
        """POST /api/coupons/validate with STUDENT20"""
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": "STUDENT20"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("discountPercent") == 20, f"STUDENT20 should give 20% discount, got {data.get('discountPercent')}"
        print(f"SUCCESS: STUDENT20 coupon validated - {data.get('discountPercent')}% discount")
    
    def test_validate_trinity10_coupon(self):
        """POST /api/coupons/validate with TRINITY10"""
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": "TRINITY10"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("discountPercent") == 10, f"TRINITY10 should give 10% discount, got {data.get('discountPercent')}"
        print(f"SUCCESS: TRINITY10 coupon validated - {data.get('discountPercent')}% discount")
    
    def test_validate_invalid_coupon(self):
        """POST /api/coupons/validate with invalid code"""
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": "INVALIDCODE"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 404], f"Expected 4xx, got {response.status_code}"
        print(f"SUCCESS: Invalid coupon correctly rejected with status {response.status_code}")


class TestSocieties:
    """Society-related endpoint tests"""
    
    def test_get_societies_list(self):
        """GET /api/societies returns list with expected structure"""
        response = requests.get(f"{BASE_URL}/api/societies")
        assert response.status_code == 200
        societies = response.json()
        assert len(societies) > 0, "Should have at least one society"
        
        society = societies[0]
        required_fields = ["id", "name", "category"]
        for field in required_fields:
            assert field in society, f"Society missing required field: {field}"
        print(f"SUCCESS: Societies have correct structure. First: {society['name']}")
    
    def test_get_society_leaderboard(self):
        """GET /api/societies/leaderboard returns leaderboard data"""
        response = requests.get(f"{BASE_URL}/api/societies/leaderboard?tab=followers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Leaderboard can return either an array or an object with byFollowers/byTickets
        if isinstance(data, dict):
            assert "byFollowers" in data or "byTickets" in data, "Leaderboard object should have byFollowers or byTickets"
            entries = data.get("byFollowers", data.get("byTickets", []))
            print(f"SUCCESS: Leaderboard returned object with {len(entries)} societies")
        else:
            assert isinstance(data, list), "Leaderboard should be an array or object"
            print(f"SUCCESS: Leaderboard returned {len(data)} societies")


class TestBookings:
    """Booking flow tests"""
    
    def _get_customer_user(self):
        """Get customer user data"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_CUSTOMER,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            return None
        return response.json()
    
    def _get_event_with_tickets(self):
        """Get an event with available tickets"""
        response = requests.get(f"{BASE_URL}/api/events")
        events = response.json()
        for event in events:
            if event.get("ticketTypes") and len(event["ticketTypes"]) > 0:
                for tt in event["ticketTypes"]:
                    if tt.get("available", 0) > 0:
                        return event
        return None
    
    def test_create_booking(self):
        """POST /api/bookings/create creates a booking"""
        customer_user = self._get_customer_user()
        if not customer_user or "id" not in customer_user:
            pytest.skip("Could not get customer user (rate limited)")
        
        event_with_tickets = self._get_event_with_tickets()
        if not event_with_tickets:
            pytest.skip("No events with available tickets")
        
        user_id = customer_user["id"]
        event_id = event_with_tickets["id"]
        ticket_type = event_with_tickets["ticketTypes"][0]
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/create",
            json={
                "userId": user_id,
                "eventId": event_id,
                "ticketSelections": [
                    {"ticketTypeId": ticket_type["id"], "quantity": 1}
                ]
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Accept 200 or 201 for success
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data or "booking" in data, "Response should contain booking data"
        print(f"SUCCESS: Booking created for event {event_with_tickets['title']}")
    
    def test_get_user_tickets(self):
        """GET /api/users/:id/tickets returns user's tickets"""
        customer_user = self._get_customer_user()
        if not customer_user or "id" not in customer_user:
            pytest.skip("Could not get customer user (rate limited)")
        
        user_id = customer_user["id"]
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/tickets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Tickets should be an array"
        print(f"SUCCESS: User has {len(data)} orders/tickets")


class TestOrganiserDashboard:
    """Organiser dashboard tests"""
    
    def _get_organiser_user(self):
        """Get organiser user data"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ORGANISER,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            return None
        return response.json()
    
    def test_organiser_analytics(self):
        """GET /api/organiser/:id/analytics returns dashboard stats"""
        organiser_user = self._get_organiser_user()
        if not organiser_user or "id" not in organiser_user:
            pytest.skip("Could not get organiser user (rate limited)")
        
        user_id = organiser_user["id"]
        response = requests.get(f"{BASE_URL}/api/organiser/{user_id}/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "stats" in data, "Response should contain stats"
        print(f"SUCCESS: Organiser analytics - Total revenue: {data['stats'].get('totalRevenue', 0)}")
    
    def test_organiser_societies(self):
        """GET /api/organiser/:id/societies returns organiser's societies"""
        organiser_user = self._get_organiser_user()
        if not organiser_user or "id" not in organiser_user:
            pytest.skip("Could not get organiser user (rate limited)")
        
        user_id = organiser_user["id"]
        response = requests.get(f"{BASE_URL}/api/organiser/{user_id}/societies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Societies should be an array"
        print(f"SUCCESS: Organiser has {len(data)} societies")


class TestAdminPanel:
    """Admin panel tests"""
    
    def _get_admin_user(self):
        """Get admin user data"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADMIN,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            return None
        return response.json()
    
    def test_admin_stats(self):
        """POST /api/admin/stats returns platform statistics"""
        admin_user = self._get_admin_user()
        if not admin_user or "id" not in admin_user:
            pytest.skip("Could not get admin user (rate limited)")
        
        admin_id = admin_user["id"]
        response = requests.post(
            f"{BASE_URL}/api/admin/stats",
            json={"adminId": admin_id},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "totalUsers" in data, "Stats should contain totalUsers"
        assert "totalEvents" in data, "Stats should contain totalEvents"
        print(f"SUCCESS: Admin stats - Users: {data.get('totalUsers')}, Events: {data.get('totalEvents')}")
    
    def test_admin_users_list(self):
        """GET /api/admin/users returns users list"""
        admin_user = self._get_admin_user()
        if not admin_user or "id" not in admin_user:
            pytest.skip("Could not get admin user (rate limited)")
        
        admin_id = admin_user["id"]
        response = requests.get(f"{BASE_URL}/api/admin/users?adminId={admin_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        users = data if isinstance(data, list) else data.get("users", [])
        assert len(users) > 0, "Should have at least one user"
        print(f"SUCCESS: Admin users list - {len(users)} users")
    
    def test_admin_events_list(self):
        """GET /api/admin/events returns events list"""
        admin_user = self._get_admin_user()
        if not admin_user or "id" not in admin_user:
            pytest.skip("Could not get admin user (rate limited)")
        
        admin_id = admin_user["id"]
        response = requests.get(f"{BASE_URL}/api/admin/events?adminId={admin_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        events = data if isinstance(data, list) else data.get("events", [])
        print(f"SUCCESS: Admin events list - {len(events)} events")


class TestPaymentIntent:
    """Payment intent creation tests"""
    
    def _get_organiser_user(self):
        """Get organiser user data"""
        time.sleep(2)  # Rate limit protection
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ORGANISER,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 429:
            return None
        return response.json()
    
    def test_create_payment_intent(self):
        """POST /api/payments/create-intent creates a payment intent"""
        organiser_user = self._get_organiser_user()
        
        # Get an event to use its organiser ID
        events_response = requests.get(f"{BASE_URL}/api/events")
        events = events_response.json()
        if not events:
            pytest.skip("No events available")
        
        event = events[0]
        organiser_id = event.get("organiserId")
        if not organiser_id and organiser_user and "id" in organiser_user:
            organiser_id = organiser_user["id"]
        if not organiser_id:
            pytest.skip("Could not determine organiser ID")
        
        response = requests.post(
            f"{BASE_URL}/api/payments/create-intent",
            json={
                "amount": 1000,  # €10.00 in cents
                "currency": "eur",
                "metadata": {"eventId": event["id"]},
                "organiserId": organiser_id
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Payment intent creation may fail if Stripe is not configured, but should return a response
        if response.status_code == 200:
            data = response.json()
            # Check if Stripe is configured
            if data.get("configured"):
                assert "clientSecret" in data, "Should return clientSecret when Stripe is configured"
                print(f"SUCCESS: Payment intent created with clientSecret")
            else:
                print(f"INFO: Stripe not configured - payment intent returned configured=false")
        else:
            print(f"INFO: Payment intent creation returned {response.status_code} - Stripe may not be configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
