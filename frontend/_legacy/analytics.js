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

function checkAuth() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
    return null
  }
  if (currentUser.user.role !== "vendor") {
    alert("Only vendors can access analytics")
    window.location.href = "index.html"
    return null
  }
  return currentUser
}

async function loadAnalytics() {
  const currentUser = checkAuth()
  if (!currentUser) return

  try{
    const response = await fetch('https://upstartpy.onrender.com/analytics/overview/',
      {
        method: "GET",
        headers: {
          "Content-Type":"application/json",
          "Authorization":`Bearer ${currentUser.access}`
        }
      });
    
    if (!response.ok) {
      console.error('Error fetching analytics:', response.status);
      showToast('Failed to load analytics. Please try again.', 'error');
      return;
    }

    const data = await response.json();
    console.log('Analytics loaded successfully');

    if (!data) {
      console.warn('No analytics data received');
      return;
    }

    document.getElementById("totalSales").textContent = data.total_sales_quantity || 0
    document.getElementById("totalRevenue").textContent = data.total_revenue || 0
    document.getElementById("totalViews").textContent = data.total_views || 0
    document.getElementById("avgRating").textContent = (data.rating || 0).toFixed(1)
    document.getElementById("ratingStars").textContent =
      "★".repeat(Math.round(data.rating || 0)) + "☆".repeat(5 - Math.round(data.rating || 0))
    document.getElementById("productCount").textContent = data.active_products_count || 0

    // Load top products
    loadTopProducts()

  }catch(error){
    console.error('Error loading analytics:', error);
    showToast('Failed to load analytics. Check your connection.', 'error');
  }
}

function drawSalesChart() {
  const canvas = document.getElementById("salesCanvas")
  const ctx = canvas.getContext("2d")

  // Simple bar chart
  const data = [45, 52, 48, 65, 55, 70, 80]
  const barWidth = canvas.width / data.length
  const maxValue = Math.max(...data)

  ctx.fillStyle = "#F4F6FA"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  data.forEach((value, index) => {
    const barHeight = (value / maxValue) * (canvas.height * 0.8)
    ctx.fillStyle = "#1C6EF2"
    ctx.fillRect(index * barWidth + 5, canvas.height - barHeight - 20, barWidth - 10, barHeight)
  })
}

// async function drawCategoryChart() {
//   const canvas = document.getElementById("categoryCanvas")
//   const ctx = canvas.getContext("2d")

//   const response = await fetch('https://upstartpy.onrender.com/products/',{
//       method: "GET",
//       headers: {"Content-Type":"application/json"}
//     });

//     if (!response.ok){
//       const error = await response.json()
//       console.log(error)
//     }

//     const products = await response.json();

//   // Count products by category
//   const categories = {}
//   products.forEach((p) => {
//     categories[p.category] = (categories[p.category] || 0) + 1
//   })

//   const categoryNames = Object.keys(categories)
//   const categoryValues = Object.values(categories)
//   const maxValue = Math.max(...categoryValues, 1)

//   ctx.fillStyle = "#F4F6FA"
//   ctx.fillRect(0, 0, canvas.width, canvas.height)

//   categoryNames.forEach((name, index) => {
//     const barHeight = (categoryValues[index] / maxValue) * (canvas.height * 0.8)
//     const colors = ["#1C6EF2", "#FFB800", "#4AD77C", "#FF4D4D", "#6B7280"]
//     ctx.fillStyle = colors[index % colors.length]
//     ctx.fillRect(
//       index * (canvas.width / categoryNames.length) + 5,
//       canvas.height - barHeight - 20,
//       canvas.width / categoryNames.length - 10,
//       barHeight,
//     )
//   })
// }

async function loadTopProducts() {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  try{
    const response = await fetch('https://upstartpy.onrender.com/analytics/top-products-vendor/',
      {
        method: "GET",
        headers: {
          "Content-Type":"application/json",
          "Authorization":`Bearer ${currentUser.access}`
        }
      });
    const sorted = await response.json();
    console.log(sorted)

    const tbody = document.getElementById("topProductsTable")

    tbody.innerHTML = sorted
      .map((product) => {
        const sales = Math.floor(Math.random() * 20) + 1
        // const revenue = (product.unit_price * sales).toFixed(2)
        return `
              <tr onclick="openProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                  <td><span class="table-product-name">${product.product_name}</span></td>
                  <td><span class="stat-number">${product.view_count || 0}</span></td>
                  <td><span class="stat-number">${product.units_sold}</span></td>
                  <td><span class="revenue">$${product.revenue}</span></td>
              </tr>
          `
      })
      .join("")

  }catch(error){
    alert("Can't connect to server", error)
  }
  
}

function loadRecentOrders() {
  const list = document.getElementById("ordersList")
  const orders = []

  for (let i = 0; i < 5; i++) {
    orders.push({
      id: `ORD-${1001 + i}`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
      amount: (Math.random() * 500 + 100).toFixed(2),
      status: ["Completed", "Pending", "Processing"][Math.floor(Math.random() * 3)],
    })
  }

  list.innerHTML = orders
    .map(
      (order) => `
        <div class="order-item">
            <div class="order-header">
                <div>
                    <div class="order-id">${order.id}</div>
                    <div class="order-date">${order.date}</div>
                </div>
                <div>
                    <div class="order-amount">₦${order.amount}</div>
                    <div class="order-status">${order.status}</div>
                </div>
            </div>
        </div>
    `,
    )
    .join("")
}

function openProductModal(product) {
  // const product = products.find((p) => p.id === productId)
  console.log(product)

  if (!product) return

  const html = `
        <div style="padding: 32px;">
            <img src="${product.image_url[0]}" style="width: 100%; border-radius: 12px; margin-bottom: 16px;">
            <h2 style="font-size: 20px; margin-bottom: 8px;">${product.product_name}</h2>
            <div style="font-size: 24px; color: var(--accent); font-weight: 700; margin-bottom: 16px;">$${product.unit_price}</div>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">${product.description}</p>
            <div style="background: var(--secondary); padding: 16px; border-radius: 8px;">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Views: <strong>${product.view_count || 0}</strong></div>
                <div style="font-size: 12px; color: var(--text-secondary);">Available: <strong>${product.quantity}</strong></div>
            </div>
        </div>
    `

  document.getElementById("productDetailsContainer").innerHTML = html
  document.getElementById("productModal").classList.add("active")
}

document.getElementById("closeProductModal").addEventListener("click", () => {
  document.getElementById("productModal").classList.remove("active")
})

document.getElementById("productModal").addEventListener("click", function (e) {
  if (e.target === this) this.classList.remove("active")
})

document.addEventListener("DOMContentLoaded", loadAnalytics)
