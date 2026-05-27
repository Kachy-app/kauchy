"use client";
import React, { useState, useEffect } from 'react';
import ProductModal from '@/components/ProductModal';
import { useToast } from '@/context/ToastContext';


export default function LeaderboardPage() {
    const { showToast } = useToast();
    const [vendors, setVendors] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('vendors');
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const [vRes, cRes, pRes] = await Promise.all([
                    fetch('https://kachy-production.up.railway.app/customers/top-vendors/').then(r => r.ok ? r.json() : []),
                    fetch('https://kachy-production.up.railway.app/customers/top-customers/').then(r => r.ok ? r.json() : []),
                    fetch('https://kachy-production.up.railway.app/analytics/top-products/').then(r => r.ok ? r.json() : [])
                ]);
                setVendors(Array.isArray(vRes) ? vRes : []);
                setCustomers(Array.isArray(cRes) ? cRes : []);
                setTrendingProducts(Array.isArray(pRes) ? pRes : []);
            } catch (e) {
                console.error(e);
                showToast("Failed to load leaderboard data", "error");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const openProduct = (p: any) => {
        setSelectedProduct(p);
        setIsModalOpen(true);
    };

    const getRankClass = (index: number) => {
        if (index === 0) return 'bg-[#ffd700] text-[#8b6914]';
        if (index === 1) return 'bg-[#c0c0c0] text-[#696969]';
        if (index === 2) return 'bg-[#cd7f32] text-[#6b4423]';
        return 'bg-gray-50 text-gray-600';
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading...</div>;

    return (
        <div className="min-h-screen font-sans bg-gray-50 text-gray-900">
            <main className="w-full max-w-[1400px] mx-auto py-5 px-2.5 sm:py-10 sm:px-5">
                <div className="flex flex-col gap-4 sm:gap-6">
                    <h1 className="text-3xl font-bold">Leaderboard</h1>

                    <div className="flex gap-3 overflow-x-auto border-b border-gray-200">
                        <button
                            className={`px-5 py-3 bg-transparent border-0 border-b-2 transition-all duration-300 text-sm font-semibold cursor-pointer whitespace-nowrap hover:text-blue-600 ${activeTab === 'vendors' ? 'text-blue-600 border-blue-600' : 'border-transparent text-gray-600'}`}
                            onClick={() => setActiveTab('vendors')}
                        >
                            Top Vendors
                        </button>
                        <button
                            className={`px-5 py-3 bg-transparent border-0 border-b-2 transition-all duration-300 text-sm font-semibold cursor-pointer whitespace-nowrap hover:text-blue-600 ${activeTab === 'buyers' ? 'text-blue-600 border-blue-600' : 'border-transparent text-gray-600'}`}
                            onClick={() => setActiveTab('buyers')}
                        >
                            Top Customers
                        </button>
                        <button
                            className={`px-5 py-3 bg-transparent border-0 border-b-2 transition-all duration-300 text-sm font-semibold cursor-pointer whitespace-nowrap hover:text-blue-600 ${activeTab === 'products' ? 'text-blue-600 border-blue-600' : 'border-transparent text-gray-600'}`}
                            onClick={() => setActiveTab('products')}
                        >
                            Trending Products
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        {activeTab === 'vendors' && (
                            <div className="animate-fadeIn">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold mb-2">Top Vendors</h2>
                                    <p className="text-sm text-gray-600">Highest performing sellers on Upstart</p>
                                </div>
                                <div className="flex flex-col gap-3 md:gap-4">
                                    {vendors.map((v, i) => (
                                        <div key={i} className="bg-white rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm transition-all duration-300 hover:translate-x-1 hover:shadow-md md:p-5 md:text-left text-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shrink-0 mb-1.5 md:mb-0 mx-auto md:mx-0 ${getRankClass(i)}`}>{i + 1}</div>
                                            <img src={v.profile_url || '/placeholder.svg'} className="w-12 h-12 rounded-full object-cover shrink-0 mx-auto md:mx-0" alt={v.username} />
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-gray-900 mb-1">{v.username || v.firstName || 'Unknown User'}</div>
                                                <div className="text-xs text-gray-600">{v.institute || 'Institute N/A'}</div>
                                            </div>
                                            <div className="flex gap-4 sm:gap-6 items-center justify-center md:justify-start w-full md:w-auto">
                                                <div className="text-right">
                                                    <span className="block text-base font-bold text-blue-600">{v.total_sales || 0}</span>
                                                    <span className="block text-[11px] text-gray-600 mt-0.5">Sales</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {vendors.length === 0 && <p className="text-gray-500 text-center py-4">No vendor data available.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'buyers' && (
                            <div className="animate-fadeIn">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold mb-2">Top Customers</h2>
                                    <p className="text-sm text-gray-600">Most active buyers</p>
                                </div>
                                <div className="flex flex-col gap-3 md:gap-4">
                                    {customers.map((c, i) => (
                                        <div key={i} className="bg-white rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm transition-all duration-300 hover:translate-x-1 hover:shadow-md md:p-5 md:text-left text-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shrink-0 mb-1.5 md:mb-0 mx-auto md:mx-0 ${getRankClass(i)}`}>{i + 1}</div>
                                            <img src={'/placeholder.svg'} className="w-12 h-12 rounded-full object-cover shrink-0 mx-auto md:mx-0" alt={c.username} />
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-gray-900 mb-1">{c.username || c.email}</div>
                                                <div className="text-xs text-gray-600">Customer</div>
                                            </div>
                                            <div className="flex gap-4 sm:gap-6 items-center justify-center md:justify-start w-full md:w-auto">
                                                <div className="text-right">
                                                    <span className="block text-base font-bold text-blue-600">{c.total_orders || 0}</span>
                                                    <span className="block text-[11px] text-gray-600 mt-0.5">Orders</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {customers.length === 0 && <p className="text-gray-500 text-center py-4">No customer data available.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'products' && (
                            <div className="animate-fadeIn">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold mb-2">Trending Products</h2>
                                    <p className="text-sm text-gray-600">Most viewed and purchased items</p>
                                </div>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                                    {trendingProducts.map((p, i) => (
                                        <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl" onClick={() => openProduct(p)}>
                                            <img src={p.image_url?.[0] || '/placeholder.svg'} className="w-full h-[140px] object-cover bg-gray-50" alt={p.product_name} />
                                            <div className="p-3">
                                                <div className="text-[13px] font-semibold text-gray-900 mb-1">{p.product_name}</div>
                                                <div className="text-sm font-bold text-amber-400 mb-1">₦{p.price}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {trendingProducts.length === 0 && <p className="text-gray-500 text-center py-4 col-span-full">No trending products available.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {isModalOpen && selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setIsModalOpen(false)}
                    addToCart={() => { }}
                />
            )}
        </div>
    );
}
