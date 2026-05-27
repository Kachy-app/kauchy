let currentEditProductId = null
// store created object URLs so we can revoke them when clearing previews
let _createdPreviewURLs = []
// aggregated selected files (supports continuous picking / multiple drops)
let _selectedFiles = []

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

// Helper function to remove skeleton loaders with animation
function removeSkeletonLoaders() {
  const loadingSkeleton = document.querySelectorAll(".product-card-skeleton");
  if (!loadingSkeleton || loadingSkeleton.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    loadingSkeleton.forEach(card => card.classList.add('fade-out'));
    setTimeout(() => {
      loadingSkeleton.forEach(card => card.remove());
      resolve();
    }, 350);
  });
}

function checkAuth() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
    return null
  }
  if (currentUser.user.role !== "vendor") {
    alert("Only vendors can access inventory")
    window.location.href = "index.html"
    return null
  }
  return currentUser
}

async function loadInventory() {
  const currentUser = checkAuth()
  if (!currentUser) return

  const grid = document.getElementById("productsGrid")

  try{
    const response = await fetch('https://upstartpy.onrender.com/products/my_products/',
      {
        method: "GET",
        headers: {
          "Content-Type":"application/json",
          "Authorization":`Bearer ${currentUser.access}`
        }
      })

    if (!response.ok) {
      console.error('Error loading inventory:', response.status);
      showToast('Failed to load your products. Please try again.', 'error');
      
      // Remove skeleton loaders and show error message
      removeSkeletonLoaders();
      grid.innerHTML = `
        <div class="empty-inventory" style="grid-column: 1/-1;">
          <div class="empty-icon">⚠️</div>
          <p class="empty-text">Failed to load products. Please refresh the page.</p>
        </div>
      `;
      
      hideLoadingModal();
      return;
    }

    const vendorProducts = await response.json()
    console.log('Inventory loaded:', vendorProducts?.length || 0, 'products');
    
    // Remove skeleton loaders before rendering products
    await removeSkeletonLoaders()

    if (!vendorProducts || vendorProducts.length === 0) {
      grid.innerHTML = `
              <div class="empty-inventory" style="grid-column: 1/-1;">
                  <div class="empty-icon">📦</div>
                  <p class="empty-text">No products listed yet. Click the + button to add your first product!</p>
              </div>
          `
      hideLoadingModal()
      return
    }

    grid.innerHTML = vendorProducts
      .map(
        (product, index) => `
          <div class="product-card">
              <img src="${product.image_url?.[0] || '/placeholder.svg'}" alt="${product.product_name}" class="product-image" onerror="this.src='/placeholder.svg'">
              <div class="product-card-body">
                  <div class="product-card-name">${product.product_name}</div>
                  <div class="product-card-price">₦${product.price}</div>
                  <div class="product-card-info">Qty: ${product.quantity}</div>
                  <div class="product-card-info">Views: ${product.view_count || 0}</div>
                  ${product.videoUrl ? `<div class="product-card-info" style="cursor: pointer;" onclick="initVideoViewer(${JSON.stringify([product]).replace(/"/g, "&quot;")}, 0)">🎥 View Video</div>` : ""}
                  <div class="product-card-actions">
                      <button class="edit-btn" onclick="openEditModal(${product.id})">Edit</button>
                      <button class="delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
                  </div>
              </div>
          </div>
      `,
      )
      .join("")
    
    hideLoadingModal()
    
    // Trigger fade-in animation for product cards
    const cards = Array.from(document.querySelectorAll('.product-card'));
    cards.forEach((card, idx) => setTimeout(() => card.classList.add('fade-in'), idx * 50));
  }catch(error){
    console.error('Error loading inventory:', error);
    showToast('Failed to load inventory. Check your connection.', 'error');
    
    // Remove skeleton loaders and show error message
    removeSkeletonLoaders();
    const grid = document.getElementById("productsGrid")
    if (grid) {
      grid.innerHTML = `
        <div class="empty-inventory" style="grid-column: 1/-1;">
          <div class="empty-icon">⚠️</div>
          <p class="empty-text">Failed to load products. Please check your connection and try again.</p>
        </div>
      `;
    }
    
    hideLoadingModal();
  }
}

// Add Product Modal
document.getElementById("addProductBtn").addEventListener("click", () => {
  document.getElementById("addProductModal").classList.add("active")
  // clear previous selection/previews
  const fileInput = document.getElementById('productImage')
  if (fileInput) fileInput.value = ''
  clearImagePreviews()
  clearSelectedFiles()
})

document.getElementById("uploadContentBtn").addEventListener("click", () => {
  // open modal and clear any previous selection/preview
  document.getElementById("uploadContentModal").classList.add("active")
  const contentInput = document.getElementById('contentVideo')
  if (contentInput) contentInput.value = ''
  clearContentVideoPreview()
})

document.getElementById("closeAddProductModal").addEventListener("click", () => {
  document.getElementById("addProductModal").classList.remove("active")
  const fileInput = document.getElementById('productImage')
  if (fileInput) fileInput.value = ''
  clearImagePreviews()
  clearSelectedFiles()
})

document.getElementById("cancelAddBtn").addEventListener("click", () => {
  document.getElementById("addProductModal").classList.remove("active")
  const fileInput = document.getElementById('productImage')
  if (fileInput) fileInput.value = ''
  clearImagePreviews()
  clearSelectedFiles()
})

document.addEventListener("DOMContentLoaded", () => {
  // Drag and drop for images
  const imageUpload = document.querySelector(".image-upload")
  if (imageUpload) {
    imageUpload.addEventListener("dragover", (e) => {
      e.preventDefault()
      imageUpload.style.borderColor = "var(--primary)"
      imageUpload.style.background = "rgba(28, 110, 242, 0.1)"
    })
    imageUpload.addEventListener("dragleave", (e) => {
      e.preventDefault()
      imageUpload.style.borderColor = "var(--border)"
      imageUpload.style.background = "transparent"
    })
    imageUpload.addEventListener("drop", (e) => {
      e.preventDefault()
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        const newFiles = Array.from(e.dataTransfer.files)
        // append to our aggregated list
        _selectedFiles = _selectedFiles.concat(newFiles)

        const fileInput = document.getElementById('productImage')
        try {
          // sync file input to combined list using DataTransfer
          const dt = new DataTransfer()
          _selectedFiles.forEach((f) => dt.items.add(f))
          fileInput.files = dt.files
        } catch (err) {
          // some browsers disallow assigning FileList; that's ok
        }

        // render only the newly added files (append)
        renderImagePreviews(newFiles)
      }
      imageUpload.style.borderColor = "var(--border)"
      imageUpload.style.background = "transparent"
    })
  }
})

// Render previews for selected image files
function renderImagePreviews(fileList) {
  // append previews for provided FileList/Array without clearing existing previews
  const container = document.getElementById('imagePreviewContainer')
  if (!container || !fileList || fileList.length === 0) return

  const files = Array.from(fileList)
  files.forEach((file) => {
    const thumb = document.createElement('div')
    thumb.className = 'image-preview-thumb'

    const img = document.createElement('img')
    // use object URL for fast preview
    const url = URL.createObjectURL(file)
    _createdPreviewURLs.push(url)
    img.src = url
    img.alt = file.name
    thumb.appendChild(img)

    // add remove button for this thumbnail
    const removeBtn = document.createElement('button')
    removeBtn.className = 'image-preview-remove'
    removeBtn.type = 'button'
    removeBtn.title = 'Remove image'
    removeBtn.innerText = '✕'
    // when clicked, remove the file from _selectedFiles by matching name+size+lastModified
    removeBtn.addEventListener('click', () => {
      removeSelectedFile(file)
    })
    thumb.appendChild(removeBtn)

    container.appendChild(thumb)
  })
}

// Remove a selected file (by File object identity: match name+size+lastModified)
function removeSelectedFile(fileToRemove) {
  // find index matching name, size, and lastModified
  const idx = _selectedFiles.findIndex((f) => (
    f.name === fileToRemove.name && f.size === fileToRemove.size && f.lastModified === fileToRemove.lastModified
  ))
  if (idx === -1) return
  _selectedFiles.splice(idx, 1)
  // re-render all previews from current _selectedFiles
  renderAllPreviews()
  // sync input
  syncFileInput()
}

function renderAllPreviews() {
  clearImagePreviews()
  const container = document.getElementById('imagePreviewContainer')
  if (!container) return
  _selectedFiles.forEach((file) => {
    const thumb = document.createElement('div')
    thumb.className = 'image-preview-thumb'

    const img = document.createElement('img')
    const url = URL.createObjectURL(file)
    _createdPreviewURLs.push(url)
    img.src = url
    img.alt = file.name
    thumb.appendChild(img)

    const removeBtn = document.createElement('button')
    removeBtn.className = 'image-preview-remove'
    removeBtn.type = 'button'
    removeBtn.title = 'Remove image'
    removeBtn.innerText = '✕'
    removeBtn.addEventListener('click', () => {
      removeSelectedFile(file)
    })
    thumb.appendChild(removeBtn)

    container.appendChild(thumb)
  })
}

function syncFileInput() {
  const fileInput = document.getElementById('productImage')
  if (!fileInput) return
  try {
    const dt = new DataTransfer()
    _selectedFiles.forEach((f) => dt.items.add(f))
    fileInput.files = dt.files
  } catch (err) {
    // some browsers disallow assigning FileList — keep _selectedFiles as source of truth
  }
}

function clearImagePreviews() {
  const container = document.getElementById('imagePreviewContainer')
  if (!container) return
  container.innerHTML = ''
  // revoke object URLs
  _createdPreviewURLs.forEach((u) => {
    try { URL.revokeObjectURL(u) } catch (e) {}
  })
  _createdPreviewURLs = []
}

// also clear aggregated selected files
function clearSelectedFiles() {
  _selectedFiles = []
  const fileInput = document.getElementById('productImage')
  if (fileInput) fileInput.value = ''
}

// wire up file input change to append previews (supports continuous picking)
const _fileInputElem = document.getElementById('productImage')
if (_fileInputElem) {
  _fileInputElem.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return

    // append to aggregated list
    _selectedFiles = _selectedFiles.concat(newFiles)

    // sync the input's FileList to include all selected files
    try {
      const dt = new DataTransfer()
      _selectedFiles.forEach((f) => dt.items.add(f))
      _fileInputElem.files = dt.files
    } catch (err) {
      // ignore if browser doesn't allow assigning FileList
    }

    // render only newly added files
    renderImagePreviews(newFiles)
  })
}

document.getElementById("addProductForm").addEventListener("submit", async (e) => {
  e.preventDefault()

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

  
  const fd = new FormData()
  product_name = document.getElementById("productName").value
  price = Number.parseFloat(document.getElementById("productPrice").value)
  category = document.getElementById("productCategory").value
  description = document.getElementById("productDescription").value
  quantity = Number.parseInt(document.getElementById("productQuantity").value)
  fd.append('product_name',product_name)
  fd.append('price' ,price)
  fd.append('category', category)
  fd.append('description', description)
  fd.append('quantity', quantity)

  // Handle multiple image uploads (read as data URLs)
  // prefer aggregated _selectedFiles (supports continuous selection), fallback to input.files
  const fileInput = document.getElementById("productImage")
  const files = (_selectedFiles && _selectedFiles.length > 0)
    ? Array.from(_selectedFiles)
    : (fileInput && fileInput.files ? Array.from(fileInput.files) : [])

  if (files.length > 0) {
    files.forEach((file) => {
        fd.append('image_url', file)  // Append each file individually
    })   
  }else{
    hideLoadingModal();
    alert("An image is required")
    return
  }


  // Try to POST to backend; if network fails, fall back to localStorage
  try {
    const response = await fetch('https://upstartpy.onrender.com/products/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentUser.access}`,
      },
      body: fd,
    })

    if (!response.ok) {
      hideLoadingModal();
      const err = await response.json().catch(() => ({}))
      console.error('Server error adding product:', response.status, err)
      showToast(err.detail || 'Failed to add product. Please try again.', 'error');
      return;
    }

    hideLoadingModal();
    showToast('Product added successfully!', 'success');
    console.log('Product added successfully');
    document.getElementById('addProductForm').reset()
    document.getElementById('addProductModal').classList.remove('active')
    clearImagePreviews()
    clearSelectedFiles()
    loadInventory()
  } catch (error) {
    hideLoadingModal();
    console.error('Error adding product:', error)
    showToast('Failed to add product. Check your connection.', 'error');
  }
})

// Edit Product Modal
async function openEditModal(productId) {
  try {
    currentEditProductId = productId
    const response = await fetch(`https://upstartpy.onrender.com/products/${productId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      }
    )

    if (!response.ok) {
      console.error('Error fetching product:', response.status);
      showToast('Failed to load product details.', 'error');
      return;
    }

    const product = await response.json();

    if (!product) {
      console.error('No product data received');
      showToast('Product not found.', 'error');
      return;
    }

    document.getElementById("editProductName").value = product.product_name
    document.getElementById("editProductDescription").value = product.description
    document.getElementById("editProductPrice").value = product.price
    document.getElementById("editProductQuantity").value = product.quantity
    document.getElementById("editProductCategory").value = product.category
    document.getElementById("editProductLocation").value = product.institute
    document.getElementById("editViewCount").textContent = product.viewCount || 0

    document.getElementById("editProductModal").classList.add("active")
    const modalContent = document.querySelector(".modal-body");
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  } catch(error) {
    console.error('Error opening edit modal:', error);
    showToast('Failed to load product. Check your connection.', 'error');
  }
}

document.getElementById("closeEditProductModal").addEventListener("click", () => {
  document.getElementById("editProductModal").classList.remove("active")
})


document.getElementById("cancelEditBtn").addEventListener("click", () => {
  document.getElementById("editProductModal").classList.remove("active")
})


document.getElementById("editProductForm").addEventListener("submit", async (e) => {
  e.preventDefault()
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }

  const product_name = document.getElementById("editProductName").value;
  const description = document.getElementById("editProductDescription").value;
  const price = Number.parseFloat(document.getElementById("editProductPrice").value);
  const quantity = Number.parseInt(document.getElementById("editProductQuantity").value);
  const category = document.getElementById("editProductCategory").value

  const data = {
    product_name,
    description,
    price,
    quantity,
    category
  }
  

  try{
    const response = await fetch(`https://upstartpy.onrender.com/products/${currentEditProductId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type":"application/json",
          "Authorization":`Bearer ${currentUser.access}`
        },
        body: JSON.stringify(data)
      })

    if(response.ok){
      alert("Product updated successfully!")
      document.getElementById("editProductModal").classList.remove("active")
      loadInventory()
    }else{
      const err = await response.json()
      console.log(err)
    }

  }catch(error){

  }
})

async function deleteProduct(productId) {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }
  if (confirm("Are you sure you want to delete this product?")) {
    try{
      const response = await fetch(`https://upstartpy.onrender.com/products/${productId}`,
        {
          method: "DELETE",
          headers: {"Authorization":`Bearer ${currentUser.access}`}
        })
      
      if (response.ok){
        alert("Product deleted successfully!")
        document.getElementById("editProductModal").classList.remove("active")
        loadInventory()
      }
    }catch(error){
    
    }
  }
}

document.getElementById("deleteProductBtn").addEventListener("click", () => {
  if (currentEditProductId) {
    deleteProduct(currentEditProductId)
  }
})

document.getElementById("closeUploadContentModal").addEventListener("click", () => {
  document.getElementById("uploadContentModal").classList.remove("active")
  const contentInput = document.getElementById('contentVideo')
  if (contentInput) contentInput.value = ''
  clearContentVideoPreview()
})

document.getElementById("cancelUploadBtn").addEventListener("click", () => {
  document.getElementById("uploadContentModal").classList.remove("active")
  const contentInput = document.getElementById('contentVideo')
  if (contentInput) contentInput.value = ''
  clearContentVideoPreview()
})


// Modal close on ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("addProductModal").classList.remove("active")
    document.getElementById("editProductModal").classList.remove("active")
    document.getElementById("uploadContentModal").classList.remove("active")
  }
})

// Close modal on outside click
document.getElementById("addProductModal").addEventListener("click", function (e) {
  if (e.target === this) {
    this.classList.remove("active")
  }
})

document.getElementById("editProductModal").addEventListener("click", function (e) {
  if (e.target === this) {
    this.classList.remove("active")
  }
})

document.getElementById("uploadContentModal").addEventListener("click", function (e) {
  if (e.target === this) {
    this.classList.remove("active")
  }
})

document.addEventListener("DOMContentLoaded", () => {
  const inventoryNav = document.getElementById('inventoryLink')
  if (inventoryNav) inventoryNav.style.display = "none"
  loadInventory()
  // Declare or import updateVendorMenu here if necessary
  // For example: const updateVendorMenu = () => { /* implementation */ }
  // updateVendorMenu()
})

// Tab switching logic
const tabInventoryBtn = document.getElementById('tabInventory')
const tabContentBtn = document.getElementById('tabContent')
const inventorySection = document.getElementById('inventorySection')
const contentSection = document.getElementById('contentSection')
const addContentButton = document.getElementById('uploadContentBtn')
const addProductBtn = document.getElementById("addProductBtn")

function activateTab(tabName) {
  if (tabName === 'inventory') {
    tabInventoryBtn?.classList.add('active')
    tabContentBtn?.classList.remove('active')
    inventorySection?.classList.remove('hidden')
    contentSection?.classList.add('hidden')
    addContentButton.style.display = "none"
    addProductBtn.style.display = "flex"
    // ensure inventory data is current
    loadInventory()
  } else if (tabName === 'content') {
    tabInventoryBtn?.classList.remove('active')
    tabContentBtn?.classList.add('active')
    inventorySection?.classList.add('hidden')
    contentSection?.classList.remove('hidden')
    addContentButton.style.display = "flex"
    addProductBtn.style.display = "none"

    // load content assets
    loadContent()
  }
}

if (tabInventoryBtn) tabInventoryBtn.addEventListener('click', () => activateTab('inventory'))
if (tabContentBtn) tabContentBtn.addEventListener('click', () => activateTab('content'))

// Basic content loader — fetches user's content and renders cards in contentsGrid
async function loadContent() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  const grid = document.getElementById('contentsGrid')
  if (!grid) return

  // Show a loading placeholder
  grid.innerHTML = `<div class="empty-inventory" style="grid-column: 1/-1;"><p class="empty-text">Loading content...</p></div>`

  if (!currentUser || !currentUser.access) {
    window.location.href='login.html'
    return
  }

    try {
    const res = await fetch(`https://upstartpy.onrender.com/customers/mycontents/?_=${new Date().getTime()}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${currentUser.access}` }
    })
    if (!res.ok) throw new Error('Failed to fetch')
    const items = await res.json()
    if (!Array.isArray(items) || items.length === 0) {
      grid.innerHTML = `<div class="empty-inventory" style="grid-column: 1/-1;"><div class="empty-icon">🎬</div><p class="empty-text">No content yet. Click "+ Add Content" to add your first piece of content.</p></div>`
      return
    }
    // expose items to the global scope so we can safely reference them from inline
    // onclick handlers without embedding the entire array into the HTML string,
    // which previously caused a "missing ] after element list" SyntaxError.
    window._contentItems = items

    grid.innerHTML = items.map((it, index) => {
      return `
        <div class="product-card fade-in">
          <div class="video-container" onclick="initVideoViewer(window._contentItems, ${index})">
            <video src="${it.video || '#'}" class="video-player-preview"></video>
          </div>
          <div class="product-card-body">
            <div class="product-card-name">${it.caption || 'Untitled'}</div>
          </div>
        </div>
      `
    }).join('')

  } catch (err) {
    console.error('Error loading content', err)
    grid.innerHTML = `<div class="empty-inventory" style="grid-column: 1/-1;"><p class="empty-text">Failed to load content.</p></div>`
  }
}

// --- Content video (single file) preview and handling ---
// Keep track of currently selected content video file and its object URL
let _contentVideoFile = null
let _contentVideoURL = null

const contentVideoInput = document.getElementById('contentVideo')
const contentVideoPreviewContainer = document.getElementById('contentVideoPreview')

function renderContentVideoPreview(file) {
  clearContentVideoPreview()
  if (!file || !contentVideoPreviewContainer) return

  const url = URL.createObjectURL(file)
  _contentVideoURL = url

  const wrapper = document.createElement('div')
  wrapper.className = 'content-video-preview'

  const video = document.createElement('video')
  video.controls = true
  video.src = url
  video.className = 'preview-video-player'
  video.style.maxWidth = '100%'
  video.style.display = 'block'
  wrapper.appendChild(video)

  const info = document.createElement('div')
  info.className = 'video-info'
  info.textContent = `${file.name} — ${(file.size / 1024 / 1024).toFixed(2)} MB`
  wrapper.appendChild(info)

  const removeBtn = document.createElement('button')
  removeBtn.type = 'button'
  removeBtn.className = 'btn-secondary'
  removeBtn.textContent = 'Remove'
  removeBtn.addEventListener('click', () => {
    if (contentVideoInput) contentVideoInput.value = ''
    _contentVideoFile = null
    clearContentVideoPreview()
  })
  wrapper.appendChild(removeBtn)

  contentVideoPreviewContainer.appendChild(wrapper)
  // hide the video upload area while a video is present
  toggleContentUploadVisibility(false)
}

function clearContentVideoPreview() {
  if (!contentVideoPreviewContainer) return
  contentVideoPreviewContainer.innerHTML = ''
  if (_contentVideoURL) {
    try { URL.revokeObjectURL(_contentVideoURL) } catch (e) {}
    _contentVideoURL = null
  }
  // ensure upload area is visible when preview is cleared
  toggleContentUploadVisibility(true)
}

if (contentVideoInput) {
  contentVideoInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) {
      _contentVideoFile = null
      clearContentVideoPreview()
      return
    }

    // Accept only the first file if user selected multiple
    const file = files[0]
    _contentVideoFile = file

    // Ensure the input's FileList contains only the first file
    try {
      const dt = new DataTransfer()
      dt.items.add(file)
      contentVideoInput.files = dt.files
    } catch (err) {
      // ignore if browser disallows assigning FileList
    }

    renderContentVideoPreview(file)
  })
}

function toggleContentUploadVisibility(show) {
  // find the nearest form-group container and toggle its .video-upload child
  if (!contentVideoPreviewContainer) return
  const group = contentVideoPreviewContainer.closest('.form-group')
  if (!group) return
  const upload = group.querySelector('.video-upload')
  if (!upload) return
  if (show) {
    upload.classList.remove('hidden')
    upload.style.display = ''
  } else {
    upload.classList.add('hidden')
    upload.style.display = 'none'
  }
}

// Handle upload modal form submit (UI-level: validates and collects single video)
const uploadModalForm = document.getElementById('uploadModalForm')
if (uploadModalForm) {
  uploadModalForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Show loading modal
    const loadingModal = document.getElementById("loadingModal");
    loadingModal.classList.remove("hide");
    loadingModal.classList.add("show");
    loadingModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("loading-active");

    const caption = document.getElementById('caption')?.value?.trim() || '';
    
    if (!caption) {
      hideLoadingModal();
      alert('Please enter a title and description for your content.');
      return;
    }
    
    // Get current user
    const currentUser = JSON.parse(localStorage.getItem("userData"));
    if (!currentUser?.access) {
      hideLoadingModal();
      alert('Authentication required. Please log in.');
      window.location.href = "login.html"
      return;
    }
    
    // Build FormData
    const formData = new FormData();
    formData.append('caption', caption);
    // formData.append('description', description);
    
    if (_contentVideoFile) {
      formData.append('video', _contentVideoFile);
    }
    
    try {
      const response = await fetch('https://upstartpy.onrender.com/customers/content/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.access}`
        },
        body: formData
      });
      
      if (!response.ok) {
        hideLoadingModal();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload content');
      }
      
      hideLoadingModal();
      showToast('Content added successfully!', 'success'); // Use showToast instead of alert for better UX
      uploadModalForm.reset()
      if (contentVideoInput) contentVideoInput.value = ''
      _contentVideoFile = null
      clearContentVideoPreview()
      document.getElementById('uploadContentModal')?.classList.remove('active')
      
      // Refresh content list
      loadContent()
      
    } catch (error) {
      hideLoadingModal();
      console.error('Upload error:', error);
      alert(error.message || 'An error occurred while uploading. Please try again.');
    }
  })
}

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

