// Toast notification utility
function showToast(message, type = 'info', options = {}) {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.style.position = 'fixed';
    el.style.top = '20px';
    el.style.right = '20px';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    return el;
  })();

  const timeout = options.timeout ?? 3500;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.padding = '12px 16px';
  toast.style.marginBottom = '8px';
  toast.style.borderRadius = '4px';
  toast.style.backgroundColor = type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3';
  toast.style.color = 'white';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

  const text = document.createElement('div');
  text.textContent = message;
  toast.appendChild(text);

  let removed = false;
  function dismiss() {
    if (removed) return;
    removed = true;
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }

  container.appendChild(toast);
  if (timeout > 0) {
    setTimeout(dismiss, timeout);
  }
  return { dismiss };
}

let isEditing = false

async function loadUserProfile() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }

  const user = currentUser.user
  console.log(user)

  // Load profile data
  document.getElementById("profileName").textContent = user.username
  document.getElementById("username").value = user.username
  document.getElementById("email").value = user.email
  document.getElementById("phone").value = user.phone
  document.getElementById("profileRole").textContent = user.role
  document.getElementById("profileImg").src = user.profile_url
  document.getElementById("bio").value = user.bio


  const select = document.getElementById('university');
  const bio = document.getElementById("bio");
  try{
    const response = await fetch('https://university-domains-list-api-tn4l.onrender.com/search?country=Nigeria',
    {
      method: 'GET',
      headers: {"Content-Type":"application/json"}
    }
    );

    if(!response.ok){
      console.error('Error fetching universities:', response.status);
      showToast("Failed to load universities. You can still edit manually.", 'error');
      select.innerHTML = '<option value="" disabled>Error loading universities - edit manually</option>';
      hideLoadingModal();
      return;
    }

    const res = await response.json();
    
    if (!res || res.length === 0) {
      console.warn('No universities returned');
      select.innerHTML = '<option value="" disabled>No universities available</option>';
      hideLoadingModal();
      return;
    }

    console.log('Universities loaded:', res.length, 'items');
    res.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.name;
      option.textContent = item.name;
      select.appendChild(option);
    })

  }catch(error){
    console.error('Error loading universities:', error);
    select.innerHTML = '<option value="" disabled>Error loading universities</option>';
    showToast('Failed to load universities. Check your connection.', 'error');
  }finally{
    select.disabled = true;
    bio.disabled = true;
    document.getElementById("university").value = user.institute;
    hideLoadingModal();
  }
}

// Edit profile
document.getElementById("editBtn").addEventListener("click", () => {
  isEditing = true
  document.querySelectorAll(".form-input").forEach((input) => {
    if (input.id !== "username" && input.id !== "email" && input.id !== "phone") {
      input.removeAttribute("readonly")
      input.removeAttribute("disabled")
    }
  })
  document.getElementById("editBtn").style.display = "none"
  document.getElementById("saveBtn").style.display = "block"
  document.getElementById("cancelBtn").style.display = "block"
})

// Save changes
document.getElementById("saveBtn").addEventListener("click", async () => {
  // Show loading modal
  const loadingModal = document.getElementById("loadingModal");
  loadingModal.classList.remove("hide");
  loadingModal.classList.add("show");
  loadingModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("loading-active");

  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    hideLoadingModal();
    window.location.href = "login.html"
    return
  }

  const bio = document.getElementById("bio").value;
  const institute = document.getElementById("university").value;
  console.log('Saving profile with:', JSON.stringify({bio, institute}))
  
  try{
    const response = await fetch('https://upstartpy.onrender.com/auth/users/me/', 
      {
        method: "PATCH",
        headers: {
          "Content-Type":"application/json",
          "Authorization":`Bearer ${currentUser.access}`
        },
        body: JSON.stringify({bio, institute})
      })

    if (!response.ok){
      const error = await response.json();
      console.error('Error updating profile:', response.status, error);
      hideLoadingModal();
      showToast(error.detail || 'Failed to update profile', 'error');
      return;
    }

    const data = await response.json()
    hideLoadingModal();
    showToast("Profile updated successfully!", "success");
    console.log('Profile updated successfully');
    
    currentUser.user.bio = data.bio
    currentUser.user.institute = data.institute

    localStorage.setItem("userData", JSON.stringify(currentUser));

    isEditing = false
    document.querySelectorAll(".form-input").forEach((input) => {
      input.setAttribute("readonly", "")
      input.setAttribute("disabled", "")
    })
    document.getElementById("editBtn").style.display = "block"
    document.getElementById("saveBtn").style.display = "none"
    document.getElementById("cancelBtn").style.display = "none"
    loadUserProfile()

  }catch(error){
    console.error('Error saving profile:', error);
    hideLoadingModal();
    showToast('Failed to update profile. Check your connection.', 'error');
  }
})

// Cancel edit
document.getElementById("cancelBtn").addEventListener("click", () => {
  isEditing = false
  document.querySelectorAll(".form-input").forEach((input) => {
    input.setAttribute("readonly", "")
    input.setAttribute("disabled", "")
  })
  document.getElementById("editBtn").style.display = "block"
  document.getElementById("saveBtn").style.display = "none"
  document.getElementById("cancelBtn").style.display = "none"
  loadUserProfile()
})

// Change photo
document.getElementById("changePhotoBtn").addEventListener("click", () => {
  document.getElementById("photoInput").click()
})

document.getElementById("photoInput").addEventListener("change", async (e) => {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }

  const file = e.target.files[0]
  
  if (!file) {
    console.warn('No file selected');
    return;
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file.', 'error');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size must be less than 5MB.', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('profile_picture', file);

  try{
    const response = await fetch('https://upstartpy.onrender.com/auth/users/me/', 
      {
        method: "PATCH",
        headers: {
          "Authorization":`Bearer ${currentUser.access}`
        },
        body: formData
      })

    if (!response.ok){
      const error = await response.json();
      console.error('Error updating profile picture:', response.status, error);
      showToast(error.detail || 'Failed to update profile picture', 'error');
      return;
    }

    const data = await response.json()
    showToast("Profile picture updated successfully!", "success");
    console.log('Profile picture updated');

    document.getElementById("profileImg").src = data.profile_url

    currentUser.user.profile_url = data.profile_url
    localStorage.setItem("userData", JSON.stringify(currentUser))

  }catch(error){
    console.error('Error uploading profile picture:', error);
    showToast('Failed to upload profile picture. Check your connection.', 'error');
  }finally{
    // Reset file input
    e.target.value = '';
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

// // Logout
// document.getElementById("logoutBtn").addEventListener("click", () => {
//   localStorage.setItem("currentUser", JSON.stringify(null))
//   window.location.href = "login.html"
// })

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }
  
  const profileNav = document.getElementById('viewProfile')
  if (profileNav) profileNav.style.display = "none"

  loadUserProfile()
})
