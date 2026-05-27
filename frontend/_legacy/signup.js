document.addEventListener("DOMContentLoaded", async() => {

  const select = document.getElementById('university');
  try{
    const response = await fetch('https://university-domains-list-api-tn4l.onrender.com/search?country=Nigeria',
    {
      method: 'GET',
      headers: {"Content-Type":"application/json"}
    }
    );

    if(!response.ok){
      console.error('Error loading universities:', response.status);
      select.innerHTML = '<option value="" disabled>Error loading universities - try again</option>';
    } else {
      const res = await response.json();

      if (!res || res.length === 0) {
        console.warn('No universities returned');
        select.innerHTML = '<option value="" disabled>No universities available</option>';
      } else {
        console.log('Universities loaded:', res.length);
        res.forEach((item) => {
          const option = document.createElement('option');
          option.value = item.name;
          option.textContent = item.name;
          select.appendChild(option);
        })
      }
    }

  }catch(error){
    console.error('Error fetching universities:', error);
    select.innerHTML = '<option value="" disabled>Error loading universities</option>';
  }
  
})


// Setup show/hide password toggles for accessibility
document.addEventListener("DOMContentLoaded", () => {
  const toggles = document.querySelectorAll('.password-toggle')
  toggles.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const targetId = btn.dataset.target
      const input = document.getElementById(targetId)
      if (!input) return

      const isPassword = input.type === 'password'
      input.type = isPassword ? 'text' : 'password'
      btn.textContent = isPassword ? 'Hide' : 'Show'
      btn.setAttribute('aria-label', (isPassword ? 'Hide' : 'Show') + ' ' + (targetId === 'confirmPassword' ? 'confirm password' : 'password'))
      btn.setAttribute('aria-pressed', String(isPassword))
    })
  })
})

// Validation functions
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Simple toast utility (global showToast) for signup page
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

function isValidPhone(phone) {
  return /^\d{10,15}$/.test(phone.replace(/\D/g, ""))
}

// Strong password checks
function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#\$%\^&\*\(\)_\+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  return hasLower && hasUpper && hasNumber && hasSpecial;
}

function passwordStrength(password) {
  let score = 0;
  if (!password) return { score, label: 'Empty' };
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#\$%\^&\*\(\)_\+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score++;
  const labels = ['Very weak','Weak','Fair','Good','Strong','Very strong'];
  return { score, label: labels[Math.min(score, labels.length-1)] };
}

// Live password strength indicator (progress bar + input border color)
document.addEventListener('DOMContentLoaded', () => {
  const pwd = document.getElementById('password');
  if (!pwd) return;

  // ensure a strength container exists
  let container = document.getElementById('passwordStrengthContainer');
  if (!container) {
    const parent = pwd.closest('.form-group') || pwd.parentElement;
    container = document.createElement('div');
    container.id = 'passwordStrengthContainer';

    const bar = document.createElement('div');
    bar.id = 'passwordStrengthBar';
    container.appendChild(bar);

  const sr = document.createElement('div');
  sr.className = 'sr-only';
  sr.id = 'passwordStrengthText';
  sr.textContent = '';
  container.appendChild(sr);



    if (parent) parent.appendChild(container);
  }

  const bar = document.getElementById('passwordStrengthBar');
  const srText = document.getElementById('passwordStrengthText');

  pwd.addEventListener('input', (e) => {
    const val = e.target.value || '';
    const { score, label } = passwordStrength(val);

    if (!val) {
      bar.style.width = '0%';
      pwd.style.borderColor = '';
      pwd.style.boxShadow = '';
      srText.textContent = '';
      return;
    }

    const percent = Math.round((score / 5) * 100);
    bar.style.width = `${percent}%`;

    let color = '#ef4444'; // red
    if (score >= 5) color = '#16a34a'; // green
    else if (score === 4) color = '#10b981'; // emerald
    else if (score === 3) color = '#f59e0b'; // amber
    else if (score === 2) color = '#f97316'; // orange

    // set bar color and input border
    bar.style.background = color;
    pwd.style.borderColor = color;
    pwd.style.boxShadow = `0 0 0 3px ${color}22`;

    srText.textContent = `Password strength: ${label}`;
  });
});

function validateSignup(username, phone, email, university, role, password, confirmPassword) {
  const errors = {}

  if (!username.trim()) {
    errors.username = "Username is required"
  } else if (username.length < 3) {
    errors.username = "Username must be at least 3 characters"
  }

  if (!phone.trim()) {
    errors.phone = "Phone number is required"
  } else if (!isValidPhone(phone)) {
    errors.phone = "Enter a valid phone number (10-15 digits)"
  }

  if (!email.trim()) {
    errors.email = "Email is required"
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address"
  }

  if (!university.trim()) {
    errors.university = "University is required"
  }

  // if (!department.trim()) {
  //   errors.department = "Department is required"
  // }

  if (!role) {
    errors.role = "Please select a role"
  }

  if (!password) {
    errors.password = "Password is required"
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters"
  } else if (!isStrongPassword(password)) {
    errors.password = "Password must include uppercase, lowercase, number and special character"
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match"
  }

  // Check for duplicate accounts
  // const users = JSON.parse(localStorage.getItem("users")) || []
  // const userExists = users.find((u) => u.email === email || u.phone === phone || u.username === username)

  // if (userExists) {
  //   if (userExists.email === email) errors.email = "Email already registered"
  //   if (userExists.phone === phone) errors.phone = "Phone number already registered"
  //   if (userExists.username === username) errors.username = "Username already taken"
  // }

  return errors

}

// Handle form submission
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  // Show loading modal and disable scrolling
  const loadingModal = document.getElementById("loadingModal");
  loadingModal.classList.remove("hide");
  loadingModal.classList.add("show");
  loadingModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("loading-active");

  const username = document.getElementById("username").value
  const phone = document.getElementById("phone").value
  const email = document.getElementById("email").value
  const university = document.getElementById("university").value
  const role = document.getElementById("role").value
  const password = document.getElementById("password").value
  const confirmPassword = document.getElementById("confirmPassword").value

  // Clear previous success UI
  document.getElementById("signupSuccess").classList.remove("show")

  // Validate
  const errors = validateSignup(username, phone, email, university, role, password, confirmPassword)

  if (Object.keys(errors).length > 0) {
    // Hide loading modal on validation error
    hideLoadingModal();
    
    Object.keys(errors).forEach((key) => {
      showToast(errors[key], "error");
    })
    return
  }

  // Save user
  const newUser = {
    username,
    phone,
    email,
    "institute": university,
    role,
    password
  }

  console.log(newUser);

  try{
    const response = await fetch('https://upstartpy.onrender.com/auth/users/',
      {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(newUser)
      }
    )

    if(!response.ok){
      // Hide loading modal on error
      hideLoadingModal();
      
      let errorMessage = "Signup failed. Please try again.";
      try {
        const error = await response.json();
        console.error('Signup error:', response.status, error);
        
        if(response.status === 400){
          if(error.email && Array.isArray(error.email)){
            errorMessage = error.email[0];
          } else if(error.username && Array.isArray(error.username)){
            errorMessage = error.username[0];
          } else if(error.detail) {
            errorMessage = error.detail;
          }
        }
        else if (response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } catch(parseError) {
        console.error('Failed to parse signup error:', parseError);
      }
      
      showToast(errorMessage, "error");
      return;
    }

    console.log('Signup successful');
    
    // Show success message and redirect
    const toastTimeout = 1400;
    showToast("Account created successfully! Redirecting to login...", "success", { timeout: toastTimeout });

    // Redirect after the toast has dismissed
    setTimeout(() => {
      window.location.href = "login.html"
    }, 2000);
    
  }catch(error){
    // Hide loading modal on error
    hideLoadingModal();
    
    console.error('Signup exception:', error);
    showToast("Network error — please check your connection and try again", "error");
    return;
  }
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


