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

// Helper function to remove vendor header skeleton
function removeHeaderSkeleton() {
  const headerSkeleton = document.querySelector('.vendor-header-skeleton');
  const profileContent = document.getElementById('vendorProfileContent');
  
  if (headerSkeleton) {
    headerSkeleton.classList.add('fade-out');
    // We delay removal to let the animation play, 
    // BUT we show the new content immediately (overlapping) or right after?
    // A cross-fade is best: show new content (opacity 0->1), hide skeleton (opacity 1->0) simultaneously.
    
    // Position absolute trick might be needed for perfect cross-fade, 
    // or just let them stack for a moment (looks okay if fast).
    
    setTimeout(() => {
      headerSkeleton.remove();
    }, 350);
  }
  
  if (profileContent) {
    profileContent.style.display = 'block';
    // Use requestAnimationFrame to ensure the display change is painted before changing opacity
    requestAnimationFrame(() => {
      // Small timeout to ensure transition triggers
      setTimeout(() => {
        profileContent.style.opacity = '1';
      }, 50);
    });
  }
}

const params = new URLSearchParams(window.location.search)
const vendorId = Number.parseInt(params.get("vendorId"))

async function loadVendorProfile() {
  try{
    const response = await fetch(`https://upstartpy.onrender.com/auth/user/${vendorId}`,{
      method: "GET",
      headers: {
        "Content-Type":"application/json",
      }
    })

    if (!response.ok) {
      console.error('Error fetching vendor profile:', response.status);
      showToast('Failed to load vendor profile. Please try again.', 'error');
      hideLoadingModal();
      return;
    }

    const vendor = await response.json()
    console.log('Vendor profile loaded:', vendor.info?.username);

    if (!vendor || !vendor.info) {
      console.error('Invalid vendor data');
      showToast('Vendor not found.', 'error');
      hideLoadingModal();
      return;
    }

    // // Use vendor profile picture if available, otherwise use a default placeholder (not the logo)
    // const profileImage = vendor.info.profile_url || "https://icuklzexzhusblkzglnr.supabase.co/storage/v1/object/public/marketplace/logo/Upstart(2).png"; 
    
    // // Update Open Graph meta tags for link sharing
    const titleText = `${vendor.info.username} - Vendor Profile | Upstart`;
    // const bioText = vendor.info.bio || `Check out ${vendor.info.username}'s profile on Upstart`;
    
    // document.getElementById("ogTitle")?.setAttribute('content', titleText);
    // document.getElementById("ogImage")?.setAttribute('content', profileImage);
    // document.getElementById("ogUrl")?.setAttribute('content', window.location.href);
    // document.getElementById("ogDescription")?.setAttribute('content', bioText);
    
    // // Update Twitter Card meta tags as well
    // document.getElementById("twitterTitle")?.setAttribute('content', titleText);
    // document.getElementById("twitterImage")?.setAttribute('content', profileImage);
    // document.getElementById("twitterDescription")?.setAttribute('content', bioText);
    
    // // If we have an actual profile image, use summary_large_image, otherwise use summary
    // if (vendor.info.profile_url) {
    //   document.getElementById("twitterCard")?.setAttribute('content', 'summary_large_image');
    // }
    
    // Also update the page title dynamically
    document.title = titleText;


    document.getElementById("vendorName").textContent = vendor.info.username
    document.getElementById("vendorUniversity").textContent = vendor.info.institute
    if (document.getElementById("vendorEmail")) {
        document.getElementById("vendorEmail").textContent = vendor.info.email
    }
    if (document.getElementById("vendorPhone")) {
        document.getElementById("vendorPhone").textContent = vendor.info.phone
    }
    if(document.getElementById("vendorDepartment") && vendor.info.department){
        document.getElementById("vendorDepartment").textContent = vendor.info.department
    }
    document.getElementById("vendorBio").textContent = vendor.info.bio
    document.getElementById("vendorImage").src = vendor.info.profile_url || "/placeholder.svg?height=120&width=120"
    document.getElementById("totalSales").textContent = vendor.sales || 0
    document.getElementById("avgRating").textContent = (vendor.info.rating || 0).toFixed(1)
    document.getElementById("vendorRating").textContent =
      "★".repeat(Math.round(vendor.info.rating || 0)) + "☆".repeat(5 - Math.round(vendor.info.rating || 0))
      
    // Setup Share Button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.onclick = async () => {
            if (navigator.share) {
                try {
                    const shareData = {
                        title: `${vendor.info.username}'s Profile - Upstart`,
                        url: `https://upstartpy.onrender.com/vendor-profile?vendorId=${vendorId}`
                    };

                    // try {
                    //     const imgUrl = vendor.info.profile_url || profileImage;
                    //     if (imgUrl) {
                    //         const response = await fetch(imgUrl);
                    //         const blob = await response.blob();
                    //         const file = new File([blob], 'vendor-profile.png', { type: blob.type });
                            
                    //         if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    //             shareData.files = [file];
                    //         }
                    //     }
                    // } catch (e) {
                    //      console.warn('Could not fetch image for sharing', e);
                    // }

                    await navigator.share(shareData);
                    showToast('Profile shared successfully!', 'success');
                } catch (error) {
                    if (error.name !== 'AbortError') console.log('Error sharing:', error);
                }
            } else {
                // Fallback for browsers that don't support Web Share API
                navigator.clipboard.writeText(`https://upstartpy.onrender.com/vendor-profile?vendorId=${vendorId}`)
                    .then(() => showToast('Profile link copied to clipboard!', 'success'))
                    .catch(() => showToast('Failed to copy link', 'error'));
            }
        };
    }

    removeHeaderSkeleton()
    
    loadVendorProducts(vendorId)
    loadVendorVideos()
    hideLoadingModal()
  }catch(error){
    console.error('Error loading vendor profile:', error);
    showToast('Failed to load vendor profile. Check your connection.', 'error');
    removeHeaderSkeleton()
    hideLoadingModal();
  }
}

async function loadVendorProducts(vendorId) {
  try{
    const response = await fetch(`https://upstartpy.onrender.com/products/vendor-products/${vendorId}`, {
      method: "GET",
      headers: {
        "Content-Type":"application/json",
      }
    })

    if (!response.ok) {
      console.error('Error fetching vendor products:', response.status);
      showToast('Failed to load vendor products.', 'error');
      hideLoadingModal();
      return;
    }

    const vendorProducts = await response.json()
    console.log('Vendor products loaded:', vendorProducts?.length || 0, 'items');
    
    document.getElementById("productCount").textContent = vendorProducts?.length || 0

    const grid = document.getElementById("productsGrid")

    if (!vendorProducts || vendorProducts.length === 0) {
      removeSkeletonLoaders()
      grid.innerHTML =
        '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No products listed yet</p>'
      hideLoadingModal();
      return
    }

    // Remove skeletons before rendering
    await removeSkeletonLoaders()

    grid.innerHTML = vendorProducts
    .map(
      (product) => `
          <div class="product-card" onclick="openProductModal(${product.id})">
              <img src="${product.image_url?.[0] || '/placeholder.svg'}" alt="${product.product_name}" class="product-image" onerror="this.src='/placeholder.svg'">
              <div class="product-card-body">
                  <div class="product-card-name">${product.product_name}</div>
                  <div class="product-card-price">₦${product.price}</div>
              </div>
          </div>
      `,
      )
      .join("")
      
    // Trigger fade-in animation
    const cards = Array.from(document.querySelectorAll('.product-card'));
    cards.forEach((card, idx) => setTimeout(() => card.classList.add('fade-in'), idx * 50));
    
    hideLoadingModal();
  }catch(error){
    console.error('Error loading vendor products:', error);
    showToast('Failed to load vendor products. Check your connection.', 'error');
    
    removeSkeletonLoaders()
    const grid = document.getElementById("productsGrid")
    if (grid) {
      grid.innerHTML = `
        <div class="empty-inventory" style="grid-column: 1/-1;">
          <div class="empty-icon">⚠️</div>
          <p class="empty-text">Failed to load products. Please refresh the page.</p>
        </div>
      `;
    }
    hideLoadingModal();
  }
}

function loadVendorVideos() {
  const products = JSON.parse(localStorage.getItem("products")) || []
  const vendorProducts = products.filter((p) => p.vendorId === vendorId && p.videoUrl)

  const videosSection = document.getElementById("videosSection")
  const videosGrid = document.getElementById("videosGrid")

  // If section doesn't exist, exit quietly
  if (!videosSection || !videosGrid) return

  if (vendorProducts.length === 0) {
    videosSection.style.display = "none"
    return
  }

  videosSection.style.display = "block"

  videosGrid.innerHTML = vendorProducts
    .map(
      (product, index) => `
        <div class="video-card" data-video-index="${index}">
            <div class="video-container">
                <video src="${product.videoUrl}" class="video-player-preview"></video>
                <div class="video-overlay">
                    <span class="video-play-icon">▶️</span>
                    <span class="video-title">${product.name}</span>
                </div>
            </div>
            <div class="video-stats">
                <div class="video-stat">
                    <span class="stat-icon">❤️</span>
                    <span>${product.likes || 0} Likes</span>
                </div>
                <div class="video-stat">
                    <span class="stat-icon">👁️</span>
                    <span>${product.viewCount || 0} Views</span>
                </div>
                <div class="video-stat">
                    <span class="stat-icon">💬</span>
                    <span>${product.comments ? product.comments.length : 0} Comments</span>
                </div>
            </div>
        </div>
    `,
    )
    .join("")

  // Add event listeners to video cards
  document.querySelectorAll(".video-card").forEach((card) => {
    card.addEventListener("click", () => {
      const index = parseInt(card.dataset.videoIndex)
      initVideoViewer(vendorProducts, index)
    })
  })
}

// Load vendor's content (videos posted by the vendor)
async function loadVendorContent() {
  const grid = document.getElementById('contentsGrid')
  if (!grid) return

  // Show a loading placeholder
  grid.innerHTML = `<div class="empty-inventory" style="grid-column: 1/-1;"><p class="empty-text">Loading content...</p></div>`


  try {
    // Fetch content posted by this specific vendor
    const res = await fetch(`https://upstartpy.onrender.com/customers/vendorcontents/${vendorId}`, {
      method: 'GET',
    })
    if (!res.ok) throw new Error('Failed to fetch')
    const items = await res.json()
    if (!Array.isArray(items) || items.length === 0) {
      grid.innerHTML = `<div class="empty-inventory" style="grid-column: 1/-1;"><div class="empty-icon">🎬</div><p class="empty-text">No content available from this vendor.</p></div>`
      hideLoadingModal()
      return
    }
    // expose items to the global scope so we can safely reference them from inline
    // onclick handlers without embedding the entire array into the HTML string,
    // which previously caused a "missing ] after element list" SyntaxError.
    window._vendorContentItems = items

    grid.innerHTML = items.map((it, index) => {
      return `
        <div class="product-card fade-in">
          <div class="video-container" onclick="initVideoViewer(window._vendorContentItems, ${index})">
            <video src="${it.video || '#'}" class="video-player-preview"></video>
          </div>
          <div class="product-card-body">
            <div class="product-card-name">${it.caption || 'Untitled'}</div>
          </div>
        </div>
      `
    }).join('')
    hideLoadingModal()

  } catch (err) {
    hideLoadingModal()
    console.error('Error loading vendor content', err)
    grid.innerHTML = `<div class="empty-inventory" style="grid-column: 1/-1;"><p class="empty-text">Failed to load content.</p></div>`
  }
}

async function openProductModal(productId) {
  const currentUser = JSON.parse(localStorage.getItem('userData'))
  const headers = {
    "Content-Type": "application/json"
  };
  
  if (currentUser) {
    headers["Authorization"] = `Bearer ${currentUser.access}`;
  }
  const response = await fetch(`https://upstartpy.onrender.com/products/${productId}`,
    {
      method: "GET",
      headers
    }
  )

  const product = await response.json();

  if (!product) return

  document.getElementById("productName").textContent = product.product_name || product.name
  document.getElementById("productPrice").textContent = `₦${product.price}`
  document.getElementById("productDescription").textContent = product.description
  document.getElementById("productLocation").textContent = product.institute
  document.getElementById("quantityAvailable").textContent = product.quantity
  document.getElementById("viewCount").textContent = product.view_count || 0
  document.getElementById("productCategory").textContent = product.category || 'N/A'
  document.getElementById("productRating").textContent = 
    "★".repeat(Math.round(product.rating || 0)) + "☆".repeat(5 - Math.round(product.rating || 0))

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
  
  // Setup Share Product Button
  const shareProductBtn = document.getElementById("shareProductBtn")
  if (shareProductBtn) {
    shareProductBtn.onclick = () => {
      // Construct URL with productId parameter
      const shareUrl = new URL(window.location.href)
      shareUrl.searchParams.set("productId", product.id)
      
      // Keep vendorId if present so the product opens in context of the vendor profile
      // It's already in window.location.href, so it stays unless we remove it.

      if (navigator.share) {
        navigator.share({
          title: `Check out ${product.name} on Upstart`,
          text: `I found this amazing ${product.name} on Upstart. Check it out!`,
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

  document.getElementById("addToCartBtn").onclick = async () => {
    const userData = JSON.parse(localStorage.getItem("userData"));

    if(!userData) {
      window.location.href = "login.html";
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
          window.location.href = "login.html";
        }
        return;
      }
      alert(`Added to cart!`);
      // Update cart badge
      const badge = document.getElementById("cartBadge")
      if (badge) {
        badge.textContent ++;
      }
    }catch(error){

    }
    closeProductModal()
  }

  document.getElementById("productModal").classList.add("active")
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("active")
}

// Helper function to hide loading modal with exit animation
function hideLoadingModal() {
  const loadingModal = document.getElementById("loadingModal");
  if (!loadingModal) return;
  
  loadingModal.classList.remove("show");
  loadingModal.classList.add("hide");
  loadingModal.setAttribute("aria-hidden", "true");
  
  // Remove hide class after animation completes
  setTimeout(() => {
    loadingModal.classList.remove("hide");
    document.body.classList.remove("loading-active");
  }, 600);
}

document.getElementById('contactBtn').addEventListener('click', async() => {
  const currentUser = JSON.parse(localStorage.getItem('userData'))
  if (!currentUser){
    showToast("Please log in to contact vendor", "error");
    window.location.href='login.html';
    return;
  }
  try{
    const response = await fetch(`https://upstartpy.onrender.com/chat/create/${vendorId}`,{
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
})

document.addEventListener("DOMContentLoaded", () => {
  loadVendorProfile()

  // Check for productId in URL to auto-open modal
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('productId');
  if (productId) {
      openProductModal(productId);
  }
  
  document.getElementById("closeProductModal").addEventListener("click", closeProductModal)
  document.getElementById("productModal").addEventListener("click", function (e) {
    if (e.target === this) closeProductModal()
  })

  document.getElementById("contactBtn").addEventListener("click", () => {
    const vendors = JSON.parse(localStorage.getItem("vendors")) || []
    const vendor = vendors.find((v) => v.id === vendorId)
    if (vendor) {
      localStorage.setItem("selectedVendor", JSON.stringify(vendor.id))
      window.location.href = "chat.html"
    }
  })

  // Tab switching logic for Products/Content
  const tabProductsBtn = document.getElementById('tabProducts')
  const tabContentBtn = document.getElementById('tabContent')
  const productsSection = document.getElementById('productsSection')
  const contentSection = document.getElementById('contentSection')

  function activateTab(tabName) {
    if (tabName === 'products') {
      tabProductsBtn?.classList.add('active')
      tabContentBtn?.classList.remove('active')
      productsSection?.classList.remove('hidden')
      contentSection?.classList.add('hidden')
      loadVendorProducts(vendorId)
    } else if (tabName === 'content') {
      tabProductsBtn?.classList.remove('active')
      tabContentBtn?.classList.add('active')
      productsSection?.classList.add('hidden')
      contentSection?.classList.remove('hidden')
      loadVendorContent()
    }
  }

  if (tabProductsBtn) tabProductsBtn.addEventListener('click', () => activateTab('products'))
  if (tabContentBtn) tabContentBtn.addEventListener('click', () => activateTab('content'))
})
