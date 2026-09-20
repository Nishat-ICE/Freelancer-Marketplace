const API_URL = "http://localhost:5000/api";

// =========================
// REGISTER
// =========================
async function registerUser(name, email, password, role) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password,
                role
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("Registration successful!");
            window.location.href = "login.html";
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.error("Register Error:", error);
        alert("Cannot connect to server.");
    }
}


// =========================
// LOGIN
// =========================
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (data.success) {

            // Save logged-in user
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            alert("Login successful!");

            window.location.href = "dashboard.html";

        } else {
            alert(data.message);
        }

    } catch (error) {
        console.error("Login Error:", error);
        alert("Cannot connect to server.");
    }
}


// =========================
// LOGOUT
// =========================
function logoutUser() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// =========================
// GET CURRENT USER
// =========================
function getCurrentUser() {
    const user = localStorage.getItem("user");

    if (!user) {
        return null;
    }

    return JSON.parse(user);
}