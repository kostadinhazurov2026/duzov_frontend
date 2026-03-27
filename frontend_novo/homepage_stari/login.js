const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); 

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }) 
        });

        const result = await response.json();

        if (response.ok) {
            if (result.token) localStorage.setItem('token', result.token);
            window.location.href = "homepage.html"; 
        } else {
            alert("Login failed: " + (result.message || "Invalid credentials"));
        }
    } catch (error) {
        alert("Server is not responding.");
    }
});