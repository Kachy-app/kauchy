"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthWall } from '@/context/AuthGateContext';
import { useRouter } from 'next/navigation';
import ProductModal from '@/components/ProductModal';

interface CartItem {
    id: number;
    user: number;
    product: number;
    quantity: number;
    product_name: string;
    product_image: string[] | null;
    product_price: number;
    vendor_name: string;
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface CheckoutResult {
    message: string;
    total_amount_naira: number;
    orders_created: number;
    orders: Array<{
        order_id: string;
        vendor_id: number;
        amount: number;
        status: string;
    }>;
}

export default function CartPage(): JSX.Element {
    const { user, logout, loading: authLoading } = useAuth();
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Checkout states
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
    const [checkoutError, setCheckoutError] = useState<{ error: string; balance_naira?: number; required_naira?: number } | null>(null);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);

    // Toast State
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    useEffect(() => {
        if (user) {
            fetchCart();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchCart = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/cart-items/`, {
                headers: {
                    Authorization: `Bearer ${user?.access}`,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    showToast('Session expired. Redirecting to login...', 'error');
                    setTimeout(() => logout(), 1500);
                    return;
                }
                showToast('Failed to load cart.', 'error');
                return;
            }

            const data = await res.json();
            setCartItems(data);
        } catch (e) {
            console.error(e);
            showToast('Failed to load cart. Check your connection.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const removeFromCart = async (cartItemId: number) => {
        // Optimistic removal
        const previousItems = [...cartItems];
        setCartItems(prev => prev.filter(item => item.id !== cartItemId));

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/cart-items/${cartItemId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${user?.access}` }
            });

            if (res.ok) {
                showToast('Item removed from cart', 'success');
            } else {
                // Revert on failure
                setCartItems(previousItems);
                showToast('Failed to remove item', 'error');
            }
        } catch (e) {
            console.error("Failed to remove item", e);
            setCartItems(previousItems);
            showToast('Failed to remove item. Check your connection.', 'error');
        }
    };

    const updateQuantity = async (cartItemId: number, change: number) => {
        const item = cartItems.find(i => i.id === cartItemId);
        if (!item) return;

        const newQty = (item.quantity || 1) + change;
        if (newQty <= 0) {
            removeFromCart(cartItemId);
            return;
        }

        // Optimistic update
        setCartItems(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity: newQty } : i));

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/cart-items/${cartItemId}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${user?.access}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ quantity: newQty })
            });

            if (!res.ok) {
                const errorData = await res.json();
                showToast(errorData.message || 'Failed to update quantity', 'error');
                // Revert to original quantity on failure
                setCartItems(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity: item.quantity } : i));
            }
        } catch (e) {
            console.error("Failed to update quantity", e);
            showToast('Failed to update quantity. Check your connection.', 'error');
            // Revert on network failure
            setCartItems(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity: item.quantity } : i));
        }
    };

    const subtotal = cartItems.reduce((acc, item) => {
        const price = Number(item.product_price || 0);
        const qty = Number(item.quantity || 1);
        return acc + (price * qty);
    }, 0);

    const handleCheckoutAll = async () => {
        if (cartItems.length === 0) {
            showToast("Your cart is empty", 'error');
            return;
        }

        setCheckoutLoading(true);
        setShowCheckoutModal(true);
        setCheckoutResult(null);
        setCheckoutError(null);

        try {
            const cartIds = cartItems.map(item => item.id);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payment/create-order/`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user?.access}`
                },
                body: JSON.stringify({ cart_id: cartIds })
            });

            const data = await res.json();

            if (res.ok) {
                setCheckoutResult(data);
                showToast('Checkout successful! Orders created.', 'success');
                // Refresh cart — backend already cleared the items
                setCartItems([]);
            } else if (res.status === 400 && data.error?.includes('Insufficient funds')) {
                setCheckoutError({
                    error: data.error,
                    balance_naira: data.balance_naira,
                    required_naira: data.required_naira
                });
            } else if (res.status === 401) {
                showToast('Session expired. Redirecting to login...', 'error');
                setShowCheckoutModal(false);
                setTimeout(() => logout(), 1500);
                return;
            } else if (res.status === 404) {
                setCheckoutError({ error: data.error || "Wallet not found. Please set up your wallet first." });
            } else if (res.status === 409) {
                setCheckoutError({ error: data.error || "Stock conflict. Please refresh and try again." });
                // Refresh cart to get updated data
                fetchCart();
            } else {
                setCheckoutError({ error: data.error || "Checkout failed. Please try again." });
            }
        } catch (e) {
            console.error("Checkout error:", e);
            setCheckoutError({ error: "Network error. Please check your connection and try again." });
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleProductClick = async (productId: number) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${productId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedProduct(data);
                setIsModalOpen(true);
            }
        } catch (e) { }
    };

    const closeCheckoutModal = () => {
        setShowCheckoutModal(false);
        setCheckoutResult(null);
        setCheckoutError(null);
    };

    if (!user) {
        return <AuthWall reason="view your cart" loading={authLoading} />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-6 container mx-auto px-2.5 py-5 sm:px-5 sm:py-10" style={{ minWidth: '100%' }}>

            {/* Toast Container */}
            <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-lg text-white text-sm shadow-lg animate-[slideIn_0.3s_ease] transition-opacity duration-300 ${toast.type === 'error' ? 'bg-red-500' :
                                toast.type === 'success' ? 'bg-green-500' :
                                    'bg-blue-500'
                            }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* Cart Items Section */}
            <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold mb-2 text-[#1d1d1d] dark:text-white">Shopping Cart</h2>

                {loading ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 sm:p-8 text-center shadow-legacy-card">
                        <p>Loading cart...</p>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl p-16 text-center shadow-legacy-card flex flex-col items-center">
                        <div className="text-5xl mb-4">🛒</div>
                        <div className="text-gray-500 dark:text-gray-400 text-lg mb-6">Your cart is empty</div>
                        <button
                            onClick={() => router.push('/')}
                            className="bg-[#ffb800] text-white py-3 px-8 rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                        >
                            Continue Shopping
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {cartItems.map((item) => {
                            const imageSrc = item.product_image?.[0] || '/placeholder.svg';
                            const name = item.product_name || 'Unknown Product';
                            const price = Number(item.product_price || 0);
                            const qty = Number(item.quantity || 1);
                            const vendorName = item.vendor_name || 'Unknown Vendor';

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-legacy-card hover:shadow-legacy-hover group transition-all duration-300 grid grid-cols-[100px_1fr] md:grid-cols-[200px_1fr_auto] gap-4 cursor-pointer hover:-translate-y-1"
                                    onClick={() => handleProductClick(item.product)}
                                >
                                    <img
                                        src={imageSrc}
                                        alt={name}
                                        className="w-full h-[100px] md:h-[200px] rounded-lg object-cover bg-gray-50 dark:bg-zinc-800"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                                    />
                                    <div className="flex flex-col justify-between py-1">
                                        <div>
                                            <div className="text-base font-semibold text-[#1d1d1d] dark:text-white mb-1">{name}</div>
                                            <div className="text-sm text-[#4b4b4b] dark:text-gray-400">{vendorName}</div>
                                        </div>
                                        <div className="text-sm text-[#ffb800] font-bold">₦{price.toFixed(2)}</div>
                                    </div>
                                    <div className="flex flex-col items-end justify-between gap-3">
                                        <div className="flex items-center gap-2 bg-[#f4f6fa] dark:bg-zinc-950 rounded-md p-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                className="w-6 h-6 flex items-center justify-center bg-white dark:bg-zinc-900 rounded shadow-sm hover:shadow text-sm text-[#1d1d1d] dark:text-white"
                                                onClick={() => updateQuantity(item.id, -1)}
                                            >−</button>
                                            <input
                                                type="text"
                                                className="w-8 text-center bg-transparent border-none text-sm font-semibold focus:outline-none"
                                                value={qty}
                                                readOnly
                                            />
                                            <button
                                                className="w-6 h-6 flex items-center justify-center bg-white dark:bg-zinc-900 rounded shadow-sm hover:shadow text-sm text-[#1d1d1d] dark:text-white"
                                                onClick={() => updateQuantity(item.id, 1)}
                                            >+</button>
                                        </div>
                                        <button
                                            className="bg-[#ff4d4d] text-white px-3 py-1.5 rounded-md text-xs hover:scale-105 transition-transform duration-300"
                                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cart Summary */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 sm:p-6 shadow-legacy-card h-fit sticky top-[100px]">
                <h3 className="text-base font-semibold mb-4 text-[#1d1d1d] dark:text-white">Order Summary</h3>
                <div className="flex justify-between mb-3 text-sm text-[#4b4b4b] dark:text-gray-400">
                    <span>Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-[#1d1d1d] dark:text-white">₦{subtotal.toFixed(2)}</span>
                </div>
                <div className="h-[1px] bg-gray-200 dark:bg-zinc-700 my-4"></div>
                <div className="flex justify-between mb-6 text-lg font-bold text-[#1d1d1d] dark:text-white">
                    <span>Total</span>
                    <span>₦{subtotal.toFixed(2)}</span>
                </div>
                <button
                    className="w-full py-3.5 bg-[#ffb800] text-white rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,184,0,0.3)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={cartItems.length === 0 || checkoutLoading}
                    onClick={handleCheckoutAll}
                >
                    {checkoutLoading ? 'Processing...' : 'Checkout All'}
                </button>
            </div>

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300"></div>
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-[95%] max-w-none md:max-w-[500px] md:w-[90%] z-[9999] p-5 sm:p-8 md:p-10 text-center transition-all duration-300">

                        {/* Loading */}
                        {checkoutLoading && (
                            <div className="min-h-[250px] flex flex-col items-center justify-center">
                                <div className="mb-6">
                                    <div className="w-[50px] h-[50px] border-4 border-gray-200 dark:border-zinc-800 border-t-blue-600 rounded-full animate-spin"></div>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Processing Order</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we process your checkout...</p>
                            </div>
                        )}

                        {/* Success */}
                        {!checkoutLoading && checkoutResult && (
                            <div className="min-h-[250px] flex flex-col items-center justify-center">
                                <div className="mb-6">
                                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                        <span className="text-3xl text-green-500">✓</span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Order Placed!</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{checkoutResult.message}</p>
                                <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 mb-6 text-left w-full">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-zinc-800">
                                        <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">Total Amount</span>
                                        <span className="text-[13px] text-gray-900 dark:text-white font-semibold">₦{checkoutResult.total_amount_naira.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-zinc-800">
                                        <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">Orders Created</span>
                                        <span className="text-[13px] text-gray-900 dark:text-white font-semibold">{checkoutResult.orders_created}</span>
                                    </div>
                                    {checkoutResult.orders.map((order, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-zinc-800 last:border-0">
                                            <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">{order.order_id}</span>
                                            <span className="text-[13px] text-amber-600 font-semibold capitalize">{order.status}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3 w-full">
                                    <button
                                        className="flex-1 py-3 px-6 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-300 dark:hover:bg-zinc-600"
                                        onClick={() => { closeCheckoutModal(); router.push('/'); }}
                                    >
                                        Continue Shopping
                                    </button>
                                    <button
                                        className="flex-1 py-3 px-6 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:shadow-lg"
                                        onClick={() => { closeCheckoutModal(); router.push('/orders'); }}
                                    >
                                        View Orders
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {!checkoutLoading && checkoutError && (
                            <div className="min-h-[250px] flex flex-col items-center justify-center">
                                <div className="mb-6">
                                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                        <span className="text-3xl text-red-500">✕</span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Checkout Failed</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{checkoutError.error}</p>

                                {checkoutError.balance_naira !== undefined && checkoutError.required_naira !== undefined && (
                                    <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 mb-6 text-left w-full">
                                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-zinc-800">
                                            <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">Your Balance</span>
                                            <span className="text-[13px] text-red-500 font-semibold">₦{checkoutError.balance_naira.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">Required</span>
                                            <span className="text-[13px] text-gray-900 dark:text-white font-semibold">₦{checkoutError.required_naira.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 w-full">
                                    <button
                                        className="flex-1 py-3 px-6 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-300 dark:hover:bg-zinc-600"
                                        onClick={closeCheckoutModal}
                                    >
                                        Close
                                    </button>
                                    {checkoutError.balance_naira !== undefined ? (
                                        <button
                                            className="flex-1 py-3 px-6 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:shadow-lg"
                                            onClick={() => { closeCheckoutModal(); router.push('/wallet'); }}
                                        >
                                            Add Funds
                                        </button>
                                    ) : (
                                        <button
                                            className="flex-1 py-3 px-6 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-blue-700 hover:shadow-lg"
                                            onClick={() => { closeCheckoutModal(); handleCheckoutAll(); }}
                                        >
                                            Try Again
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {isModalOpen && selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setIsModalOpen(false)}
                    addToCart={() => { }}
                />
            )}

            <style jsx>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
