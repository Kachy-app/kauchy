"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, Send, X, Share2, ShoppingCart, Info, Store } from 'lucide-react';

interface FeedSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'product' | 'content';
    item: any;
    addToCart: (product: any, quantity: number) => void;
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

export default function FeedSidebar({ isOpen, onClose, type, item, addToCart }: FeedSidebarProps) {
    const { showToast } = useToast();
    const { user } = useAuth();

    // Generic states
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [likeLoading, setLikeLoading] = useState(false);
    
    // Reviews / Comments states
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [totalReviews, setTotalReviews] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(0);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [userHasPurchased, setUserHasPurchased] = useState(false);

    const commentsEndRef = useRef<HTMLDivElement>(null);

    // Initialize state when item changes
    useEffect(() => {
        if (!item) return;

        if (type === 'product') {
            setLiked(item.has_liked || false);
            setLikesCount(item.likes_count ?? item.likes ?? 0);
            fetchProductReviews();
        } else if (type === 'content') {
            setLiked(item.is_liked_by_user || false);
            setLikesCount(item.likes_count ?? item.likes ?? 0);
            fetchContentComments();
        }
    }, [item, type]);

    const itemId = item?._id || item?.id;

    // --- Product Methods ---
    async function fetchProductReviews() {
        if (!itemId) return;
        setLoadingReviews(true);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (user?.access) headers['Authorization'] = `Bearer ${user.access}`;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${itemId}/reviews/`, { headers });
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

    async function handleProductLike() {
        if (!user) {
            showToast('Please login to like products', 'error');
            return;
        }
        if (likeLoading || !itemId) return;
        setLikeLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${itemId}/like/`, {
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

    async function submitProductReview(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return showToast('Please login to write a review', 'error');
        if (reviewRating === 0) return showToast('Please select a star rating', 'error');
        if (reviewText.trim().length < 3) return showToast('Review must be at least 3 characters', 'error');
        if (submittingReview || !itemId) return;
        
        setSubmittingReview(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${itemId}/reviews/`, {
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

    // --- Content Methods ---
    async function fetchContentComments() {
        if (!itemId) return;
        setLoadingReviews(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${itemId}/reviews/`);
            if (res.ok) {
                const data = await res.json();
                setReviews(data.reviews || []);
                setTotalReviews(data.total_reviews || 0);
            }
        } catch (e) {
            console.error('Error fetching comments:', e);
        } finally {
            setLoadingReviews(false);
        }
    }

    async function handleContentLike() {
        if (!user) return showToast('Please login to like content', 'error');
        if (likeLoading || !itemId) return;
        setLikeLoading(true);

        try {
            const method = liked ? 'DELETE' : 'POST';
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${itemId}/like/`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                if (liked) {
                    setLiked(false);
                    setLikesCount(data.content_likes_count ?? likesCount - 1);
                } else {
                    setLiked(true);
                    setLikesCount(data.content_likes_count ?? likesCount + 1);
                }
            } else {
                showToast('Failed to update like', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        } finally {
            setLikeLoading(false);
        }
    }

    async function submitContentComment(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return showToast('Please login to comment', 'error');
        if (reviewText.trim().length < 3) return showToast('Comment must be at least 3 characters', 'error');
        if (submittingReview || !itemId) return;

        setSubmittingReview(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${itemId}/review/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access}`,
                },
                body: JSON.stringify({ comment: reviewText }),
            });
            if (res.ok) {
                const data = await res.json();
                setReviews(prev => [...prev, data]);
                setTotalReviews(prev => prev + 1);
                setReviewText('');
                setTimeout(() => {
                    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                showToast('Failed to post comment', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        } finally {
            setSubmittingReview(false);
        }
    }

    const handleShare = async () => {
        const shareUrl = new URL(window.location.origin + '/feed');
        shareUrl.searchParams.set("type", type);
        shareUrl.searchParams.set("id", itemId.toString());
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Check out this ${type} on Upstart`,
                    url: shareUrl.toString(),
                });
                showToast('Shared successfully!', 'success');
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl.toString());
                showToast('Link copied to clipboard!', 'success');
            } catch (error) {
                showToast('Failed to copy link', 'error');
            }
        }
    };

    const isOwnProduct = type === 'product' && user && item.vendor_id && String(user.id) === String(item.vendor_id);

    return (
        <div className={`fixed inset-y-0 right-0 z-50 w-[92vw] sm:w-[420px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.15)] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <h2 className="text-xl sm:text-lg font-bold text-gray-900 capitalize">{type === 'product' ? 'Product Details' : 'Content Details'}</h2>
                <button onClick={onClose} className="p-2.5 bg-gray-50 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                    <X size={22} />
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-4 flex flex-col gap-5">
                
                {/* Product specific info */}
                {type === 'product' && (
                    <>
                        <div>
                            <h1 className="text-2xl sm:text-2xl font-bold text-gray-900 leading-tight mb-2">{item.product_name}</h1>
                            <div className="text-2xl sm:text-xl font-bold text-amber-500">₦{item.price}</div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h3 className="text-base sm:text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Info size={16} className="text-gray-500" /> Description</h3>
                            <p className="text-base sm:text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{item.description || 'No description available.'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-semibold">Available</div>
                                <div className="text-base sm:text-sm font-bold text-gray-900">{item.quantity || 1} units</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-semibold">Category</div>
                                <div className="text-base sm:text-sm font-bold text-gray-900">{item.category || 'General'}</div>
                            </div>
                        </div>
                    </>
                )}

                {/* Content specific info */}
                {type === 'content' && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <p className="text-base sm:text-sm text-gray-800 leading-relaxed font-medium">{item.caption || 'Untitled Video'}</p>
                        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200">
                            <span className="text-sm sm:text-xs text-gray-500 font-medium">{item.views || 0} Views</span>
                            <span className="text-sm sm:text-xs text-gray-500 font-medium">{timeAgo(item.created_at || item.uploaded_at || new Date().toISOString())}</span>
                        </div>
                    </div>
                )}

                {/* Vendor Card */}
                <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={item.pfp || item.vendor_pfp || '/placeholder.svg'} alt="Vendor" className="w-11 h-11 sm:w-10 sm:h-10 rounded-full object-cover bg-gray-100" />
                        <div>
                            <div className="text-base sm:text-sm font-bold text-gray-900">{item.vendor_username || 'Unknown Vendor'}</div>
                            {type === 'product' && (
                                <div className="flex items-center">
                                    <span className="text-amber-400 text-sm sm:text-xs">★★★★★</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <a href={`/vendor-profile?vendorId=${item.vendor_id}`} className="p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                        <Store size={20} />
                    </a>
                </div>

                {/* Reviews / Comments Section */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-base sm:text-sm font-semibold text-gray-900 flex items-center justify-between">
                        <span>{type === 'product' ? 'Reviews' : 'Comments'} ({totalReviews})</span>
                        {type === 'product' && <StarRating rating={Math.round(item.rating || 0)} size="text-sm" />}
                    </h3>

                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {loadingReviews ? (
                            <div className="text-center py-4 text-base sm:text-sm text-gray-500">Loading...</div>
                        ) : reviews.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                                <p className="text-base sm:text-sm text-gray-500 italic">No {type === 'product' ? 'reviews' : 'comments'} yet.</p>
                            </div>
                        ) : (
                            reviews.map((r, idx) => (
                                <div key={idx} className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                                    <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm sm:text-xs font-bold shrink-0">
                                        {(r.user_name || r.user_email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm sm:text-xs font-bold text-gray-900 truncate pr-2">{r.user_name || r.user_email?.split('@')[0] || 'User'}</span>
                                            <span className="text-xs sm:text-[10px] text-gray-400 shrink-0">{timeAgo(r.created_at)}</span>
                                        </div>
                                        {type === 'product' && <StarRating rating={r.rating} size="text-xs sm:text-[10px]" />}
                                        <p className="text-base sm:text-sm text-gray-700 mt-1 leading-relaxed break-words">{r.review || r.comment}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    {/* Review/Comment Form */}
                    {user ? (
                        (type === 'content' || (type === 'product' && !isOwnProduct && userHasPurchased)) ? (
                            <form onSubmit={type === 'product' ? submitProductReview : submitContentComment} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                {type === 'product' && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm sm:text-xs font-medium text-gray-700">Rating:</span>
                                        <StarRating rating={reviewRating} onRate={setReviewRating} interactive size="text-lg sm:text-sm" />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder={`Add a ${type === 'product' ? 'review' : 'comment'}...`}
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:border-blue-500 bg-white"
                                    />
                                    <button
                                        type="submit"
                                        disabled={submittingReview || reviewText.trim().length < 3 || (type === 'product' && reviewRating === 0)}
                                        className="p-2.5 sm:p-2 bg-blue-600 text-white rounded-md disabled:opacity-50 flex items-center justify-center transition-colors hover:bg-blue-700"
                                    >
                                        {submittingReview ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Send size={18} />}
                                    </button>
                                </div>
                            </form>
                        ) : type === 'product' && !userHasPurchased && !isOwnProduct ? (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                                <p className="text-sm sm:text-xs text-amber-700 font-medium">Only verified buyers can leave a review.</p>
                            </div>
                        ) : null
                    ) : (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                            <p className="text-sm sm:text-xs text-gray-600">
                                <a href="/login" className="text-blue-600 font-semibold hover:underline">Log in</a> to {type === 'product' ? 'review' : 'comment'}
                            </p>
                        </div>
                    )}
                </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-white flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        className={`flex-1 flex justify-center items-center gap-2 py-3 sm:py-2.5 rounded-lg border font-semibold text-base sm:text-sm transition-all ${
                            liked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-red-300 hover:text-red-500'
                        } ${likeLoading ? 'opacity-50' : ''}`}
                        onClick={type === 'product' ? handleProductLike : handleContentLike}
                    >
                        <Heart size={20} fill={liked ? 'currentColor' : 'none'} className={liked ? 'scale-110 transition-transform' : ''} />
                        <span>{likesCount}</span>
                    </button>
                    <button
                        className="flex-1 flex justify-center items-center gap-2 py-3 sm:py-2.5 rounded-lg border border-gray-300 bg-white font-semibold text-base sm:text-sm text-gray-700 hover:bg-gray-50 transition-all"
                        onClick={handleShare}
                    >
                        <Share2 size={20} />
                        <span>Share</span>
                    </button>
                </div>
                
                {type === 'product' && (
                    <button 
                        className="w-full flex justify-center items-center gap-2 py-3.5 sm:py-3 bg-amber-400 hover:bg-amber-500 text-white rounded-lg font-bold text-base sm:text-sm shadow-sm transition-colors"
                        onClick={() => addToCart(item, 1)}
                    >
                        <ShoppingCart size={20} />
                        Add to Cart
                    </button>
                )}
            </div>
        </div>
    );
}

