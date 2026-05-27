"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Transaction {
    userId: number;
    type: string;
    amount: number;
    description: string;
    date: string;
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export default function WalletPage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    // State
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Drawer States
    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [drawerOverlayOpen, setDrawerOverlayOpen] = useState(false);

    // Form States
    const [addAmount, setAddAmount] = useState<string>('');
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [bankAccount, setBankAccount] = useState('');
    const [routingNumber, setRoutingNumber] = useState('');

    // Payment Modal States
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentState, setPaymentState] = useState<'loading' | 'success' | 'failed' | 'idle'>('idle');
    const [paymentDetails, setPaymentDetails] = useState<{ amount?: string, reference?: string, message?: string }>({});

    // Toast State
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Last payment amount for retry
    const lastPaymentAmountRef = useRef<number>(0);

    // ─── Toast System ───
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        loadWalletData();
    }, [user, loading]);

    const loadWalletData = async () => {
        if (!user) return;

        // Check pending payment on return from Paystack
        let pendingRef = sessionStorage.getItem("pendingPaymentReference");
        let pendingAmt = sessionStorage.getItem("pendingPaymentAmount");

        // Fallback: check URL params from Paystack redirect (?trxref=xxx&reference=xxx)
        if (!pendingRef) {
            const urlParams = new URLSearchParams(window.location.search);
            const urlRef = urlParams.get('trxref') || urlParams.get('reference');
            if (urlRef) {
                pendingRef = urlRef;
                pendingAmt = pendingAmt || '0'; // Amount will be shown from backend
                // Clean URL params so we don't re-verify on refresh
                window.history.replaceState({}, '', window.location.pathname);
            }
        }

        if (pendingRef && pendingAmt) {
            sessionStorage.removeItem("pendingPaymentReference");
            sessionStorage.removeItem("pendingPaymentAmount");
            verifyPayment(pendingRef, parseFloat(pendingAmt));
        }

        try {
            const response = await fetch('https://kachy-production.up.railway.app/wallet/getbalance/', {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.access}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    showToast('Session expired. Redirecting to login...', 'error');
                    setTimeout(() => logout(), 1500);
                    return;
                }
                showToast('Failed to load wallet data.', 'error');
                return;
            }

            const data = await response.json();
            if (data && data.balance !== undefined) {
                setBalance(typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance);
            }

            // Load real transactions from API
            const historyResponse = await fetch('https://kachy-production.up.railway.app/wallet/history/', {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.access}`
                }
            });

            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                // Map the backend structure to our local interface if needed
                // Backend returns: { id, amount, status, transaction_type, reference, history_type, date, type, description }
                setTransactions(historyData);
            } else {
                console.error("Failed to load history from API");
                // Fallback to local transactions (legacy)
                const stored = localStorage.getItem("transactions");
                const allTrans = stored ? JSON.parse(stored) : [];
                const userTrans = allTrans.filter((t: any) => t.userId === user.user?.id);
                setTransactions(userTrans.reverse());
            }

        } catch (error) {
            console.error("Error loading wallet", error);
            showToast('Failed to load wallet. Check your connection.', 'error');
        }
    };

    const verifyPayment = async (reference: string, amount: number) => {
        setPaymentModalOpen(true);
        setPaymentState('loading');

        try {
            const response = await fetch(`https://kachy-production.up.railway.app/wallet/verify-topup/${reference}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.access}`
                }
            });

            if (!response.ok) {
                console.error('Verification failed:', response.status);
                setPaymentState('failed');
                setPaymentDetails({
                    reference: reference,
                    message: "Payment verification failed. Please contact support."
                });
                showToast('Payment verification failed.', 'error');
                return;
            }

            const result = await response.json();

            // Backend returns { data: {...}, wallet_balance: ... } on success
            // response.ok means verification succeeded
            setPaymentState('success');
            setPaymentDetails({
                amount: `₦${amount.toFixed(2)}`,
                reference: reference
            });
            showToast(`Payment of ₦${amount.toFixed(2)} successful!`, 'success');

            // Reload wallet data after a short delay
            setTimeout(() => {
                setPaymentModalOpen(false);
                setPaymentState('idle');
                loadWalletData();
            }, 2500);

        } catch (e) {
            console.error("Verification error:", e);
            setPaymentState('failed');
            setPaymentDetails({
                reference: reference,
                message: "Unable to verify payment. Please contact support."
            });
            showToast('Failed to verify payment. Check your connection.', 'error');
        }
    };

    const handleAddMoney = async () => {
        const amount = parseFloat(addAmount);
        if (!amount || amount <= 0) {
            showToast("Please enter a valid amount", 'error');
            return;
        }
        if (amount > 1000000) {
            showToast("Amount exceeds maximum limit of ₦1,000,000", 'error');
            return;
        }

        lastPaymentAmountRef.current = amount;

        setIsAddMoneyOpen(false);
        setDrawerOverlayOpen(false);
        setPaymentModalOpen(true);
        setPaymentState('loading');

        try {
            const response = await fetch('https://kachy-production.up.railway.app/wallet/topup', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.access}`
                },
                body: JSON.stringify({ amount, callback_url: window.location.href })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    showToast('Session expired. Redirecting to login...', 'error');
                    setTimeout(() => logout(), 1500);
                    return;
                }
                setPaymentState('failed');
                setPaymentDetails({ message: err.detail || err.error || "Payment initialization failed. Please try again." });
                showToast(err.detail || 'Failed to initialize payment', 'error');
                return;
            }

            const data = await response.json();
            if (data?.details?.data?.authorization_url) {
                sessionStorage.setItem("pendingPaymentReference", data.details.data.reference);
                sessionStorage.setItem("pendingPaymentAmount", amount.toString());
                window.location.href = data.details.data.authorization_url;
            } else {
                setPaymentState('failed');
                setPaymentDetails({ message: "Failed to initialize payment. Please try again." });
                showToast("Failed to initialize payment.", 'error');
            }

        } catch (e) {
            setPaymentState('failed');
            setPaymentDetails({ message: "An error occurred. Please try again." });
            showToast("Failed to process payment. Check your connection.", 'error');
        }
    };

    const retryPayment = () => {
        setPaymentModalOpen(false);
        setPaymentState('idle');
        if (lastPaymentAmountRef.current > 0) {
            setAddAmount(lastPaymentAmountRef.current.toString());
        }
        setIsAddMoneyOpen(true);
        setDrawerOverlayOpen(true);
    };

    const handleWithdraw = () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) {
            showToast("Please enter a valid amount", 'error');
            return;
        }
        if (!bankAccount || !routingNumber) {
            showToast("Please fill in all bank details", 'error');
            return;
        }
        if (balance < amount) {
            showToast("Insufficient balance", 'error');
            return;
        }

        // Record transaction locally (no backend withdrawal endpoint yet)
        const newTrans: Transaction = {
            userId: user.user?.id,
            type: "debit",
            amount: amount,
            description: "Withdrew from wallet",
            date: new Date().toISOString()
        };

        const stored = localStorage.getItem("transactions");
        const allTrans = stored ? JSON.parse(stored) : [];
        allTrans.push(newTrans);
        localStorage.setItem("transactions", JSON.stringify(allTrans));

        setBalance(prev => prev - amount);
        showToast(`Successfully withdrew ₦${amount.toFixed(2)}`, 'success');

        setIsWithdrawOpen(false);
        setDrawerOverlayOpen(false);
        setWithdrawAmount('');
        setBankAccount('');
        setRoutingNumber('');
        loadWalletData();
    };

    const closeDrawers = () => {
        setIsAddMoneyOpen(false);
        setIsWithdrawOpen(false);
        setDrawerOverlayOpen(false);
    };

    return (
        <div className="w-full max-w-[1400px] mx-auto px-2.5 py-5 sm:px-5 sm:py-10 font-sans text-gray-900">
            {/* Toast Container */}
            <div className="fixed top-5 left-5 right-5 sm:left-auto sm:right-5 sm:w-auto z-[10000] flex flex-col gap-2 pointer-events-none" id="toastContainer">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-lg text-white text-sm shadow-lg animate-[slideIn_0.3s_ease] transition-opacity duration-300 pointer-events-auto ${toast.type === 'error' ? 'bg-red-500' :
                                toast.type === 'success' ? 'bg-green-500' :
                                    'bg-blue-500'
                            }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-6">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from-[#1c6ef2] to-[#1a5bcc] text-white rounded-xl p-6 sm:p-10 text-center shadow-lg shadow-[#1c6ef2]/30">
                    <h2 className="text-sm mb-3 opacity-90 font-medium">Total Balance</h2>
                    <div className="text-4xl sm:text-5xl font-bold mb-3" id="balanceAmount">₦{balance.toFixed(2)}</div>
                    <div className="text-[13px] opacity-80">Available for withdrawal</div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        className="w-full py-3.5 px-5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 bg-amber-400 text-white hover:-translate-y-0.5 hover:shadow-lg"
                        onClick={() => { setIsAddMoneyOpen(true); setDrawerOverlayOpen(true); setAddAmount(''); }}
                    >
                        + Add Money
                    </button>
                    <button
                        className="w-full py-3.5 px-5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 bg-blue-600 text-white hover:-translate-y-0.5 hover:shadow-lg"
                        onClick={() => { setIsWithdrawOpen(true); setDrawerOverlayOpen(true); }}
                    >
                        ↘ Withdraw
                    </button>
                </div>

                {/* Transactions */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-base font-semibold mb-4 text-gray-900">Recent Transactions</h3>
                    <div className="flex flex-col gap-3" id="transactionsList">
                        {transactions.length === 0 ? (
                            <p className="text-center text-gray-600 p-5 text-sm">No transactions yet</p>
                        ) : (
                            transactions.map((t, i) => (
                                <div key={i} className={`flex justify-between items-center p-3 bg-gray-50 rounded-lg border-l-4 ${t.type === "credit" ? "border-l-green-400" : "border-l-red-500"}`}>
                                    <div className="flex flex-col">
                                        <div className="text-[13px] font-semibold text-gray-900">{t.type === "credit" ? "+" : "-"} {t.description}</div>
                                        <div className="text-xs text-gray-600 mt-0.5">{new Date(t.date).toLocaleDateString()}</div>
                                    </div>
                                    <div className={`text-sm font-bold ${t.type === "credit" ? "text-green-500" : "text-red-500"}`}>
                                        {t.type === "credit" ? "+" : "-"}₦{t.amount.toFixed(2)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Drawers */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${drawerOverlayOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={closeDrawers}
            ></div>

            {/* Add Money Drawer */}
            <div
                className={`fixed right-0 bottom-0 top-0 w-full sm:w-[400px] max-w-full bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.15)] z-50 overflow-y-auto transition-transform duration-300 ${isAddMoneyOpen ? 'translate-x-0' : 'translate-x-full'}`}
                id="addMoneyDrawer"
            >
                <div className="flex flex-col h-full">
                    <div className="bg-blue-600 text-white p-5 flex justify-between items-center shrink-0">
                        <h3 className="text-lg font-semibold">Add Money</h3>
                        <button className="bg-transparent border-none text-white text-2xl cursor-pointer" onClick={closeDrawers}>×</button>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Amount (₦)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={addAmount}
                                onChange={(e) => setAddAmount(e.target.value)}
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            />
                        </div>
                        <button
                            className="w-full py-3.5 px-5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 bg-amber-400 text-white hover:-translate-y-0.5 hover:shadow-lg mt-2.5"
                            onClick={handleAddMoney}
                        >
                            Proceed to Payment
                        </button>
                    </div>
                </div>
            </div>

            {/* Withdraw Drawer */}
            <div
                className={`fixed right-0 bottom-0 top-0 w-full sm:w-[400px] max-w-full bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.15)] z-50 overflow-y-auto transition-transform duration-300 ${isWithdrawOpen ? 'translate-x-0' : 'translate-x-full'}`}
                id="withdrawDrawer"
            >
                <div className="flex flex-col h-full">
                    <div className="bg-blue-600 text-white p-5 flex justify-between items-center shrink-0">
                        <h3 className="text-lg font-semibold">Withdraw Funds</h3>
                        <button className="bg-transparent border-none text-white text-2xl cursor-pointer" onClick={closeDrawers}>×</button>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Amount (₦)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            />
                        </div>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Bank Account Number</label>
                            <input
                                type="text"
                                placeholder="1234567890"
                                value={bankAccount}
                                onChange={(e) => setBankAccount(e.target.value)}
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            />
                        </div>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Bank Name</label>
                            <input
                                type="text"
                                placeholder="GTBank, Zenith, etc."
                                value={routingNumber}
                                onChange={(e) => setRoutingNumber(e.target.value)}
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            />
                        </div>
                        <button
                            className="w-full py-3.5 px-5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 bg-amber-400 text-white hover:-translate-y-0.5 hover:shadow-lg mt-2.5"
                            onClick={handleWithdraw}
                        >
                            Withdraw Funds
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <div className={`fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300 ${paymentModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}></div>
            <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-[95%] max-w-none md:max-w-[500px] md:w-[90%] z-[9999] p-5 sm:p-8 md:p-10 text-center transition-all duration-300 ${paymentModalOpen ? 'scale-100 opacity-100 visible' : 'scale-95 opacity-0 invisible'}`}>
                <div className="w-full">
                    {paymentState === 'loading' && (
                        <div className="min-h-[300px] flex flex-col items-center justify-center">
                            <div className="mb-6 flex justify-center">
                                <div className="w-[50px] h-[50px] border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900">Processing</h3>
                            <p className="text-sm text-gray-600 mb-6">Please wait while we verify your transaction...</p>
                        </div>
                    )}
                    {paymentState === 'success' && (
                        <div className="min-h-[300px] flex flex-col items-center justify-center">
                            <div className="mb-6 flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <span className="text-3xl text-green-500">✓</span>
                                </div>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900">Payment Successful!</h3>
                            <p className="text-sm text-gray-600 mb-6">Your wallet has been funded.</p>
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left w-full">
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-[13px] text-gray-600 font-medium">Amount</span>
                                    <span className="text-[13px] text-gray-900 font-semibold break-all">{paymentDetails.amount}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-[13px] text-gray-600 font-medium">Reference</span>
                                    <span className="text-[13px] text-gray-900 font-semibold break-all">{paymentDetails.reference}</span>
                                </div>
                            </div>
                            <button
                                className="w-full py-3 px-6 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-blue-700 hover:shadow-lg"
                                onClick={() => { setPaymentModalOpen(false); setPaymentState('idle'); }}
                            >
                                Close
                            </button>
                        </div>
                    )}
                    {paymentState === 'failed' && (
                        <div className="min-h-[300px] flex flex-col items-center justify-center">
                            <div className="mb-6 flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                    <span className="text-3xl text-red-500">✕</span>
                                </div>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold mb-3 text-gray-900">Payment Failed</h3>
                            <p className="text-sm text-gray-600 mb-6">{paymentDetails.message}</p>
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left w-full">
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-[13px] text-gray-600 font-medium">Reference</span>
                                    <span className="text-[13px] text-gray-900 font-semibold break-all">{paymentDetails.reference || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-gray-300"
                                    onClick={() => { setPaymentModalOpen(false); setPaymentState('idle'); }}
                                >
                                    Close
                                </button>
                                <button
                                    className="flex-1 py-3 px-6 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-blue-700 hover:shadow-lg"
                                    onClick={retryPayment}
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
