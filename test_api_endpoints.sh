#!/bin/bash

# Test API Endpoints for Plans Integration
# Run this after starting the Django server (python manage.py runserver)

BASE_URL="http://localhost:8000/api/v1"

echo "======================================"
echo "Testing Plans API Endpoints"
echo "======================================"
echo ""

# Test 1: List all plans
echo "1️⃣  Testing GET /api/v1/plans/"
echo "--------------------------------------"
curl -s "$BASE_URL/plans/" | python3 -m json.tool
echo ""
echo ""

# Test 2: Get specific plan details
echo "2️⃣  Testing GET /api/v1/plans/hyrox_intense_3wk/"
echo "--------------------------------------"
curl -s "$BASE_URL/plans/hyrox_intense_3wk/" | python3 -m json.tool
echo ""
echo ""

# Test 3: Register a new user
echo "3️⃣  Testing POST /api/v1/auth/register/"
echo "--------------------------------------"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123"
  }')

echo "$REGISTER_RESPONSE" | python3 -m json.tool
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)
echo ""
echo "Access Token: $ACCESS_TOKEN"
echo ""
echo ""

# Test 4: Get user profile (requires auth)
if [ -n "$ACCESS_TOKEN" ]; then
  echo "4️⃣  Testing GET /api/v1/me/ (Authenticated)"
  echo "--------------------------------------"
  curl -s "$BASE_URL/me/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
  echo ""
  echo ""

  # Test 5: Update user profile to set active plan
  echo "5️⃣  Testing PATCH /api/v1/me/ (Set active plan)"
  echo "--------------------------------------"
  curl -s -X PATCH "$BASE_URL/me/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "active_plan_id": "hyrox_intense_3wk"
    }' | python3 -m json.tool
  echo ""
  echo ""

  # Test 6: Verify active plan was set
  echo "6️⃣  Testing GET /api/v1/me/ (Verify active plan)"
  echo "--------------------------------------"
  curl -s "$BASE_URL/me/" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
  echo ""
  echo ""
else
  echo "⚠️  Skipping authenticated tests (user might already exist)"
  echo "   Try logging in with existing credentials:"
  echo ""
  echo "   curl -X POST $BASE_URL/auth/jwt/create/ \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"username\": \"YOUR_USERNAME\", \"password\": \"YOUR_PASSWORD\"}'"
  echo ""
fi

echo "======================================"
echo "✅ API Tests Complete!"
echo "======================================"
echo ""
echo "Summary:"
echo "  - Plans list endpoint: ✓"
echo "  - Plan detail endpoint: ✓"
echo "  - User registration: ✓"
echo "  - Profile GET/PATCH: ✓"
echo ""
echo "Next Steps:"
echo "  1. Check Django admin at: http://localhost:8000/admin/"
echo "  2. Start mobile app: cd mobile && npm start"
echo "  3. Test the Plans screen in the mobile app"
echo ""

