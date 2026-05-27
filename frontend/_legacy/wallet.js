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

async function loadWalletData() {
  // Check if returning from payment
  const pendingReference = sessionStorage.getItem("pendingPaymentReference")
  const pendingAmount = sessionStorage.getItem("pendingPaymentAmount")
  
  if (pendingReference && pendingAmount) {
    sessionStorage.removeItem("pendingPaymentReference")
    sessionStorage.removeItem("pendingPaymentAmount")
    
    // Verify the payment
    await verifyPayment(pendingReference, parseFloat(pendingAmount))
  }

  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }

  try {
    const response = await fetch('https://upstartpy.onrender.com/wallet/getbalance/',
      {
        method: "GET",
        headers: {
          "Content-Type":"application/json",
          "Authorization":`Bearer ${currentUser.access}`
        }
      })

    if (!response.ok) {
      if (response.status === 401) {
        showToast('Session expired. Redirecting to login...', 'error');
        window.location.href = "login.html";
        return;
      }
      console.error('Error fetching wallet balance:', response.status);
      showToast('Failed to load wallet data. Please try again.', 'error');
      return;
    }

    const balance = await response.json();
    console.log('Wallet balance loaded:', balance);

    if (balance && typeof balance.balance === 'number') {
      document.getElementById("balanceAmount").textContent = `₦${(balance.balance).toFixed(2)}`
    } else {
      console.warn('Invalid balance data received');
    }

    loadTransactionHistory()
  } catch(error) {
    console.error('Error loading wallet data:', error);
    showToast('Failed to load wallet. Check your connection.', 'error');
  }
}

async function verifyPayment(reference, amount) {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  
  try {
    showPaymentModal()
    showPaymentState("loading")

    // Verify payment with backend
    const response = await fetch(`https://upstartpy.onrender.com/wallet/verify-topup/${reference}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser.access}`
      }
    })

    if (!response.ok) {
      console.error('Error verifying payment:', response.status);
      showPaymentState("failed", {
        reference: reference,
        message: "Payment verification failed. Please contact support."
      })
      return;
    }

    const result = await response.json()
    console.log("Verification result:", result)

    if (response.ok && result.status === "success") {
      // Payment successful
      showPaymentState("success", {
        amount: `₦${amount.toFixed(2)}`,
        reference: reference
      })
      showToast(`Payment of ₦${amount.toFixed(2)} successful!`, 'success');
      
      // Reload wallet data after a short delay
      setTimeout(() => {
        loadWalletData()
      }, 2000)
    } else {
      // Payment failed
      showPaymentState("failed", {
        reference: reference,
        message: result.message || "Payment verification failed. Please try again."
      })
      showToast(result.message || "Payment verification failed.", 'error');
    }
  } catch (error) {
    console.error("Verification error:", error)
    showPaymentState("failed", {
      reference: reference,
      message: "Unable to verify payment. Please contact support."
    })
    showToast("Failed to verify payment. Check your connection.", 'error');
  }
}

function loadTransactionHistory() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const transactions = JSON.parse(localStorage.getItem("transactions")) || []
  const userTransactions = transactions.filter((t) => t.userId === currentUser.id)

  const list = document.getElementById("transactionsList")

  if (userTransactions.length === 0) {
    list.innerHTML = '<p class="empty-message">No transactions yet</p>'
    return
  }

  list.innerHTML = userTransactions
    .reverse()
    .map(
      (t) => `
        <div class="transaction-item ${t.type}">
            <div class="transaction-info">
                <div class="transaction-type">${t.type === "credit" ? "+" : "-"} ${t.description}</div>
                <div class="transaction-date">${new Date(t.date).toLocaleDateString()}</div>
            </div>
            <div class="transaction-amount ${t.type === "credit" ? "amount-credit" : "amount-debit"}">
                ${t.type === "credit" ? "+" : "-"}₦${t.amount.toFixed(2)}
            </div>
        </div>
    `,
    )
    .join("")
}

document.getElementById("addMoneyBtn").addEventListener("click", () => {
  document.getElementById("addMoneyDrawer").classList.add("active")
  document.getElementById("drawerOverlay").classList.add("active")
  document.getElementById("addMoneyAmount").value = null;
  document.getElementById("addMoneyAmount").placeholder = 0
})

document.getElementById("withdrawBtn").addEventListener("click", () => {
  document.getElementById("withdrawDrawer").classList.add("active")
  document.getElementById("drawerOverlay").classList.add("active")
})

function closeDrawer(drawerId) {
  document.getElementById(drawerId).classList.remove("active")
  document.getElementById("drawerOverlay").classList.remove("active")
}

function closeAllDrawers() {
  document.querySelectorAll(".drawer").forEach((d) => d.classList.remove("active"))
  document.getElementById("drawerOverlay").classList.remove("active")
}

//Changess
// Payment Modal Functions
function showPaymentModal() {
  document.getElementById("paymentModal").classList.add("active")
  document.getElementById("paymentModalOverlay").classList.add("active")
}

function closePaymentModal() {
  document.getElementById("paymentModal").classList.remove("active")
  document.getElementById("paymentModalOverlay").classList.remove("active")
}

function showPaymentState(state, data = {}) {
  // Hide all states first
  document.getElementById("loadingState").style.display = "none"
  document.getElementById("successState").style.display = "none"
  document.getElementById("failedState").style.display = "none"

  if (state === "loading") {
    document.getElementById("loadingState").style.display = "block"
  } else if (state === "success") {
    document.getElementById("successState").style.display = "block"
    document.getElementById("successAmount").textContent = data.amount
    document.getElementById("successReference").textContent = data.reference || "-"
  } else if (state === "failed") {
    document.getElementById("failedState").style.display = "block"
    document.getElementById("failedReference").textContent = data.reference || "-"
    document.getElementById("failedMessage").textContent = data.message || "Your payment could not be processed. Please try again."
  }
}

// Store payment data for retry
let lastPaymentAmount = 0;

function retryPayment() {
  closePaymentModal()
  // Reopen the add money drawer with the amount
  if (lastPaymentAmount > 0) {
    document.getElementById("addMoneyAmount").value = lastPaymentAmount
  }
  document.getElementById("addMoneyDrawer").classList.add("active")
  document.getElementById("drawerOverlay").classList.add("active")
}


document.getElementById("submitAddMoney").addEventListener("click", async () => {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if (!currentUser) {
    showToast('Please log in to add money', 'error');
    window.location.href = "login.html"
    return
  }
  
  const amount = Number.parseFloat(document.getElementById("addMoneyAmount").value)
  if (!amount || amount <= 0) {
    showToast("Please enter a valid amount", 'error');
    document.getElementById("addMoneyAmount").value = null
    return
  }

  if (amount > 1000000) {
    showToast("Amount exceeds maximum limit of ₦1,000,000", 'error');
    return
  }

  lastPaymentAmount = amount
  
  try {
    // Close the drawer and show loading modal
    closeDrawer("addMoneyDrawer")
    showPaymentModal()
    showPaymentState("loading")

    // Step 1: Initialize payment with backend
    const response = await fetch('https://upstartpy.onrender.com/wallet/topup', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentUser.access}`
      },
      body: JSON.stringify({ amount })
    })

    if (!response.ok) {
      const error = await response.json();
      console.error('Payment initialization failed:', response.status, error);
      showPaymentState("failed", {
        reference: "N/A",
        message: error.detail || "Payment initialization failed. Please try again."
      })
      showToast(error.detail || 'Failed to initialize payment', 'error');
      return;
    }

    const details = await response.json()
    console.log("Payment details:", details)

    if (!details || !details.details || !details.details.data || !details.details.data.authorization_url) {
      console.error('Invalid payment response:', details);
      showPaymentState("failed", {
        reference: "N/A",
        message: "Failed to initialize payment. Please try again."
      })
      showToast("Failed to initialize payment. Please try again.", 'error');
      return
    }

    // Store reference for later verification
    const paymentReference = details.details.data.reference
    
    // Step 2: Redirect to Paystack
    // We'll handle verification when user returns
    sessionStorage.setItem("pendingPaymentReference", paymentReference)
    sessionStorage.setItem("pendingPaymentAmount", amount)
    
    window.location.href = details.details.data.authorization_url
    
  } catch (error) {
    console.error("Payment error:", error)
    showPaymentState("failed", {
      reference: "N/A",
      message: "An error occurred. Please try again."
    })
    showToast("Failed to process payment. Check your connection.", 'error');
  }
})

//Changes end

document.getElementById("submitWithdraw").addEventListener("click", () => {
  const amount = Number.parseFloat(document.getElementById("withdrawAmount").value)
  const bankAccount = document.getElementById("bankAccount").value
  const routingNumber = document.getElementById("routingNumber").value

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount")
    return
  }

  if (!bankAccount || !routingNumber) {
    alert("Please fill in all bank details")
    return
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const users = JSON.parse(localStorage.getItem("users")) || []
  const userIndex = users.findIndex((u) => u.id === currentUser.id)

  if (userIndex !== -1) {
    const balance = users[userIndex].walletBalance || 0
    if (balance < amount) {
      alert("Insufficient balance")
      return
    }

    users[userIndex].walletBalance = balance - amount
    localStorage.setItem("users", JSON.stringify(users))

    const transaction = {
      userId: currentUser.id,
      type: "debit",
      amount: amount,
      description: "Withdrew from wallet",
      date: new Date().toISOString(),
    }
    const transactions = JSON.parse(localStorage.getItem("transactions")) || []
    transactions.push(transaction)
    localStorage.setItem("transactions", JSON.stringify(transactions))

    alert(`Successfully withdrew ₦${amount.toFixed(2)}!`)
    closeDrawer("withdrawDrawer")
    loadWalletData()
    document.getElementById("withdrawAmount").value = ""
    document.getElementById("bankAccount").value = ""
    document.getElementById("routingNumber").value = ""
  }
})

document.addEventListener("DOMContentLoaded", loadWalletData)
