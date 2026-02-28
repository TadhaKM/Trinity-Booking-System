#!/usr/bin/env python3
"""
Backend API Testing for TCD Tickets - Google Auth & Trending Ticker Features
Testing the new features: Google Auth endpoint and trending activity ticker
"""

import requests
import sys
import json
from datetime import datetime

class TCDAPITester:
    def __init__(self, base_url="https://126b1be8-189d-40b4-b31d-f80b7ab1a7a2.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        
    def log_test(self, name, passed, details=""):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        if details and passed:
            print(f"   ℹ️  {details}")

    def test_google_auth_endpoint(self):
        """Test Google Auth API endpoint"""
        print("\n🔍 Testing Google Auth API endpoint...")
        
        url = f"{self.base_url}/api/auth/google"
        
        # Test with missing sessionId
        try:
            response = self.session.post(url, json={})
            passed = response.status_code == 400
            self.log_test(
                "Google Auth - Missing sessionId", 
                passed,
                f"Status: {response.status_code}, Expected: 400"
            )
        except Exception as e:
            self.log_test("Google Auth - Missing sessionId", False, f"Request failed: {str(e)}")
        
        # Test with invalid sessionId
        try:
            response = self.session.post(url, json={"sessionId": "invalid_session_123"})
            passed = response.status_code in [401, 400, 500]  # Any of these would be acceptable for invalid session
            self.log_test(
                "Google Auth - Invalid sessionId", 
                passed,
                f"Status: {response.status_code} (Expected 401/400/500 for invalid session)"
            )
        except Exception as e:
            self.log_test("Google Auth - Invalid sessionId", False, f"Request failed: {str(e)}")
            
        # Test with malformed request
        try:
            response = self.session.post(url, json={"sessionId": 123})  # Wrong type
            passed = response.status_code == 400
            self.log_test(
                "Google Auth - Wrong sessionId type", 
                passed,
                f"Status: {response.status_code}, Expected: 400"
            )
        except Exception as e:
            self.log_test("Google Auth - Wrong sessionId type", False, f"Request failed: {str(e)}")

    def test_trending_ticker_api(self):
        """Test trending activity ticker API"""
        print("\n🔍 Testing Trending Ticker API...")
        
        url = f"{self.base_url}/api/activity/trending"
        
        try:
            response = self.session.get(url)
            passed = response.status_code == 200
            
            if passed:
                try:
                    data = response.json()
                    has_activities = 'activities' in data
                    has_simulation_flag = 'isSimulated' in data
                    activities_is_array = isinstance(data.get('activities', []), list)
                    
                    self.log_test(
                        "Trending API - Response structure", 
                        has_activities and has_simulation_flag and activities_is_array,
                        f"Has activities: {has_activities}, Has isSimulated: {has_simulation_flag}, Activities is array: {activities_is_array}"
                    )
                    
                    # Check activity structure
                    activities = data.get('activities', [])
                    if activities:
                        first_activity = activities[0]
                        required_fields = ['id', 'type', 'message', 'timestamp']
                        has_all_fields = all(field in first_activity for field in required_fields)
                        valid_type = first_activity.get('type') in ['booking', 'viewing', 'soldout', 'newfollow']
                        
                        self.log_test(
                            "Trending API - Activity structure", 
                            has_all_fields and valid_type,
                            f"Required fields: {has_all_fields}, Valid type: {valid_type} ({first_activity.get('type')})"
                        )
                        
                        # Since DB is likely empty, expect simulated data
                        is_simulated = data.get('isSimulated', False)
                        self.log_test(
                            "Trending API - Returns simulated data when DB empty", 
                            is_simulated,
                            f"isSimulated: {is_simulated}, Activities count: {len(activities)}"
                        )
                    else:
                        self.log_test("Trending API - Activities array", False, "No activities returned")
                        
                except json.JSONDecodeError:
                    self.log_test("Trending API - JSON parsing", False, "Invalid JSON response")
            else:
                self.log_test("Trending API - Status code", passed, f"Status: {response.status_code}, Expected: 200")
                
        except Exception as e:
            self.log_test("Trending API - Request", False, f"Request failed: {str(e)}")

    def test_basic_endpoints(self):
        """Test some basic endpoints to ensure app is running"""
        print("\n🔍 Testing basic app availability...")
        
        # Test homepage
        try:
            response = self.session.get(self.base_url)
            passed = response.status_code == 200
            self.log_test("Homepage availability", passed, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Homepage availability", False, f"Request failed: {str(e)}")
            
        # Test login page
        try:
            response = self.session.get(f"{self.base_url}/login")
            passed = response.status_code == 200
            self.log_test("Login page availability", passed, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Login page availability", False, f"Request failed: {str(e)}")
            
        # Test signup page
        try:
            response = self.session.get(f"{self.base_url}/signup")
            passed = response.status_code == 200
            self.log_test("Signup page availability", passed, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Signup page availability", False, f"Request failed: {str(e)}")
            
        # Test societies page
        try:
            response = self.session.get(f"{self.base_url}/societies")
            passed = response.status_code == 200
            self.log_test("Societies page availability", passed, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Societies page availability", False, f"Request failed: {str(e)}")
            
        # Test auth callback page
        try:
            response = self.session.get(f"{self.base_url}/auth/callback")
            passed = response.status_code == 200
            self.log_test("Auth callback page availability", passed, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Auth callback page availability", False, f"Request failed: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting TCD Tickets API Testing")
        print(f"📍 Base URL: {self.base_url}")
        print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run test suites
        self.test_basic_endpoints()
        self.test_google_auth_endpoint()
        self.test_trending_ticker_api()
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"================")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        
        return self.tests_passed == self.tests_run

def main():
    tester = TCDAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())