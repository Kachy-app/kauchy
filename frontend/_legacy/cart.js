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

async function renderCartItems() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  if (!userData) {
    showToast('Please log in to view your cart', 'error');
    window.location.href = 'login.html';
    return;
  }
  
  try{
    const response = await fetch('https://upstartpy.onrender.com/cart/cart-items/',
      {
        method: "GET",
        headers: {
          "Content-Type":"application/json",
          "Authorization": `Bearer ${userData.access}`
        }
      });
      
    if (!response.ok){
      if(response.status === 401){
        showToast('Session expired. Redirecting to login', 'error');
        window.location.href = "login.html";
        return;
      }
      console.error('Error fetching cart:', response.status);
      showToast('Failed to load cart. Please try again.', 'error');
      return;
    }

    const cart = await response.json();
    console.log('Cart loaded successfully:', cart.length, 'items');

    const list = document.getElementById("cartItemsList");
    // Clear existing list before rendering new items
    list.innerHTML = "";

    if (!cart || cart.length === 0) {
      list.innerHTML = `
              <div class="empty-cart">
                  <div class="empty-cart-icon">🛒</div>
                  <div class="empty-cart-text">Your cart is empty</div>
                  <a href="index.html" style="color: var(--primary); text-decoration: none; font-weight: 600;">Continue Shopping</a>
              </div>
          `
      updateCartSummary();
      return
    }

    cart.forEach((item) => {
      // Normalize possible item shapes (backend vs localStorage)
      const productId = item.productId !== undefined ? item.productId : (item.product !== undefined ? item.product : (item.id !== undefined ? item.id : null));
      const productPrice = Number(item.product_price ?? item.price ?? item.unit_price ?? 0);
      
      // Safely handle image array
      const imageSrc = (item.product_image && Array.isArray(item.product_image) && item.product_image.length > 0) 
        ? item.product_image[0] 
        : '/placeholder.svg';
      
      const itemName = item.product_name;
      const vendorName = item.vendor_name ?? (item.vendor && item.vendor.name) ?? item.vendorName ?? 'Unknown Vendor';
      const quantity = Number(item.quantity ?? item.qty ?? 1);

      const itemTotal = productPrice * quantity;

      // Guard: if we don't have a productId, skip rendering that item
      if (productId === null) {
        console.warn('Skipping item with no product ID:', item);
        return;
      }

      list.innerHTML += `
      <div class="cart-item" onclick="openProductModal(${productId})">
        <img src="${imageSrc}" alt="${itemName}" class="item-image" onerror="this.src='/placeholder.svg'">
        <div class="item-details">
          <div>
            <div class="item-name">${itemName}</div>
            <div class="item-price">₦${productPrice.toFixed(2)}</div>
            <div class="item-vendor">${vendorName}</div>
          </div>
        </div>
        <div class="item-actions">
          <div class="quantity-control" onclick="event.stopPropagation()">
            <button class="quantity-btn" onclick="updateQuantity(${productId}, -1)">−</button>
            <input type="text" class="quantity-input" value="${quantity}" readonly>
            <button class="quantity-btn" onclick="updateQuantity(${productId}, 1)">+</button>
          </div>
          <button class="remove-btn" onclick="event.stopPropagation(); removeFromCart(${productId})">Remove</button>
        </div>
      </div>`
    })

    updateCartSummary()
  }catch(error){
    console.error('Error loading cart:', error);
    showToast('Failed to load cart. Check your connection.', 'error');
  }
}

function removeFromCart(productId) {
  let cart = JSON.parse(localStorage.getItem("cart")) || []
  cart = cart.filter((item) => item.productId !== productId)
  localStorage.setItem("cart", JSON.stringify(cart))
  renderCartItems()
}

function updateQuantity(productId, change) {

  if (item) {
    item.quantity += change
    if (item.quantity <= 0) {
      removeFromCart(productId)
    } else {
      localStorage.setItem("cart", JSON.stringify(cart))
      renderCartItems()
    }
  }
}

async function updateCartSummary() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  if (!userData) {
    console.warn('No user data found for cart summary');
    return;
  }

  try{
    const response = await fetch('https://upstartpy.onrender.com/cart/cart-items/',
      {
        method: "GET",
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
      console.error('Error fetching cart summary:', response.status);
      showToast('Failed to update cart summary.', 'error');
      return;
    }

    const cart = await response.json();

    let subtotal = 0;
    if (cart && Array.isArray(cart)) {
      cart.forEach((item) => {
        const price = Number(item.product_price ?? item.price ?? 0);
        const qty = Number(item.quantity ?? 1);
        subtotal += price * qty;
      })
    }

    const shipping = cart && cart.length > 0 ? 5 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    const subtotalEl = document.getElementById("subtotal");
    const shippingEl = document.getElementById("shipping");
    const taxEl = document.getElementById("tax");
    const totalEl = document.getElementById("total");

    if (subtotalEl) subtotalEl.textContent = `₦${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = `₦${shipping.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₦${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₦${total.toFixed(2)}`;
  }catch(error){
    console.error('Error updating cart summary:', error);
    showToast('Failed to update cart summary. Check your connection.', 'error');
  }
}

function getVendor(vendorId) {
  const vendors = JSON.parse(localStorage.getItem("vendors")) || []
  return vendors.find((v) => v.id === vendorId)
}

async function openProductModal(productId) {
  try {
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

    const imageSrc = (product.image_url && Array.isArray(product.image_url) && product.image_url.length > 0)
      ? product.image_url[0]
      : '/placeholder.svg';

    const html = `
      <div style="display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; align-items: start;">
        <div>
          <img src="${imageSrc}" style="width: 100%; max-height: 800px; object-fit: contain; border-radius: 8px;" onerror="this.src='/placeholder.svg'">
        </div>
              <div>
                  <h3 style="font-size: 20px; margin-bottom: 12px;">${product.product_name}</h3>
                  <div style="font-size: 24px; color: var(--accent); font-weight: 700; margin-bottom: 16px;">$${product.price}</div>
                  <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">${product.description || 'No description available'}</p>
                  <div style="background: var(--secondary); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Location: <strong>${product.institute || 'Unknown'}</strong></div>
                      <div style="font-size: 12px; color: var(--text-secondary);">Available: <strong>${product.quantity || 0}</strong></div>
                  </div>
                  <div style="background: var(--secondary); padding: 12px; border-radius: 8px;">
                      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Seller</div>
                      <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">${product.vendor_username || 'Unknown'}</div>
                      <div style="font-size: 12px; color: var(--text-secondary);">${product.vendor_email || 'N/A'}</div>
                  </div>
                  <div style="margin-top: 16px;">
                    <button id="shareProductBtn_${product.id}" class="btn-icon" style="display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: white; cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        <span>Share Product</span>
                    </button>
                  </div>
              </div>
          </div>
      `

    document.getElementById("productDetailsContainer").innerHTML = html
    document.getElementById("productModal").classList.add("active")

    // Bind share event
    setTimeout(() => {
        const shareBtn = document.getElementById(`shareProductBtn_${product.id}`);
        if(shareBtn) {
            shareBtn.onclick = () => {
                const shareUrl = new URL(window.location.origin + '/index.html'); // Share link points to main index page
                shareUrl.searchParams.set("productId", product.id);
                
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
    }, 100);

  } catch(error) {
    console.error('Error opening product modal:', error);
    showToast('Failed to load product details. Check your connection.', 'error');
  }
}

function checkoutItem(productId) {
  const cart = JSON.parse(localStorage.getItem("cart")) || []
  const products = JSON.parse(localStorage.getItem("products")) || []
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const users = JSON.parse(localStorage.getItem("users")) || []

  const cartItem = cart.find((item) => item.productId === productId)
  if (!cartItem) {
    alert("Item not found in cart")
    return
  }

  const product = products.find((p) => p.id === productId)
  if (!product) return

  const userIndex = users.findIndex((u) => u.id === currentUser.id)
  if (userIndex === -1) return

  const itemTotal = product.price * cartItem.quantity
  const balance = users[userIndex].walletBalance || 0

  if (balance < itemTotal) {
    alert(`Insufficient wallet balance. You need ₦${itemTotal.toFixed(2)} but have ₦${balance.toFixed(2)}`)
    return
  }

  // Deduct from wallet
  users[userIndex].walletBalance = balance - itemTotal
  localStorage.setItem("users", JSON.stringify(users))

  // Create transaction
  const transaction = {
    userId: currentUser.id,
    type: "debit",
    amount: itemTotal,
    description: `Checkout: ${product.name} (Qty: ${cartItem.quantity})`,
    date: new Date().toISOString(),
  }

  const transactions = JSON.parse(localStorage.getItem("transactions")) || []
  transactions.push(transaction)
  localStorage.setItem("transactions", JSON.stringify(transactions))

  // Remove from cart
  removeFromCart(productId)

  // Add notifications
  const notifications = JSON.parse(localStorage.getItem("notifications")) || []
  notifications.push({
    id: Date.now(),
    userId: product.vendorId,
    type: "payment",
    message: `Payment received for ${product.name}. Confirm product delivery.`,
    read: false,
    date: new Date().toISOString(),
  })
  localStorage.setItem("notifications", JSON.stringify(notifications))

  alert(`Payment of ₦${itemTotal.toFixed(2)} successful! Order placed.`)
  renderCartItems()
}


document.getElementById("closeProductModal").addEventListener("click", () => {
  document.getElementById("productModal").classList.remove("active")
})

document.getElementById("productModal").addEventListener("click", function (e) {
  if (e.target === this) {
    this.classList.remove("active")
  }
})

document.getElementById("checkoutAllBtn").addEventListener("click", () => {
  const cart = JSON.parse(localStorage.getItem("cart")) || []
  if (cart.length === 0) {
    alert("Your cart is empty")
    return
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const users = JSON.parse(localStorage.getItem("users")) || []
  const userIndex = users.findIndex((u) => u.id === currentUser.id)

  if (userIndex !== -1) {
    const products = JSON.parse(localStorage.getItem("products")) || []
    let totalAmount = 0

    cart.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (product) {
        totalAmount += product.price * item.quantity
      }
    })

    const balance = users[userIndex].walletBalance || 0
    if (balance < totalAmount) {
      alert("Insufficient wallet balance. Please add money to your wallet.")
      return
    }

    // Deduct from wallet
    users[userIndex].walletBalance = balance - totalAmount

    // Create transaction
    const transaction = {
      userId: currentUser.id,
      type: "debit",
      amount: totalAmount,
      description: "Checkout All Items",
      date: new Date().toISOString(),
    }

    const transactions = JSON.parse(localStorage.getItem("transactions")) || []
    transactions.push(transaction)

    localStorage.setItem("users", JSON.stringify(users))
    localStorage.setItem("transactions", JSON.stringify(transactions))

    // Add notifications for each product vendor
    const notifications = JSON.parse(localStorage.getItem("notifications")) || []
    const notifiedVendors = new Set()

    cart.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (product && !notifiedVendors.has(product.vendorId)) {
        notifications.push({
          id: Date.now() + Math.random(),
          userId: product.vendorId,
          type: "payment",
          message: "Payment received. Confirm product delivery.",
          read: false,
          date: new Date().toISOString(),
        })
        notifiedVendors.add(product.vendorId)
      }
    })

    localStorage.setItem("notifications", JSON.stringify(notifications))
    localStorage.setItem("cart", JSON.stringify([]))

    alert("Checkout successful! All orders have been placed.")
    updateCartBadge()
    renderCartItems()
  }
})

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
  }
  renderCartItems()
  hideLoadingModal()
  updateCartSummary()
  updateCartBadge()
  
  // Check for productId in URL to auto-open modal even on cart page
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('productId');
  if (productId) {
      openProductModal(productId);
  }
})

function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const badge = document.getElementById("cartBadge");

  if (badge) {
    const itemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    badge.textContent = itemCount > 0 ? itemCount : "";
  }
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
