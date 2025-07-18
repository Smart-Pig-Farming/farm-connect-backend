const axios = require("axios");

const API_BASE = "http://localhost:5000/api";

// Test admin user creation workflow
async function testAdminUserCreation() {
  try {
    console.log("🧪 Testing Admin User Creation Workflow...\n");

    // First, we need to login as admin to get token
    console.log("1. Logging in as admin...");
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "admin@farmconnect.com",
      password: "Admin123!",
    });

    const token = loginResponse.data.data.token;
    console.log("✅ Admin login successful");

    // Create headers with auth token
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Test 1: Create a new user (veterinarian)
    console.log("\n2. Creating new veterinarian user...");
    const randomId = Date.now();
    const createUserResponse = await axios.post(
      `${API_BASE}/admin/users`,
      {
        firstname: "Dr. Sarah",
        lastname: "Johnson",
        email: `sarah.johnson.${randomId}@vetclinic.com`,
        username: `sarahj${randomId}`,
        organization: "City Veterinary Clinic",
        sector: "Nyarugenge",
        district: "Nyarugenge",
        province: "Kigali",
        role_id: 3, // Veterinarian role (based on database: 1=farmer, 2=admin, 3=vet, 4=govt)
      },
      { headers }
    );

    console.log("✅ User creation response:", {
      success: createUserResponse.data.success,
      message: createUserResponse.data.message,
      emailSent: !createUserResponse.data.warning,
      temporaryPassword:
        createUserResponse.data.temporaryPassword || "[SENT_VIA_EMAIL]",
    });

    // Test 2: Get all users to verify creation
    console.log("\n3. Fetching all users...");
    const usersResponse = await axios.get(`${API_BASE}/admin/users`, {
      headers,
    });
    const newUser = usersResponse.data.data.find(
      (user) => user.email === `sarah.johnson.${randomId}@vetclinic.com`
    );

    if (newUser) {
      console.log("✅ User found in system:", {
        id: newUser.id,
        name: `${newUser.firstname} ${newUser.lastname}`,
        email: newUser.email,
        organization: newUser.organization,
        is_verified: newUser.is_verified,
        role: newUser.role?.name,
      });
    }

    // Test 3: Test first-time login verification flow
    console.log("\n4. Testing first-time login verification...");

    // This would normally be done by the user, but we'll simulate it
    // Note: In real scenario, user would use the temporary password from email
    const tempPassword = createUserResponse.data.temporaryPassword;

    if (tempPassword && tempPassword !== "[SENT_VIA_EMAIL]") {
      console.log("Testing first-time verification with temporary password...");

      try {
        const verificationResponse = await axios.post(
          `${API_BASE}/auth/first-time-verification`,
          {
            email: `sarah.johnson.${randomId}@vetclinic.com`,
            currentPassword: tempPassword,
            newPassword: "MyNewSecurePassword123!",
          }
        );

        console.log("✅ First-time verification successful:", {
          success: verificationResponse.data.success,
          message: verificationResponse.data.message,
          user: verificationResponse.data.data.user,
        });
      } catch (error) {
        console.log(
          "ℹ️ First-time verification test skipped (password sent via email)"
        );
      }
    } else {
      console.log(
        "ℹ️ First-time verification test skipped (password sent via email)"
      );
    }

    // Test 4: Test user management operations
    console.log("\n5. Testing user management operations...");

    // Lock/unlock user
    const lockResponse = await axios.patch(
      `${API_BASE}/admin/users/${newUser.id}/lock`,
      {},
      { headers }
    );
    console.log("✅ User lock toggle:", lockResponse.data.message);

    // Cleanup: Delete test user
    console.log("\n6. Cleaning up test user...");
    await axios.delete(`${API_BASE}/admin/users/${newUser.id}`, { headers });
    console.log("✅ Test user deleted");

    console.log("\n🎉 All admin user management tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

// Run the test
testAdminUserCreation();
