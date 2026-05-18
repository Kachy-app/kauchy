"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface Product {
    _id?: string;
    id?: string | number;
    product_name: string;
    description?: string;
    price: number;
    vendor_username?: string;
    vendor_email?: string;
    vendor_id?: string;
    pfp?: string;
    institute?: string;
    image_url?: string[];
    quantity?: number;
    category?: string;
    rating?: number;
    review_count?: number;
    likes?: number;
    likes_count?: number;
    has_liked?: boolean;
    view_count?: number;
}

interface Review {
    id: number;
    user: number;
    user_name: string;
    rating: number;
    review: string;
    created_at: string;
}

interface ProductModalProps {
    product: Product | null;
    onClose: () => void;
    addToCart: (product: Product, quantity: number) => void;
}

function StarRating({ rating, onRate, interactive = false, size = 'text-base' }: { rating: number; onRate?: (r: number) => void; interactive?: boolean; size?: string }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <span
                    key={star}
                    className={`${size} transition-all duration-150 ${interactive ? 'cursor-pointer hover:scale-125' : ''} ${
                        star <= (hovered || rating) ? 'text-amber-400' : 'text-gray-300'
                    }`}
                    onClick={() => interactive && onRate?.(star)}
                    onMouseEnter={() => interactive && setHovered(star)}
                    onMouseLeave={() => interactive && setHovered(0)}
                >
                    ★
                </span>
            ))}
        </div>
    );
}

function timeAgo(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

export default function ProductModal({ product, onClose, addToCart }: ProductModalProps) {
    const [quantity, setQuantity] = useState(1);
    const { showToast } = useToast();
    const { user } = useAuth();

    // Like state
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [likeLoading, setLikeLoading] = useState(false);

    // Review state
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [totalReviews, setTotalReviews] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(0);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [activeImage, setActiveImage] = useState(0);
    const [userHasPurchased, setUserHasPurchased] = useState(false);

    const reviewsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (product) {
            setLiked(product.has_liked || false);
            setLikesCount(product.likes_count ?? product.likes ?? 0);
            setActiveImage(0);
            fetchReviews();
        }
    }, [product]);

    if (!product) return null;

    const productId = product._id || product.id;

    async function fetchReviews() {
        if (!productId) return;
        setLoadingReviews(true);
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (user && user.access) {
                headers['Authorization'] = `Bearer ${user.access}`;
            }
            const res = await fetch(`http://127.0.0.1:8000/products/${productId}/reviews/`, { headers });
            if (res.ok) {
                const data = await res.json();
                setReviews(data.reviews || []);
                setTotalReviews(data.total_reviews || 0);
                setUserHasPurchased(data.user_has_purchased || false);
            }
        } catch (e) {
            console.error('Error fetching reviews', e);
        } finally {
            setLoadingReviews(false);
        }
    }

    async function handleLikeToggle() {
        if (!user) {
            showToast('Please login to like products', 'error');
            return;
        }
        if (likeLoading || !productId) return;
        setLikeLoading(true);

        try {
            const res = await fetch(`http://127.0.0.1:8000/products/${productId}/like/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setLiked(data.has_liked);
                setLikesCount(data.likes_count);
            } else {
                showToast('Failed to update like', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        } finally {
            setLikeLoading(false);
        }
    }

    async function handleSubmitReview(e: React.FormEvent) {
        e.preventDefault();
        if (!user) {
            showToast('Please login to write a review', 'error');
            return;
        }
        if (reviewRating === 0) {
            showToast('Please select a star rating', 'error');
            return;
        }
        if (reviewText.trim().length < 3) {
            showToast('Review must be at least 3 characters', 'error');
            return;
        }
        if (submittingReview || !productId) return;
        setSubmittingReview(true);

        try {
            const res = await fetch(`http://127.0.0.1:8000/products/${productId}/reviews/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access}`,
                },
                body: JSON.stringify({ rating: reviewRating, review: reviewText }),
            });
            if (res.ok) {
                const data = await res.json();
                setReviews(prev => [data, ...prev]);
                setTotalReviews(prev => prev + 1);
                setReviewText('');
                setReviewRating(0);
                showToast('Review submitted!', 'success');
            } else {
                const err = await res.json();
                showToast(err.error || err.errors?.review?.[0] || 'Failed to submit review', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        } finally {
            setSubmittingReview(false);
        }
    }

    const handleAddToCart = () => {
        addToCart(product, quantity);
        onClose();
        setQuantity(1); // Reset
    };

    const images = product.image_url && product.image_url.length > 0 ? product.image_url : ['/placeholder.svg'];
    const mainImage = images[activeImage] || images[0];

    const handleVendorClick = () => {
        window.location.href = `/vendor-profile?vendorId=${product.vendor_id}`;
    };

    const handleShare = async () => {
        const shareUrl = new URL(window.location.href);
        const prodId = product._id || product.id;
        if (prodId) {
            shareUrl.searchParams.set("productId", prodId.toString());
        }
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Check out ${product.product_name} on Upstart`,
                    text: `I found this amazing ${product.product_name} on Upstart. Check it out!`,
                    url: shareUrl.toString(),
                });
                showToast('Product shared successfully!', 'success');
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl.toString());
                showToast('Product link copied to clipboard!', 'success');
            } catch (error) {
                showToast('Failed to copy link', 'error');
            }
        }
    };

    const isVendorPage = typeof window !== 'undefined' && window.location.pathname.includes('vendor-profile');
    const isOwnProduct = user && product.vendor_id && String(user.id) === String(product.vendor_id);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 overflow-y-auto p-5" onClick={onClose}>
            <div className="relative w-full max-w-[900px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-legacy-modal animate-slideInUp" onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-900 rounded-full border-none cursor-pointer transition-all duration-300 hover:bg-gray-200 z-10" onClick={onClose}>✕</button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-10">
                    {/* Image Gallery */}
                    <div className="flex flex-col gap-3">
                        <div className="w-full h-[300px] bg-gray-50 rounded-xl overflow-hidden">
                            <img src={mainImage} alt={product.product_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-wrap gap-3 p-1">
                            {images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img}
                                    className={`w-[60px] h-[60px] rounded-md cursor-pointer object-cover border-2 transition-all duration-200 hover:opacity-80 ${i === activeImage ? 'border-amber-400' : 'border-transparent'}`}
                                    alt={`Thumbnail ${i}`}
                                    onClick={() => setActiveImage(i)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="flex flex-col gap-5">
                        <h1 className="text-3xl text-gray-900 leading-tight font-bold">{product.product_name}</h1>

                        <div className="text-2xl font-bold text-amber-400">
                            <span>₦{product.price}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <StarRating rating={Math.round(product.rating || 0)} />
                            <span className="text-sm text-gray-600">({totalReviews} reviews)</span>
                        </div>

                        {/* Engagement */}
                        <div className="flex flex-wrap gap-4 mt-1 bg-gray-100 p-4 rounded-lg">
                            <button
                                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                    liked
                                        ? 'bg-red-50 border-red-300 text-red-500'
                                        : 'border-gray-200 text-gray-600 hover:bg-white hover:border-red-400 hover:text-red-500'
                                } ${likeLoading ? 'opacity-50 pointer-events-none' : ''}`}
                                title={liked ? "Unlike this product" : "Like this product"}
                                onClick={handleLikeToggle}
                            >
                                <span className={`text-lg transition-transform duration-300 ${liked ? 'scale-110' : ''}`}>
                                    {liked ? '♥' : '♡'}
                                </span>
                                <span>{likesCount}</span> Likes
                            </button>
                            <span className="flex items-center gap-1.5 text-sm text-gray-600 px-3 py-1.5 rounded-lg">
                                👁 <span>{product.view_count || 0}</span> Views
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-100 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Available:</span>
                                <span className="text-base font-semibold text-gray-900">{product.quantity || 1}</span>
                            </div>
                        </div>

                        <div className="product-description">
                            <h3 className="text-base text-gray-900 mb-2 font-semibold">Description</h3>
                            <p className="text-sm leading-relaxed text-gray-600">{product.description || 'No description available.'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location:</span>
                                <span className="text-sm font-medium text-gray-900"><b>{product.institute || 'N/A'}</b></span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">Category:</span>
                                <span className="text-sm font-medium text-gray-900"><b>{product.category || 'General'}</b></span>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="mt-6 pt-6 border-gray-200 bg-gray-100 p-4 rounded-lg" ref={reviewsRef}>
                            <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer Reviews ({totalReviews})</h3>
                            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
                                {loadingReviews ? (
                                    <div className="flex flex-col gap-3 animate-pulse">
                                        {[1, 2].map(i => (
                                            <div key={i} className="flex gap-3 p-3 bg-white rounded-lg">
                                                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : reviews.length === 0 ? (
                                    <p className="text-center py-4 text-gray-500 text-sm italic">No reviews yet. Be the first to review!</p>
                                ) : (
                                    reviews.map(rev => (
                                        <div key={rev.id} className="flex gap-3 p-3 bg-white rounded-lg shadow-sm">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {(rev.user_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-semibold text-gray-900">{rev.user_name || 'User'}</span>
                                                    <span className="text-xs text-gray-400">{timeAgo(rev.created_at)}</span>
                                                </div>
                                                <StarRating rating={rev.rating} size="text-xs" />
                                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{rev.review}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Review Form */}
                            {user && !isOwnProduct && userHasPurchased && (
                                <form onSubmit={handleSubmitReview} className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-sm font-medium text-gray-700">Your rating:</span>
                                        <StarRating rating={reviewRating} onRate={setReviewRating} interactive size="text-xl" />
                                    </div>
                                    <textarea
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-white resize-none"
                                        rows={3}
                                        placeholder="Write your review..."
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={submittingReview || reviewRating === 0 || reviewText.trim().length < 3}
                                        className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 border-none cursor-pointer"
                                    >
                                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </form>
                            )}
                            {user && !isOwnProduct && !userHasPurchased && (
                                <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-center flex flex-col items-center gap-1.5 animate-fadeIn">
                                    <span className="text-amber-500 text-lg">🔒</span>
                                    <p className="text-sm font-semibold text-amber-800 leading-snug">Verified Purchase Required</p>
                                    <p className="text-xs text-amber-600 leading-normal max-w-[320px]">Only verified buyers who have purchased this product and completed their delivery on the platform can drop a review.</p>
                                </div>
                            )}
                            {!user && (
                                <p className="mt-4 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
                                    <a href="/login" className="text-blue-600 font-medium hover:underline">Log in</a> to write a review
                                </p>
                            )}
                        </div>

                        {/* Vendor Section */}
                        {!isVendorPage && (
                            <div className="mt-6">
                                <h3 className="text-base text-gray-900 mb-3 font-semibold">Seller Information</h3>
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <img src={product.pfp || '/placeholder.svg'} alt="Vendor" className="w-[60px] h-[60px] rounded-full object-cover" />
                                        <div className="flex flex-col">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{product.vendor_username || 'Unknown Vendor'}</h4>
                                            <div className="flex items-center">
                                                <span className="text-amber-400 text-xs">★★★★★</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="vendor-actions">
                                        <button className="py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(28,110,242,0.3)] text-sm border border-blue-600 cursor-pointer" onClick={handleVendorClick}>View Profile</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-gray-100 sticky bottom-0 bg-white pb-2 md:relative md:border-t-0 md:bg-transparent md:pb-0">
                            <button className="w-full py-3 px-6 bg-amber-400 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,184,0,0.3)] text-sm border-none cursor-pointer" onClick={handleAddToCart}>Add to Cart</button>
                            <div className="flex gap-2 w-full">
                                <button className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(28,110,242,0.3)] text-sm border border-blue-600 cursor-pointer" onClick={() => {
                                    const productUrl = new URL(window.location.origin);
                                    const prodId = product._id || product.id;
                                    if (prodId) {
                                        productUrl.searchParams.set("productId", prodId.toString());
                                    }
                                    let text = `Hi, I'm interested in: ${product.product_name}`;
                                    if (product.price) text += `\nPrice: ₦${product.price}`;
                                    text += `\nLink: ${productUrl.toString()}`;
                                    
                                    if (product.vendor_id) {
                                        window.location.href = `/chat?vendorId=${product.vendor_id}&text=${encodeURIComponent(text)}`;
                                    } else {
                                        showToast('Vendor information not available', 'error');
                                    }
                                }}>Contact Vendor</button>
                                <button className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer transition-all hover:bg-white flex items-center justify-center shrink-0" aria-label="Share Product" onClick={handleShare}>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
