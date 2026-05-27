// Initialize app data structure if not exists
// function initializeAppData() {
//   if (!localStorage.getItem("users")) {
//     localStorage.setItem("users", JSON.stringify([]))
//   }
//   if (!localStorage.getItem("currentUser")) {
//     localStorage.setItem("currentUser", JSON.stringify(null))
//   }
// }

// document.addEventListener("DOMContentLoaded", () => {
// })

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Simple toast utility (global showToast)
(function () {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  window.showToast = function (message, type = 'info', options = {}) {
    const timeout = options.timeout ?? 3500;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const text = document.createElement('div');
    text.textContent = message;
    toast.appendChild(text);

    const close = document.createElement('button');
    close.className = 'close-btn';
    close.type = 'button';
    close.textContent = '×';
    close.addEventListener('click', () => dismiss());
    toast.appendChild(close);

    let removed = false;
    function dismiss() {
      if (removed) return;
      removed = true;
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }

    container.appendChild(toast);
    // Force reflow so transition works
    requestAnimationFrame(() => toast.classList.add('show'));

    if (timeout > 0) {
      setTimeout(dismiss, timeout);
    }
    return {
      dismiss
    };
  };
})();



// Validate login credentials
function validateLogin(email, password) {
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = "Phone or email is required";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email";
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  return errors;
}

// Handle form submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  // Show loading modal and disable scrolling
  const loadingModal = document.getElementById("loadingModal");
  loadingModal.classList.remove("hide");
  loadingModal.classList.add("show");
  loadingModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("loading-active");

  const email = document.getElementById("loginEmail").value
  const password = document.getElementById("loginPassword").value

  // Clear previous success UI
  document.getElementById("loginSuccess").classList.remove("show")
  document.getElementById("loginSuccess").classList.remove("show")

  // Validate input
  const errors = validateLogin(email, password);

  if (Object.keys(errors).length > 0) {
    // Hide loading modal on validation error
    hideLoadingModal();
    
    Object.keys(errors).forEach((k) => showToast(errors[k], "error"));
    return;
  }
  

  const loginInfo = {email, password};

  try {
    const response = await fetch('https://upstartpy.onrender.com/auth/jwt/create/', {
      method: 'POST',
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(loginInfo)
    });

    if (!response.ok) {
      // Hide loading modal on error
      hideLoadingModal();
      
      let errorMessage = "Login failed — please try again";
      try {
        const error = await response.json();
        console.error('Login error:', response.status, error);
        if (response.status === 401) {
          errorMessage = "Invalid email or password";
        } else if (error.detail) {
          errorMessage = error.detail;
        }
      } catch(e) {
        console.error('Failed to parse error response:', e);
      }
      
      showToast(errorMessage, "error");
      return;
    }

    const data = await response.json();
    console.log('Login successful');
    
    // Validate response data
    if (!data || !data.access) {
      hideLoadingModal();
      console.error('Invalid login response:', data);
      showToast("Login response invalid. Please try again.", "error");
      return;
    }

    // Store token / user info
    localStorage.setItem('userData', JSON.stringify(data));

    // Success
    showToast("Login successful! Redirecting...", "success", { timeout: 2000 });
    
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
    
    return;
  } catch (err) {
    // Hide loading modal on error
    hideLoadingModal();
    
    console.error('Login exception:', err);
    showToast("Network error — please check your connection and try again", "error");
    return;
  }

  // Get users from localStorage
  // const users = JSON.parse(localStorage.getItem("users")) || []

  // Check if user exists
  // const user = users.find((u) => {
  //   const emailMatch = u.email === emailOrPhone
  //   const phoneMatch = u.phone === emailOrPhone
  //   return emailMatch || phoneMatch
  // })

  // if (!user) {
  //   document.getElementById("loginEmailError").textContent = "User not found"
  //   return
  // }

  // if (user.password !== password) {
  //   document.getElementById("loginPasswordError").textContent = "Incorrect password"
  //   return
  // }

  // Store current user
  // const loggedInUser = { ...user }
  // delete loggedInUser.password
  // localStorage.setItem("currentUser", JSON.stringify(loggedInUser))
})

// Helper function to hide loading modal with exit animation
function hideLoadingModal() {
  const loadingModal = document.getElementById("loadingModal");
  loadingModal.classList.remove("show");
  loadingModal.classList.add("hide");
  loadingModal.setAttribute("aria-hidden", "true");
  
  // Remove hide class after animation completes
  setTimeout(() => {
    loadingModal.classList.remove("hide");
    document.body.classList.remove("loading-active");
  }, 600);
}

