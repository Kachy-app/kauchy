"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProductModal from '@/components/ProductModal';
import VideoModal from '@/components/VideoModal';


function VendorProfileContent() {
    const searchParams = useSearchParams();
    const vendorId = searchParams.get('vendorId');
    const { user } = useAuth();

    const [vendor, setVendor] = useState<any | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [content, setContent] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('products');
    const [loading, setLoading] = useState(true);

    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

    useEffect(() => {
        if (vendorId) {
            loadVendorData();
        } else {
            setLoading(false);
        }
    }, [vendorId]);

    const loadVendorData = async () => {
        try {
            // Fetch Vendor Info
            const resVendor = await fetch(`http://127.0.0.1:8000/auth/user/${vendorId}`);
            if (resVendor.ok) {
                const data = await resVendor.json();
                setVendor(data);
            }

            // Fetch Vendor Products
            const resProducts = await fetch(`http://127.0.0.1:8000/products/vendor-products/${vendorId}`);
            if (resProducts.ok) {
                const data = await resProducts.json();
                setProducts(Array.isArray(data) ? data : []);
            }

            // Fetch Vendor Content
            const resContent = await fetch(`http://127.0.0.1:8000/customers/vendorcontents/${vendorId}`);
            if (resContent.ok) {
                const data = await resContent.json();
                setContent(Array.isArray(data) ? data : []);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleContact = async () => {
        if (!user) {
            alert("Please login to contact vendor");
            return;
        }
        try {
            const res = await fetch(`http://127.0.0.1:8000/chat/create/${vendorId}`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${user.access}`,
                    "Content-Type": "application/json"
                }
            });
            if (res.ok) {
                window.location.href = '/chat';
            } else {
                alert("Failed to create conversation");
            }
        } catch (e) {
            alert("Error contacting vendor");
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: vendor?.info?.username || 'Vendor Profile',
                text: `Check out ${vendor?.info?.username}'s store on Upstart!`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading...</div>;
    if (!vendor) return <div className="p-12 text-center text-red-500">Vendor not found</div>;

    return (
        <div className="min-h-screen font-sans bg-gray-50 text-gray-900">
            <main className="w-full max-w-[1400px] mx-auto py-5 px-2.5 sm:py-10 sm:px-5">
                <div className="flex flex-col gap-6 sm:gap-10">
                    {/* Profile Card */}
                    <div className="bg-white rounded-xl p-5 sm:p-8 shadow-legacy-card">
                        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center mb-8 pb-8 border-b border-gray-200 text-center md:text-left">
                            <img
                                src={vendor.info?.profile_url || '/placeholder.svg?height=120&width=120'}
                                alt="Vendor"
                                className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full object-cover mx-auto md:mx-0 bg-gray-100"
                            />
                            <div className="flex flex-col gap-1">
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">{vendor.info?.username}</h1>
                                <p className="text-sm text-gray-600">{vendor.info?.institute || "Institute N/A"}</p>
                                <p className="text-sm text-gray-600">{vendor.info?.department || "Department N/A"}</p>
                                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                                    <span className="text-amber-400 text-base">
                                        {"★".repeat(Math.round(vendor.info?.rating || 5)) + "☆".repeat(5 - Math.round(vendor.info?.rating || 5))}
                                    </span>
                                    <span className="text-[13px] text-gray-600">({vendor.info?.reviews?.length || 0} reviews)</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
                                <button
                                    className="px-6 py-3 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg flex-1 md:flex-none"
                                    onClick={handleContact}
                                >
                                    Contact Vendor
                                </button>
                                <button
                                    className="flex items-center justify-center p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-pointer transition-all hover:bg-gray-200 hover:text-blue-600 hover:border-blue-600 shrink-0"
                                    onClick={handleShare}
                                    aria-label="Share Profile"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="18" cy="5" r="3"></circle>
                                        <circle cx="6" cy="12" r="3"></circle>
                                        <circle cx="18" cy="19" r="3"></circle>
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-base font-semibold text-gray-900">About This Seller</h3>
                            <div className="text-sm text-gray-600 leading-relaxed">
                                <p>{vendor.info?.bio || "No bio available."}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                    <span className="block text-xs text-gray-600 mb-2">Total Sales</span>
                                    <span className="block text-xl font-bold text-blue-600">{vendor.sales || 0}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                    <span className="block text-xs text-gray-600 mb-2">Rating</span>
                                    <span className="block text-xl font-bold text-blue-600">{vendor.info?.rating || "0.0"}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                    <span className="block text-xs text-gray-600 mb-2">Products</span>
                                    <span className="block text-xl font-bold text-blue-600">{products.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-3 border-b border-gray-200 overflow-x-auto mb-6">
                        <button
                            className={`px-5 py-3 bg-transparent border-0 border-b-2 transition-all duration-300 text-sm font-semibold cursor-pointer whitespace-nowrap hover:text-blue-600 ${activeTab === 'products' ? 'text-blue-600 border-blue-600' : 'border-transparent text-gray-600'}`}
                            onClick={() => setActiveTab('products')}
                        >
                            Products
                        </button>
                        <button
                            className={`px-5 py-3 bg-transparent border-0 border-b-2 transition-all duration-300 text-sm font-semibold cursor-pointer whitespace-nowrap hover:text-blue-600 ${activeTab === 'content' ? 'text-blue-600 border-blue-600' : 'border-transparent text-gray-600'}`}
                            onClick={() => setActiveTab('content')}
                        >
                            Content
                        </button>
                    </div>

                    {/* Products Grid */}
                    {activeTab === 'products' && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                                {products.length > 0 ? products.map(p => (
                                    <div key={p._id || p.id} className="bg-white rounded-xl overflow-hidden shadow-legacy-card cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-legacy-hover animate-fadeIn" onClick={() => setSelectedProduct(p)}>
                                        <img src={p.image_url?.[0] || '/placeholder.svg'} className="w-full h-[180px] object-cover bg-gray-50" alt={p.product_name} />
                                        <div className="p-4">
                                            <div className="text-sm font-semibold text-gray-900 mb-1.5">{p.product_name}</div>
                                            <div className="text-base font-bold text-amber-400">₦{p.price}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full text-center py-12 bg-white rounded-xl">
                                        <div className="text-5xl mb-3">📦</div>
                                        <p className="text-base text-gray-600">No products available.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Content Grid */}
                    {activeTab === 'content' && (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                            {content.length > 0 ? content.map((c, i) => (
                                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-legacy-card transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:shadow-legacy-hover group" onClick={() => setSelectedVideo(c)}>
                                    <div className="relative w-full h-[200px] bg-gray-50 flex items-center justify-center overflow-hidden">
                                        <video src={c.video} className="w-full h-full object-cover" muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}></video>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col items-center justify-center gap-2 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                            <span className="text-5xl drop-shadow-md text-white">▶</span>
                                        </div>
                                    </div>
                                    <div className="p-0">
                                        <div className="text-sm font-semibold text-gray-900 text-center p-2.5">{c.caption || 'Untitled'}</div>
                                        <div className="flex justify-around py-3 px-4 border-t border-gray-100">
                                            <span className="flex items-center gap-1.5 text-xs text-gray-600">💬 {c.reviews_count || 0}</span>
                                            <span className="flex items-center gap-1.5 text-xs text-gray-600">{c.is_liked_by_user ? '♥' : '♡'} {c.likes_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full text-center py-12 bg-white rounded-xl">
                                    <div className="text-5xl mb-3">🎬</div>
                                    <p className="text-base text-gray-600">No content available from this vendor.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </main>

            {selectedProduct && (
                <ProductModal
                    onClose={() => setSelectedProduct(null)}
                    product={selectedProduct}
                    addToCart={() => { }}
                />
            )}

            {selectedVideo && (
                <VideoModal
                    video={selectedVideo.video}
                    caption={selectedVideo.caption}
                    contentId={selectedVideo.id}
                    likes={selectedVideo.likes_count || 0}
                    views={selectedVideo.views || 0}
                    isLikedByUser={selectedVideo.is_liked_by_user || false}
                    reviewsCount={selectedVideo.reviews_count || 0}
                    onClose={() => setSelectedVideo(null)}
                />
            )}
        </div>
    );
}

export default function VendorProfilePage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading Vendor...</div>}>
            <VendorProfileContent />
        </Suspense>
    );
}
