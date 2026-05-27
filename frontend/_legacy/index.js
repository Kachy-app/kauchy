// Toast notification utility function
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

  const close = document.createElement('button');
  close.className = 'close-btn';
  close.type = 'button';
  close.textContent = '×';
  close.style.marginLeft = '12px';
  close.style.background = 'none';
  close.style.border = 'none';
  close.style.color = 'white';
  close.style.cursor = 'pointer';
  close.style.fontSize = '20px';
  close.addEventListener('click', () => dismiss());
  toast.appendChild(close);

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

// Global variable to store all products for filtering
let allProducts = [];
let currentCategory = 'all';
let currentSearchQuery = '';

// Pagination variables
let currentPage = 1;
let itemsPerPage = 40; // Approx 10 rows on desktop (4 columns)
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  let headers = {"Content-Type":"application/json"}
  if (currentUser) {
    headers = {
      "Content-Type":"application/json",
      "Authorization": `Bearer ${currentUser.access}`
    }
  }
  console.log(headers)

  try{
    const response = await fetch('https://upstartpy.onrender.com/products/',{
      method: "GET",
      headers: headers
    });

    if (!response.ok){
      const error = await response.json();
      console.error('Error loading products:', response.status, error);
      showToast(`Failed to load products: ${error.detail || 'Unknown error'}`, 'error');
      await hideLoadingModal();
      return;
    }

    const products = await response.json();
    if (!products || products.length === 0) {
      console.warn('No products returned from server');
    } else {
      console.log('Products loaded successfully:', products.length, 'items');
    }
    
  // Store products globally for filtering
  allProducts = products;
  filteredProducts = products;
  
  renderProducts();
  renderPagination();
  // Wait for skeletons to fade out and be removed, then trigger product fade-ins
  await hideLoadingModal();
  const cards = Array.from(document.querySelectorAll('.product-card'));
  cards.forEach((card, idx) => setTimeout(() => card.classList.add('fade-in'), idx * 50));

  // Initialize category filters
  initializeCategoryFilters();
  
  // Initialize search functionality
  initializeSearch();

  }catch(error){
    console.error('Error loading products (index.js):', error);
    showToast('Failed to load products. Please check your connection and try again.', 'error');
    await hideLoadingModal();
  }

  // Check for productId in URL to auto-open modal
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('productId');
  if (productId) {
      openProductModal(productId);
  }

})

// function renderProducts(products = null) {
//   const allProducts = products || JSON.parse(localStorage.getItem("products")) || []
//   const grid = document.getElementById("productsGrid")

//   grid.innerHTML = allProducts
//     .map((product) => {
//       const vendor = getVendor(product.vendorId)
//       return `
//             <div class="product-card" onclick="openProductModal(${product.id})">
//                 <img src="${product.images[0]}" alt="${product.name}" class="product-image">
//                 <div class="product-card-body">
//                     <div class="product-card-name">${product.name}</div>
//                     <div class="product-card-price">$${product.price}</div>
//                     <div class="product-card-vendor">${vendor?.name || "Unknown"}</div>
//                     <div class="product-card-location">📍 ${product.location}</div>
//                 </div>
//             </div>
//         `
//     })
//     .join("")
// }

function renderProducts() {
  const productGrid = document.getElementById("productsGrid");
  
  // Clear existing products and any "no products" messages
  const existingProducts = productGrid.querySelectorAll('.product-card');
  existingProducts.forEach(card => card.remove());
  
  // Remove any existing "no products found" message
  const existingMessage = productGrid.querySelector('p');
  if (existingMessage) {
    existingMessage.remove();
  }

  if (!filteredProducts || filteredProducts.length === 0) {
    const message = document.createElement('p');
    message.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;';
    message.textContent = 'No products found matching your criteria.';
    productGrid.appendChild(message);
    
    // Hide pagination if no products
    document.getElementById('paginationContainer').style.display = 'none';
    return;
  }

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

  productsToDisplay.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openProductModal(item.id);
    card.innerHTML = `
      <img src="${item.image_url[0]}" alt="${item.product_name}" class="product-image">
      <div class="product-card-body">
        <div class="product-card-name">${item.product_name}</div>
        <div class="product-card-price">₦${item.price}</div>
        <div class="product-card-vendor">${item.vendor_username}</div>
        <div class="product-card-location">📍 ${item.institute}</div>
      </div>
    `;
    productGrid.appendChild(card);
  });

  // Show pagination if there are products
  if (filteredProducts.length > itemsPerPage) {
    document.getElementById('paginationContainer').style.display = 'flex';
  } else {
    document.getElementById('paginationContainer').style.display = 'none';
  }

  // Scroll to top when page changes
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Trigger animation for new cards
  const newCards = productGrid.querySelectorAll('.product-card');
  newCards.forEach((card, idx) => {
    setTimeout(() => {
      card.classList.add('fade-in');
    }, idx * 50);
  });
}

// Render pagination controls
function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginationContainer = document.getElementById('paginationContainer');
  const paginationPages = document.getElementById('paginationPages');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  console.log('Pagination Debug:', {
    totalProducts: filteredProducts.length,
    itemsPerPage: itemsPerPage,
    totalPages: totalPages,
    currentPage: currentPage,
    containerExists: !!paginationContainer
  });

  // Show or hide pagination based on number of products
  if (!filteredProducts || filteredProducts.length <= itemsPerPage) {
    if (paginationContainer) {
      paginationContainer.style.display = 'none';
    }
    return;
  } else {
    if (paginationContainer) {
      paginationContainer.style.display = 'flex';
    }
  }

  // Clear existing page numbers
  if (paginationPages) {
    paginationPages.innerHTML = '';
  }

  // Update prev/next buttons
  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  }

  // Event listeners for prev/next buttons
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts();
      renderPagination();
    }
  };

  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts();
      renderPagination();
    }
  };

  // Generate page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust start if we're near the end
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Show first page if not visible
  if (startPage > 1) {
    addPageButton(1);
    if (startPage > 2) {
      addEllipsis();
    }
  }

  // Show page numbers
  for (let i = startPage; i <= endPage; i++) {
    addPageButton(i);
  }

  // Show last page if not visible
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      addEllipsis();
    }
    addPageButton(totalPages);
  }
}

function addPageButton(pageNum) {
  const paginationPages = document.getElementById('paginationPages');
  const pageBtn = document.createElement('button');
  pageBtn.className = 'pagination-page';
  pageBtn.textContent = pageNum;
  
  if (pageNum === currentPage) {
    pageBtn.classList.add('active');
  }
  
  pageBtn.onclick = () => {
    currentPage = pageNum;
    renderProducts();
    renderPagination();
  };
  
  paginationPages.appendChild(pageBtn);
}

function addEllipsis() {
  const paginationPages = document.getElementById('paginationPages');
  const ellipsis = document.createElement('span');
  ellipsis.className = 'pagination-ellipsis';
  ellipsis.textContent = '...';
  paginationPages.appendChild(ellipsis);
}

// Open product modal
async function openProductModal(productId) {
  const currentUser = JSON.parse(localStorage.getItem('userData'))
  const headers = {
    "Content-Type": "application/json"
  };
  
  if (currentUser) {
    headers["Authorization"] = `Bearer ${currentUser.access}`;
  }
  
  try {
    const response = await fetch(`https://upstartpy.onrender.com/products/${productId}`,
      {
        method: "GET",
        headers
      }
    )

    if (!response.ok) {
      console.error('Error fetching product details:', response.status);
      showToast('Failed to load product details. Please try again.', 'error');
      return;
    }

    const product = await response.json();
    if (!product) {
      console.error('No product data received');
      showToast('Product not found.', 'error');
      return;
    }

    console.log('Product loaded successfully:', product.id);

    // Store product ID in modal for button actions
    document.getElementById("productModal").dataset.productId = productId

    // Update modal content
    document.getElementById("productName").textContent = product.product_name
    document.getElementById("productPrice").textContent = `₦${product.price}`
    document.getElementById("productDescription").textContent = product.description
    document.getElementById("productLocation").textContent = product.institute
    document.getElementById("productCategory").textContent = product.category
    document.getElementById("quantityAvailable").textContent = product.quantity
    document.getElementById("viewCount").textContent = product.view_count
    document.getElementById("productRating").textContent =
      "★".repeat(Math.round(product.rating)) + "☆".repeat(5 - Math.round(product.rating))

    // Handle Product Images
    const mainImage = document.getElementById("galleryMainImage")
    const thumbnailsContainer = document.getElementById("galleryThumbnails")
    
    // Reset images
    mainImage.src = "/placeholder.svg"
    thumbnailsContainer.innerHTML = ""

    if (product.image_url && product.image_url.length > 0) {
      // Set main image
      mainImage.src = product.image_url[0]
      
      // Create thumbnails if there are multiple images
      if (product.image_url.length > 1) {
        product.image_url.forEach((url, index) => {
          const thumb = document.createElement("img")
          thumb.src = url
          thumb.className = index === 0 ? "thumbnail active" : "thumbnail"
          thumb.onclick = () => {
            mainImage.src = url
            // Update active state
            document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"))
            thumb.classList.add("active")
          }
          thumbnailsContainer.appendChild(thumb)
        })
      }
    }

    // Load vendor details
      document.getElementById('vendorImage').src = product.pfp
      document.getElementById("vendorName").textContent = product.vendor_username
      document.getElementById("vendorRating").textContent =
        "★".repeat(Math.round(product.vendor_rating)) + "☆".repeat(5 - Math.round(product.vendor_rating))
      // document.getElementById("vendorProductsCount").textContent = vendor.products_count
    // Setup Share Product Button
    const shareProductBtn = document.getElementById("shareProductBtn")
    if (shareProductBtn) {
      shareProductBtn.onclick = () => {
        // Construct URL with productId parameter
        const shareUrl = new URL(window.location.href)
        shareUrl.searchParams.set("productId", product.id)
        
        if (navigator.share) {
          navigator.share({
            title: `Check out ${product.product_name} on Upstart`,
            text: `I found this amazing ${product.product_name} on Upstart. Check it out!`,
            url: shareUrl.toString(),
          })
          .then(() => showToast('Product shared successfully!', 'success'))
          .catch((error) => console.log('Error sharing:', error));
        } else {
          navigator.clipboard.writeText(shareUrl.toString())
            .then(() => showToast('Product link copied to clipboard!', 'success'))
            .catch(() => showToast('Failed to copy link', 'error'));
        }
      }
    }

    // Handle add to cart
    const addToCartBtn = document.getElementById("addToCartBtn")
    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        addToCartFromModal(productId);
      })
    }

    const contactVendorBtn = document.getElementById("contactVendorBtn")
    if (contactVendorBtn) {
      contactVendorBtn.onclick = async () => {
        console.log("[v0] Contact vendor clicked, vendorId:", product.vendor_id)
        if (!currentUser){
          showToast("Please log in to contact vendor", "error");
          window.location.href='login.html';
          return;
        }
        try{
          const response = await fetch(`https://upstartpy.onrender.com/chat/create/${product.vendor_id}`,{
            method: 'POST',
            headers: {
              "Authorization":`Bearer ${currentUser.access}`,
              "Content-Type":"application/json"
            }
          })
          if (!response.ok){
            const error = await response.json();
            console.error('Error creating conversation:', response.status, error)
            showToast(error.message || 'Failed to create conversation', 'error');
            return
          }
          window.location.href = `chat.html`
        }catch(error){
          console.error('Error contacting vendor:', error);
          showToast('Failed to contact vendor. Please try again.', 'error');
        }
      }
    }

    const viewVendorBtn = document.getElementById("viewVendorBtn")
    if (viewVendorBtn) {
      viewVendorBtn.onclick = () => {
        console.log("[v0] View vendor clicked, vendorId:", product.vendor_id)
        window.location.href = `vendor-profile.html?vendorId=${product.vendor_id}`
      }
    }

    document.getElementById("productModal").classList.add("active")
    const modalContent = document.querySelector(".modal-content");
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  } catch(error) {
    console.error('Error opening product modal:', error);
    await hideLoadingModal();
    showToast('An unexpected error occurred. Please try again.', 'error');
  }
}

// Close product modal
function closeProductModal() {
  console.log("[v0] Closing product modal")
  document.getElementById("productModal").classList.remove("active")
}

// Add to cart
// function addToCart(productId) {
//   const cart = JSON.parse(localStorage.getItem("cart")) || []
//   const existingItem = cart.find((item) => item.productId === productId)

//   if (existingItem) {
//     existingItem.quantity += 1
//   } else {
//     cart.push({ productId, quantity: 1 })
//   }

//   localStorage.setItem("cart", JSON.stringify(cart))

//   // Show notification
//   alert("Product added to cart!")
//   closeProductModal()
// }




// Chat functionality
const chatMessages = [
  "Hi there! I'm Upstart Assistant. How can I help you?",
  "Looking for something specific? Try using the search bar!",
  "Need help with payment? Visit our wallet page.",
  "Want to sell? Create a vendor account!",
  "Check out our leaderboard for top sellers and products.",
  "Having trouble? Contact our support team.",
]

const chatIndex = 0

const chatBubbleBtn = document.getElementById("chatBubbleBtn")
const chatWidget = document.getElementById("chatWidget")
if (chatBubbleBtn && chatWidget) {
  chatBubbleBtn.addEventListener("click", () => {
    chatWidget.classList.toggle("active")
  })
}

const closeChatWidgetBtn = document.getElementById("closeChatWidget")
if (closeChatWidgetBtn && chatWidget) {
  closeChatWidgetBtn.addEventListener("click", () => {
    chatWidget.classList.remove("active")
  })
}

const chatSendBtn = document.getElementById("chatSendBtn")
if (chatSendBtn) {
  chatSendBtn.addEventListener("click", () => {
    const input = document.getElementById("chatInput")
    const message = input?.value?.trim()

    if (!message) return

    const chatMessages = document.getElementById("chatMessages")
    if (!chatMessages) return

    // Add user message
    const userMsg = document.createElement("div")
    userMsg.className = "message user-message"
    userMsg.innerHTML = `<p>${message}</p>`
    chatMessages.appendChild(userMsg)

    if (input) input.value = ""

    // Add bot response
    setTimeout(() => {
      const botMsg = document.createElement("div")
      botMsg.className = "message bot-message"
      const responses = [
        "Great question! I'll help with that.",
        "That's a popular item!",
        "Let me assist you with that.",
        "I understand. What else can I help with?",
        "Anything else I can help you with?",
      ]
      botMsg.innerHTML = `<p>${responses[Math.floor(Math.random() * responses.length)]}</p>`
      chatMessages.appendChild(botMsg)
      chatMessages.scrollTop = chatMessages.scrollHeight
    }, 500)

    chatMessages.scrollTop = chatMessages.scrollHeight
  })
}

// Modal close on ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeProductModal()
  }
})

const productModalEl = document.getElementById("productModal")
if (productModalEl) {
  productModalEl.addEventListener("click", function (e) {
    if (e.target === this) {
      console.log("[v0] Overlay clicked, closing modal")
      closeProductModal()
    }
  })
}

const closeBtn = document.getElementById("closeProductModal")
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    console.log("[v0] Close button clicked")
    closeProductModal()
  })
}


// Chat helper function
function openChat(vendorId) {
  localStorage.setItem("selectedVendor", JSON.stringify(vendorId))
  window.location.href = "chat.html"
}

async function addToCartFromModal(productId) {
  const userData = JSON.parse(localStorage.getItem("userData"));

  if(!userData) {
    showToast('Please log in to add items to cart', 'error');
    window.location.href = "login.html";
    return;
  }

  try{
    const response = await fetch(`https://upstartpy.onrender.com/cart/cart-items/${productId}`,
      {
        method: "POST",
        headers: {
          "Content-Type":"application/json",
          "Authorization": `Bearer ${userData.access}`
        }
    });

    if (!response.ok){
      if(response.status === 401){
        showToast('Session expired. Please log in again.', 'error');
        window.location.href = "login.html";
        return;
      }
      const error = await response.json();
      console.error('Error adding to cart:', response.status, error);
      showToast(error.detail || 'Failed to add item to cart', 'error');
      return;
    }
    
    showToast('Item added to cart!', 'success');
    // Update cart badge
    const badge = document.getElementById("cartBadge")
    if (badge) {
      badge.textContent++;
    }
  }catch(error){
    console.error('Error adding to cart:', error);
    showToast('Failed to add item to cart. Please try again.', 'error');
  }

  closeProductModal()
}

// Helper function to hide loading modal with exit animation
function hideLoadingModal() {
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

// Initialize category filters
function initializeCategoryFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Get selected category
      currentCategory = button.dataset.category;
      
      // Apply filters
      applyFilters();
    });
  });
}

// Initialize search functionality
function initializeSearch() {
  const searchInput = document.getElementById('sharedSearchInput');
  
  if (!searchInput) {
    console.warn('Search input not found');
    return;
  }
  
  // Add event listener with debounce
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    currentSearchQuery = e.target.value.toLowerCase().trim();
    
    // Debounce search by 300ms
    searchTimeout = setTimeout(() => {
      applyFilters();
    }, 300);
  });
}

// Apply both category and search filters
function applyFilters() {
  let filtered = [...allProducts];
  
  // Apply category filter
  if (currentCategory !== 'all') {
    filtered = filtered.filter(product => 
      product.category.toLowerCase() === currentCategory.toLowerCase()
    );
  }
  
  // Apply search filter
  if (currentSearchQuery) {
    filtered = filtered.filter(product => {
      const searchableText = [
        product.product_name,
        product.description,
        product.vendor_username,
        product.category,
        product.institute
      ].join(' ').toLowerCase();
      
      return searchableText.includes(currentSearchQuery);
    });
  }
  
  // Update filtered products and reset to first page
  filteredProducts = filtered;
  currentPage = 1;
  
  // Re-render products and pagination
  renderProducts();
  renderPagination();
}

