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

async function loadLeaderboard() {
  try{
    const response = await fetch('https://upstartpy.onrender.com/customers/top-vendors/',
      {
        method: "GET",
        headers: {"Content-Type":"application/json"}
      })

    if (!response.ok) {
      console.error('Error fetching top vendors:', response.status);
      showToast('Failed to load vendors. Please try again.', 'error');
    } else {
      const vendors = await response.json();
      if (vendors && vendors.length > 0) {
        console.log('Vendors loaded successfully:', vendors.length, 'items');
        loadVendorsList(vendors);
      } else {
        console.warn('No vendors returned from server');
        document.getElementById("vendorsList").innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No vendors available</p>';
      }
    }

  }catch(error){
    console.error('Error loading vendors:', error);
    showToast('Failed to load vendors. Check your connection.', 'error');
  }

  try{
    const response = await fetch('https://upstartpy.onrender.com/customers/top-customers/',
      {
        method: "GET",
        headers: {"Content-Type":"application/json"}
      })

    if (!response.ok) {
      console.error('Error fetching top customers:', response.status);
      showToast('Failed to load customers. Please try again.', 'error');
    } else {
      const customers = await response.json();
      if (customers && customers.length > 0) {
        console.log('Customers loaded successfully:', customers.length, 'items');
        loadCustomersList(customers);
      } else {
        console.warn('No customers returned from server');
        document.getElementById("customersList").innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No customers available</p>';
      }
    }
  }catch(error){
    console.error('Error loading customers:', error);
    showToast('Failed to load customers. Check your connection.', 'error');
  }

  try{
    const response = await fetch('https://upstartpy.onrender.com/analytics/top-products/',
      {
        method: "GET",
        headers: {
          "Content-Type":"application/json"
        }
      });
    
    if (!response.ok) {
      console.error('Error fetching top products:', response.status);
      showToast('Failed to load trending products. Please try again.', 'error');
      await hideLoadingModal();
      return;
    }

    const products = await response.json();
    if (products && products.length > 0) {
      console.log('Trending products loaded successfully:', products.length, 'items');
      loadTrendingProducts(products);
    } else {
      console.warn('No products returned from server');
      document.getElementById("trendingProducts").innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No trending products available</p>';
    }
    
  // Wait for loading modal to finish hiding, then animate product cards in
  await hideLoadingModal();
  const cards = Array.from(document.querySelectorAll('#trendingProducts .product-card'));
  cards.forEach((card, idx) => setTimeout(() => card.classList.add('fade-in'), idx * 50));

  }catch(error){
    console.error('Error loading trending products:', error);
    showToast('Failed to load trending products. Check your connection.', 'error');
    await hideLoadingModal();
  }
}

function loadVendorsList(vendors) {
  const list = document.getElementById("vendorsList")
  list.innerHTML = vendors
    .map((vendor, index) => {
      let rankClass = "default"
      if (index === 0) rankClass = "gold"
      else if (index === 1) rankClass = "silver"
      else if (index === 2) rankClass = "bronze"

      return `
            <div class="leaderboard-item" onclick="loadVendorPage(${vendor.vendor})">
                <div class="rank-badge ${rankClass}">${index + 1}</div>
                <img src="${vendor.pfp || "/placeholder.svg?height=48&width=48"}" alt="${vendor.username}" class="leaderboard-item-avatar">
                <div class="leaderboard-item-info" id="leaderboardItemInfo">
                    <div class="leaderboard-item-name">${vendor.username}</div>
                    <div class="leaderboard-item-details">${vendor.institute}</div>
                </div>
                <div class="leaderboard-item-stats">
                    <div class="stat">
                        <span class="stat-value">${vendor.total_sales || 0}</span>
                        <span class="stat-label">Sales</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${(Number(vendor.rating) || 0).toFixed(1)}</span>
                        <span class="stat-label">Rating</span>
                    </div>
                    ${index === 0 ? '<div class="achievement-badge">🏆 TOP</div>' : ""}
                </div>
            </div>
        `
    })
    .join("")

    console.log(document.getElementById("leaderboardItemInfo"))

    
}

function loadCustomersList(customers) {
  const list = document.getElementById("customersList")
  list.innerHTML = customers
    .map((customer, index) => {
      let rankClass = "default"
      if (index === 0) rankClass = "gold"
      else if (index === 1) rankClass = "silver"
      else if (index === 2) rankClass = "bronze"

      return `
            <div class="leaderboard-item">
                <div class="rank-badge ${rankClass}">${index + 1}</div>
                <img src="${customer.pfp || "/placeholder.svg?height=48&width=48"}" alt="${customer.username}" class="leaderboard-item-avatar">
                <div class="leaderboard-item-info">
                    <div class="leaderboard-item-name">${customer.username}</div>
                    <div class="leaderboard-item-details">${customer.institute}</div>
                </div>
                <div class="leaderboard-item-stats">
                    <div class="stat">
                        <span class="stat-value">${customer.total_purchases || 0}</span>
                        <span class="stat-label">Purchases</span>
                    </div>
                </div>
            </div>
        `
    })
    .join("")
}

async function loadTrendingProducts(products) {
  const grid = document.getElementById("trendingProducts")
  grid.innerHTML = products
    .map((product) => {
      return `
            <div class="product-card" onclick="onclick="openProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})"">
                <img src="${product.image_url[0]}" alt="${product.product_name}" class="product-image">
                <div class="product-info">
                    <div class="product-name">${product.product_name}</div>
                    <div class="product-price">₦${product.unit_price}</div>
                    <div class="product-views">${product.units_sold || 0} Units Sold</div>
                </div>
            </div>
        `
    })
    .join("")

  grid.querySelectorAll('.product-card').forEach((card, index) => {
    card.addEventListener('click', () => openProductModal(products[index]));
  });
}

function openProductModal(product) {
  const html = `
        <div style="padding: 32px;">
            <img src="${product.image_url[0]}" style="width: 100%; border-radius: 12px; margin-bottom: 16px;">
            <h2 style="font-size: 20px; margin-bottom: 8px;">${product.product_name}</h2>
            <div style="font-size: 24px; color: var(--accent); font-weight: 700; margin-bottom: 16px;">$${product.unit_price}</div>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">${product.description}</p>
            <div style="background: var(--secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Seller: <strong>${product.vendor_name || "Unknown"}</strong></div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Views: <strong>${product.view_count || 0}</strong></div>
                <div style="font-size: 12px; color: var(--text-secondary);">Available: <strong>${product.quantity}</strong></div>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
              <button onclick="addLeaderboardProductToCart(${product.product_id})" style="flex: 1; padding: 12px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Add to Cart</button>
            </div>
        </div>
    `

  document.getElementById("productDetailsContainer").innerHTML = html
  document.getElementById("productModal").classList.add("active")
}

async function addLeaderboardProductToCart(productId) {
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
    const badge = document.getElementById("cartBadge")
    if (badge) {
      badge.textContent++;
    }
    document.getElementById("productModal").classList.remove("active")
  }catch(error){
    console.error('Error adding to cart:', error);
    showToast('Failed to add item to cart. Check your connection.', 'error');
  }
}

// Tab switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    const tabId = this.dataset.tab
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))
    this.classList.add("active")
    document.getElementById(tabId).classList.add("active")
  })
})

document.getElementById("closeProductModal").addEventListener("click", () => {
  document.getElementById("productModal").classList.remove("active")
})

document.getElementById("productModal").addEventListener("click", function (e) {
  if (e.target === this) this.classList.remove("active")
})

function loadVendorPage(vendorId){
  window.location.href = `vendor-profile.html?vendorId=${vendorId}`
}

// Helper function to hide loading modal with exit animation
function hideLoadingModal() {
  // Remove any skeleton loaders present on the page (leaderboard-item-skeleton, product-card-skeleton, etc.)
  const skeletonSelectors = [
    '.product-card-skeleton',
    '.leaderboard-item-skeleton',
    '.skeleton-list',
    '.skeleton-grid',
  ];

  const skeletons = Array.from(document.querySelectorAll(skeletonSelectors.join(',')));
  if (!skeletons || skeletons.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    skeletons.forEach(el => el.classList.add('fade-out'));
    setTimeout(() => {
      skeletons.forEach(el => el.remove());
      resolve();
    }, 350);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard()
})
