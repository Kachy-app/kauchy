"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRScannerOverlay from '@/components/QRScannerOverlay';
import { useAuth } from '@/context/AuthContext';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'qrcode' | 'camera'>('qrcode');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const currentUserName = user?.user?.username || user?.username;

    // Effect to handle responsive sidebar state
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchOrders = useCallback(async () => {
        if (!user?.access) return;
        setLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:8000/orders/my_orders/', {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.access}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setOrders(data);
                // Update selected order if it exists
                if (selectedOrder) {
                    const updatedSelected = data.find((o: any) => o.id === selectedOrder.id);
                    if (updatedSelected) {
                        setSelectedOrder(updatedSelected);
                    } else {
                        setSelectedOrder(null);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    }, [user, selectedOrder]);

    useEffect(() => {
        fetchOrders();
    }, [user]);

    const handleVendorResponse = async (orderId: string, action: 'accept' | 'reject') => {
        if (!user?.access) return;
        try {
            const response = await fetch('http://127.0.0.1:8000/orders/respond/', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.access}`
                },
                body: JSON.stringify({ order_id: orderId, action })
            });
            if (response.ok) {
                const result = await response.json();
                // If rejected it might be deleted or set to expired, either way refresh list
                fetchOrders();
            } else {
                const errData = await response.json();
                alert(errData.error || "Failed to respond to order");
            }
        } catch (error) {
            console.error("Error responding to order:", error);
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleOrderClick = (order: any) => {
        setSelectedOrder(order);
        setScanResult(null);
        setValidationStatus('idle');
        setValidationMessage(null);
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
        // Auto-select the correct tab based on role
        const isBuyer = currentUserName && order.buyer_username === currentUserName;
        const isVendor = currentUserName && order.vendor_username === currentUserName;
        if (isVendor) {
            setActiveTab('qrcode');
        } else if (isBuyer) {
            setActiveTab('camera');
        } else {
            setActiveTab('qrcode');
        }
    };

    const handleScanSuccess = useCallback(async (data: string) => {
        setScanResult(data);
        setIsScannerOpen(false);
        setValidationStatus('loading');
        setValidationMessage('Validating order...');

        try {
            let parsedData;
            try {
                parsedData = JSON.parse(data);
            } catch (e) {
                setValidationStatus('error');
                setValidationMessage('Invalid QR code format.');
                return;
            }

            const orderId = parsedData.id || data;

            if (!user?.access) {
                 setValidationStatus('error');
                 setValidationMessage('Authentication required.');
                 return;
            }

            const response = await fetch('http://127.0.0.1:8000/orders/validate_order_qr/', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.access}`
                },
                body: JSON.stringify({ order_id: orderId })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                setValidationStatus('error');
                setValidationMessage(errData.error || errData.detail || 'Failed to validate order.');
                return;
            }

            const result = await response.json();
            setValidationStatus('success');
            setValidationMessage(result.message || 'Order validated successfully.');
            
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: result.order_status || 'completed' });
            }

        } catch (error) {
            console.error("Error validating order:", error);
            setValidationStatus('error');
            setValidationMessage('Network error while validating order.');
        }
    }, [user, selectedOrder]);

    return (
        <div className="flex h-[calc(100vh-70px)] overflow-hidden relative lg:grid lg:grid-cols-[320px_1fr] bg-[#f4f6fa]">

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 top-[70px] bg-black/40 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                ref={sidebarRef}
                className={`fixed inset-y-0 left-0 top-[70px] bottom-0 w-[300px] sm:w-[85vw] sm:max-w-[320px] bg-white border-r border-[#e5e7eb] z-50 transition-transform duration-300 lg:relative lg:w-full lg:inset-auto lg:transform-none lg:z-0 lg:flex lg:flex-col lg:h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className="p-4 border-b border-[#e5e7eb] bg-white shrink-0 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-[#1d1d1d]">Orders</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#4b4b4b] hover:text-[#1d1d1d]">
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-[#4b4b4b]">Loading orders...</div>
                    ) : orders.length === 0 ? (
                        <div className="p-4 text-center text-[#4b4b4b]">No orders found.</div>
                    ) : (
                        orders.map(order => (
                            <div
                                key={order.id}
                                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors duration-200 hover:bg-[#f4f6fa] ${selectedOrder?.id === order.id ? 'bg-[#f4f6fa] border-l-[3px] border-l-[#1c6ef2]' : ''}`}
                                onClick={() => handleOrderClick(order)}
                            >
                                <div className="flex justify-between mb-1.5">
                                    <span className="font-semibold text-sm text-[#1d1d1d]">{order.id}</span>
                                    <span className="text-[11px] text-[#4b4b4b]">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="text-xs text-[#4b4b4b] mb-2 leading-snug">
                                    <div className="truncate">Buyer: {order.buyer_username}</div>
                                    <div className="truncate">Vendor: {order.vendor_username}</div>
                                </div>
                                <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${order.status === 'pending' ? 'bg-[#fff3cd] text-[#856404]' :
                                        (order.status === 'successful' || order.status === 'completed') ? 'bg-[#d4edda] text-[#155724]' :
                                            'bg-[#f8d7da] text-[#721c24]'
                                        }`}
                                >
                                    {order.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-[#f4f6fa] h-full overflow-hidden flex flex-col w-full relative">
                {/* Mobile Sidebar Toggle Button (Visible when sidebar is closed) */}
                {!isSidebarOpen && (
                    <button
                        onClick={toggleSidebar}
                        className="absolute top-4 left-4 z-30 p-2 bg-white rounded-md shadow-md lg:hidden text-[#1d1d1d] hover:bg-gray-50 active:scale-95 transition-all"
                        aria-label="Toggle Menu"
                    >
                        ☰
                    </button>
                )}

                {selectedOrder ? (
                    <div className="flex flex-col h-full bg-white pt-16 lg:pt-0"> {/* Adjusted top padding for mobile toggle space */}
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#e5e7eb] bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={toggleSidebar} className="lg:hidden text-xl text-[#1d1d1d] mr-2">☰</button>
                                <h2 className="text-xl font-bold text-[#1d1d1d]">Order Details</h2>
                            </div>
                            <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${selectedOrder.status === 'pending' ? 'bg-[#fff3cd] text-[#856404]' :
                                    selectedOrder.status === 'successful' ? 'bg-[#d4edda] text-[#155724]' :
                                        'bg-[#f8d7da] text-[#721c24]'
                                    }`}
                            >
                                {selectedOrder.status}
                            </span>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center gap-6 sm:gap-8">

                            {/* Order Info Card */}
                            <div className="w-full max-w-[600px] bg-[#f4f6fa] p-5 rounded-xl border border-[#e5e7eb]">
                                <h3 className="text-base font-semibold text-[#1d1d1d] border-b border-gray-300 pb-2 mb-4">Order Info</h3>
                                <div className="flex justify-between mb-3 text-sm">
                                    <span className="font-medium text-[#4b4b4b]">Order ID</span>
                                    <span className="font-semibold text-[#1d1d1d]">{selectedOrder.id}</span>
                                </div>
                                <div className="flex justify-between mb-3 text-sm">
                                    <span className="font-medium text-[#4b4b4b]">Date</span>
                                    <span className="font-semibold text-[#1d1d1d]">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between mb-3 text-sm">
                                    <span className="font-medium text-[#4b4b4b]">Total Amount</span>
                                    <span className="font-semibold text-[#1d1d1d]">₦{selectedOrder.amount}</span>
                                </div>
                            </div>

                            {/* Items Card */}
                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                                <div className="w-full max-w-[600px] bg-[#f4f6fa] p-5 rounded-xl border border-[#e5e7eb]">
                                    <h3 className="text-base font-semibold text-[#1d1d1d] border-b border-gray-300 pb-2 mb-4">Items Ordered</h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items.map((item: any) => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <div className="flex gap-2">
                                                    <span className="font-medium text-[#1d1d1d]">{item.quantity}x</span>
                                                    <span className="text-[#4b4b4b]">{item.product_name}</span>
                                                </div>
                                                <span className="font-semibold text-[#1d1d1d]">₦{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Parties Card */}
                            <div className="w-full max-w-[600px] bg-[#f4f6fa] p-5 rounded-xl border border-[#e5e7eb]">
                                <h3 className="text-base font-semibold text-[#1d1d1d] border-b border-gray-300 pb-2 mb-4">Parties</h3>
                                <div className="flex justify-between mb-3 text-sm">
                                    <span className="font-medium text-[#4b4b4b]">Buyer</span>
                                    <span className="font-semibold text-[#1d1d1d]">{selectedOrder.buyer_username}</span>
                                </div>
                                <div className="flex justify-between mb-3 text-sm">
                                    <span className="font-medium text-[#4b4b4b]">Vendor</span>
                                    <span className="font-semibold text-[#1d1d1d]">{selectedOrder.vendor_username}</span>
                                </div>
                            </div>

                            {/* QR/Camera Section */}
                            <div className="flex flex-col items-center w-full max-w-[400px]">
                                <div className="flex bg-[#f4f6fa] p-1 rounded-lg mb-4 w-full justify-center gap-1 border border-[#e5e7eb]">
                                    {(!currentUserName || selectedOrder.buyer_username !== currentUserName) && (
                                        <button
                                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'qrcode' ? 'bg-white text-[#1c6ef2] shadow-sm' : 'text-[#4b4b4b] hover:bg-white/50'}`}
                                            onClick={() => setActiveTab('qrcode')}
                                        >
                                            QR Code
                                        </button>
                                    )}
                                    {(!currentUserName || selectedOrder.vendor_username !== currentUserName) && (
                                        <button
                                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'camera' ? 'bg-white text-[#1c6ef2] shadow-sm' : 'text-[#4b4b4b] hover:bg-white/50'}`}
                                            onClick={() => setActiveTab('camera')}
                                        >
                                            Scan Camera
                                        </button>
                                    )}
                                </div>

                                <div className="w-[300px] h-[300px] bg-[#f4f6fa] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative p-5">
                                    {activeTab === 'qrcode' ? (
                                        <div className="flex flex-col items-center animate-fadeIn w-full h-full">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(JSON.stringify({ id: selectedOrder.id, status: selectedOrder.status }))}`}
                                                alt="QR Code"
                                                className="w-full h-full object-contain mix-blend-multiply"
                                            />
                                            <p className="text-xs text-[#4b4b4b] mt-3 text-center">Scan this code to verify</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-[#4b4b4b] animate-fadeIn w-full h-full justify-center">
                                            {scanResult ? (
                                                <>
                                                    {validationStatus === 'loading' ? (
                                                        <>
                                                            <div className="w-14 h-14 border-4 border-gray-200 border-t-[#1c6ef2] rounded-full animate-spin mb-2"></div>
                                                            <p className="text-sm font-semibold text-[#1d1d1d]">Validating...</p>
                                                            <p className="text-xs text-[#4b4b4b] text-center mt-1">{validationMessage}</p>
                                                        </>
                                                    ) : validationStatus === 'success' ? (
                                                        <>
                                                            <div className="w-14 h-14 rounded-full bg-[#34D399]/10 flex items-center justify-center mb-2">
                                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            </div>
                                                            <p className="text-sm font-semibold text-[#155724]">Validation Successful!</p>
                                                            <p className="text-xs text-[#4b4b4b] text-center max-w-[220px] mt-1">{validationMessage}</p>
                                                            <button
                                                                onClick={() => { setScanResult(null); setValidationStatus('idle'); setIsScannerOpen(true); }}
                                                                className="text-[#1c6ef2] text-xs font-semibold hover:underline mt-4"
                                                            >
                                                                Scan Another Code
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-2">
                                                                <span className="text-3xl text-red-500">✕</span>
                                                            </div>
                                                            <p className="text-sm font-semibold text-red-600">Validation Failed</p>
                                                            <p className="text-xs text-[#4b4b4b] text-center max-w-[220px] mt-1">{validationMessage}</p>
                                                            <button
                                                                onClick={() => { setScanResult(null); setValidationStatus('idle'); setIsScannerOpen(true); }}
                                                                className="text-[#1c6ef2] text-xs font-semibold hover:underline mt-4"
                                                            >
                                                                Try Again
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1c6ef2]/10 to-[#34D399]/10 flex items-center justify-center">
                                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1c6ef2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="2" y="2" width="8" height="8" rx="1" />
                                                            <rect x="14" y="2" width="8" height="8" rx="1" />
                                                            <rect x="2" y="14" width="8" height="8" rx="1" />
                                                            <rect x="14" y="14" width="4" height="4" rx="0.5" />
                                                            <line x1="22" y1="14" x2="22" y2="22" />
                                                            <line x1="14" y1="22" x2="22" y2="22" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm font-semibold text-[#1d1d1d]">Scan QR Code</p>
                                                    <p className="text-xs text-[#4b4b4b] text-center">Open the scanner to verify this order</p>
                                                    <button
                                                        onClick={() => setIsScannerOpen(true)}
                                                        className="bg-[#1c6ef2] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#1c6ef2]/25 transition-all active:scale-95 flex items-center gap-2"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                                        </svg>
                                                        Start Scanning
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Vendor Respond Buttons */}
                                {currentUserName && selectedOrder.vendor_username === currentUserName && selectedOrder.status === 'pending' && (
                                    <div className="flex flex-col items-center w-full max-w-[400px] mt-6 gap-3 pt-6 border-t border-gray-200">
                                        <p className="text-sm text-gray-600 mb-2 font-medium">Respond to this Order:</p>
                                        <button
                                            onClick={() => handleVendorResponse(selectedOrder.id, 'accept')}
                                            className="w-full bg-[#1c6ef2] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#1c6ef2]/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Accept Order
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Are you sure you want to reject this order? The buyer will be refunded and stock returned.")) {
                                                    handleVendorResponse(selectedOrder.id, 'reject');
                                                }
                                            }}
                                            className="w-full bg-white border border-red-200 text-red-600 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                            Reject Order
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#4b4b4b]">
                        <button onClick={toggleSidebar} className="lg:hidden absolute top-4 left-4 p-2 bg-white rounded-md shadow-sm z-10 text-xl">☰</button>
                        <div className="text-6xl mb-4">📦</div>
                        <p className="text-lg">Select an order to view details</p>
                    </div>
                )}
            </div>

            {/* QR Scanner Overlay */}
            <QRScannerOverlay
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={handleScanSuccess}
                orderData={selectedOrder ? { id: selectedOrder.id, status: selectedOrder.status } : undefined}
            />
        </div>
    );
}
