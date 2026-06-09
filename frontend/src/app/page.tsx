"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Play, Heart, MessageCircle, Share2, UserCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAuthGate } from '@/context/AuthGateContext';
import FeedSidebar from '@/components/FeedSidebar';

// Swiper integration
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Virtual } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/virtual';

function FeedContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { requireAuth } = useAuthGate();

    const initialType = searchParams.get('type');
    const initialId = searchParams.get('id');
    const vendorId = searchParams.get('vendorId');

    // Homepage feed renders Kauch posts; each post may reference products.
    const [feedItems, setFeedItems] = useState<{ type: 'kauch'; item: any }[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState(0);

    const swiperRef = useRef<SwiperType | null>(null);
    const viewedItemsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        loadFeedData();
    }, [user, initialType, initialId, vendorId]);

    const loadFeedData = async () => {
        setLoading(true);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (user?.access) headers['Authorization'] = `Bearer ${user.access}`;

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/kauch/feed/`, { headers });
            if (!res.ok) throw new Error('Failed to load feed');

            const data = await res.json();
            const posts: any[] = Array.isArray(data) ? data : [];

            // Map the Kauch post shape into the feed item the UI renders.
            const mapped = posts.map((p) => ({
                type: 'kauch' as const,
                item: {
                    id: p.id,
                    kauch_id: p.kauch?.id,
                    vendor_username: p.kauch?.name || 'Kauch',
                    vendor_avatar: p.kauch?.avatar_url || null,
                    caption: p.description,
                    media_type: p.media_type,
                    media_url: p.media_url,
                    // ContentFeedView reads `video`; keep it populated only for video posts.
                    video: p.media_type === 'video' ? p.media_url : null,
                    created_at: p.created_at,
                    likes_count: p.likes_count,
                    comments_count: p.comments_count,
                    shares_count: 0,
                    is_liked_by_user: p.is_liked_by_user,
                    products: p.tagged_products || [],
                },
            }));

            setFeedItems(mapped);
        } catch (error) {
            console.error("Error loading feed:", error);
            setFeedItems([]);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (product: any, quantity: number) => {
        if (!requireAuth('add items to your cart')) return;

        try {
            const productId = product._id || product.id;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/cart-items/${productId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access}`
                },
                body: JSON.stringify({
                    quantity: quantity
                })
            });

            if (res.ok) {
                showToast('Added to cart!', 'success');
            } else {
                const data = await res.json();
                showToast(data.error || data.message || 'Failed to add to cart', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        }
    };

    // Open a referenced product in the full-screen /feed experience.
    const openProduct = (product: any) => {
        const productId = product._id || product.id;
        if (!productId) return;
        router.push(`/feed?type=product&id=${productId}`);
    };

    const handleLike = useCallback(async (postId: number) => {
        if (!requireAuth('like posts')) return;

        // optimistic toggle
        setFeedItems(prev => prev.map(f =>
            f.item.id === postId
                ? { ...f, item: {
                    ...f.item,
                    is_liked_by_user: !f.item.is_liked_by_user,
                    likes_count: f.item.is_liked_by_user ? f.item.likes_count - 1 : f.item.likes_count + 1,
                  } }
                : f
        ));

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/kauch/posts/${postId}/like/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.access}` },
            });
            if (res.ok) {
                const data = await res.json();
                setFeedItems(prev => prev.map(f =>
                    f.item.id === postId
                        ? { ...f, item: { ...f.item, is_liked_by_user: data.liked, likes_count: data.likes_count } }
                        : f
                ));
            } else {
                throw new Error('failed');
            }
        } catch (e) {
            // revert
            setFeedItems(prev => prev.map(f =>
                f.item.id === postId
                    ? { ...f, item: {
                        ...f.item,
                        is_liked_by_user: !f.item.is_liked_by_user,
                        likes_count: f.item.is_liked_by_user ? f.item.likes_count - 1 : f.item.likes_count + 1,
                      } }
                    : f
            ));
            showToast('Could not update like', 'error');
        }
    }, [requireAuth, showToast]);

    const handleSlideChange = (swiper: SwiperType) => {
        setActiveItemIndex(swiper.activeIndex);
    };

    if (loading) {
        return (
            <div className="w-full h-full min-h-[calc(100dvh-135px)] bg-black flex items-center justify-center text-white flex-col gap-4">
                <div className="w-12 h-12 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <p className="font-semibold tracking-widest text-sm uppercase text-gray-400">Loading Feed</p>
            </div>
        );
    }

    if (feedItems.length === 0) {
        return (
            <div className="w-full h-full min-h-[calc(100dvh-135px)] bg-black flex flex-col items-center justify-center text-white gap-4">
                <p>No content available.</p>
                <button onClick={() => router.back()} className="px-6 py-2 bg-white text-black rounded-full font-bold">Go Back</button>
            </div>
        );
    }

    const activeItem = feedItems[activeItemIndex];

    return (
        <div className="w-full h-full min-h-[calc(100dvh-135px)] bg-black relative overflow-hidden">
            {/* Global Styles to hide Swiper default outlines & scrollbars */}
            <style dangerouslySetInnerHTML={{__html: `
                .swiper-container { width: 100%; height: 100%; }
                .swiper-slide { display: flex; justify-content: center; align-items: center; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Swiper Vertical Feed Container */}
            <Swiper
                direction="vertical"
                slidesPerView={1}
                spaceBetween={0}
                mousewheel={true}
                keyboard={{ enabled: true }}
                virtual={{ enabled: true, addSlidesAfter: 2, addSlidesBefore: 2 }}
                modules={[Mousewheel, Keyboard, Virtual]}
                onSwiper={(swiper) => { swiperRef.current = swiper; }}
                onSlideChange={handleSlideChange}
                className="w-full h-full bg-black swiper-container"
                touchEventsTarget="container"
                resistanceRatio={0.85}
            >
                {feedItems.map((feedObj, index) => {
                    const hasProducts = Array.isArray(feedObj.item.products) && feedObj.item.products.length > 0;
                    // Lift the caption/action rail above the product strip when present.
                    const bottomOffset = hasProducts ? 'bottom-[108px]' : 'bottom-6';

                    return (
                        <SwiperSlide key={`kauch-${feedObj.item.id}-${index}`} virtualIndex={index}>
                            <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
                                <ContentFeedView content={feedObj.item} isActive={index === activeItemIndex} />

                                {/* Gradient overlay for bottom text visibility */}
                                <div className="absolute bottom-0 left-0 w-full h-2/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

                                {/* Brief Info Overlay at bottom left */}
                                <div className={`absolute ${bottomOffset} left-4 right-16 z-20 text-white drop-shadow-md pointer-events-none flex flex-col justify-end pr-2`}>
                                    <h2 className="text-xl sm:text-2xl font-bold mb-1 line-clamp-1 drop-shadow-lg">
                                        {feedObj.item.vendor_username || 'Vendor'}
                                    </h2>
                                    <p className="text-[15px] sm:text-base text-gray-200 line-clamp-2 drop-shadow-md leading-snug">
                                        {feedObj.item.caption}
                                    </p>
                                </div>

                                {/* TikTok-style Vertical Action Buttons (Bottom Right) */}
                                <div className={`absolute ${bottomOffset} right-2 z-30 flex flex-col items-center gap-5 pointer-events-auto`}>
                                    {/* Profile Avatar -> Kauch page */}
                                    <div
                                        className="relative mb-2 cursor-pointer group hover:scale-105 transition-transform"
                                        onClick={(e) => { e.stopPropagation(); if (feedObj.item.kauch_id) router.push(`/kauch/${feedObj.item.kauch_id}`); }}
                                    >
                                        <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-zinc-800 shadow-lg">
                                            {feedObj.item.vendor_avatar ? (
                                                <img src={feedObj.item.vendor_avatar} alt="Vendor" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCircle className="w-full h-full text-gray-400" />
                                            )}
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-black">
                                            <span className="text-white text-[10px] font-bold leading-none">+</span>
                                        </div>
                                    </div>

                                    {/* Like Button */}
                                    <button className="flex flex-col items-center gap-1 text-white drop-shadow-lg group" onClick={(e) => { e.stopPropagation(); handleLike(feedObj.item.id); }}>
                                        <div className={`p-2 rounded-full transition-all group-hover:bg-white/10 ${feedObj.item.is_liked_by_user ? 'text-red-500' : 'text-white'}`}>
                                            <Heart size={30} fill={feedObj.item.is_liked_by_user ? "currentColor" : "none"} className={feedObj.item.is_liked_by_user ? "scale-110" : ""} />
                                        </div>
                                        <span className="text-xs font-semibold">{feedObj.item.likes_count || 0}</span>
                                    </button>

                                    {/* Comment Button */}
                                    <button className="flex flex-col items-center gap-1 text-white drop-shadow-lg group" onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}>
                                        <div className="p-2 rounded-full transition-all group-hover:bg-white/10">
                                            <MessageCircle size={30} className="scale-x-[-1]" />
                                        </div>
                                        <span className="text-xs font-semibold">{feedObj.item.comments_count || 0}</span>
                                    </button>

                                    {/* Share Button */}
                                    <button className="flex flex-col items-center gap-1 text-white drop-shadow-lg group" onClick={(e) => { e.stopPropagation(); showToast('Link copied to clipboard!', 'success'); }}>
                                        <div className="p-2 rounded-full transition-all group-hover:bg-white/10">
                                            <Share2 size={30} />
                                        </div>
                                        <span className="text-xs font-semibold">{feedObj.item.shares_count || 0}</span>
                                    </button>
                                </div>

                                {/* Referenced Products — full-width bottom carousel */}
                                {hasProducts && (
                                    <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-auto">
                                        <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-8 pb-3 px-3">
                                            <div className="flex items-center gap-1.5 mb-2 px-1 text-white/90">
                                                <ShoppingBag size={14} />
                                                <span className="text-xs font-semibold uppercase tracking-wide">Shop this post</span>
                                            </div>
                                            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
                                                {feedObj.item.products.map((product: any) => (
                                                    <button
                                                        key={product.id || product._id}
                                                        onClick={(e) => { e.stopPropagation(); openProduct(product); }}
                                                        className="shrink-0 w-[170px] flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl p-1.5 shadow-lg hover:bg-white active:scale-[0.98] transition-all text-left"
                                                    >
                                                        <img
                                                            src={product.image_url?.[0] || '/placeholder.svg'}
                                                            alt={product.product_name}
                                                            className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-100"
                                                        />
                                                        <div className="min-w-0 flex-1 pr-1">
                                                            <p className="text-[11px] font-semibold text-gray-900 line-clamp-1">{product.product_name}</p>
                                                            <p className="text-sm font-bold text-blue-600">₦{product.price}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SwiperSlide>
                    );
                })}
            </Swiper>

            {/* Sidebar Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-[110] transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            {activeItem && (
                <FeedSidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    type={activeItem.type}
                    item={activeItem.item}
                    addToCart={addToCart}
                    commentsOnly
                />
            )}
        </div>
    );
}

export default function FeedPage() {
    return (
        <Suspense fallback={
            <div className="w-full h-full min-h-[calc(100dvh-135px)] bg-black flex items-center justify-center text-white flex-col gap-4">
                <div className="w-12 h-12 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <p className="font-semibold tracking-widest text-sm uppercase text-gray-400">Loading Feed</p>
            </div>
        }>
            <FeedContent />
        </Suspense>
    );
}

// Sub-component for feed media (image or video) rendering
function ContentFeedView({ content, isActive }: { content: any, isActive: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const isVideo = content.media_type === 'video' || (!content.media_type && !!content.video);
    const mediaSrc = content.media_url || content.video;

    useEffect(() => {
        if (!isVideo) return;
        if (isActive && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.log('Autoplay blocked:', e));
        } else if (!isActive && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive, isVideo]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.log(e));
        }
    };

    if (!isVideo) {
        return (
            <div className="w-full h-full relative">
                {mediaSrc ? (
                    <img src={mediaSrc} alt={content.caption || 'Post'} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-gray-500 text-sm">No media</div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full h-full relative" onClick={togglePlay}>
            <video
                ref={videoRef}
                src={mediaSrc}
                className="w-full h-full object-cover"
                loop
                playsInline
                muted={false}
            />

            {/* Play/Pause indicator overlay */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-30">
                    <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white pl-2 border border-white/20 shadow-2xl">
                        <Play size={40} />
                    </div>
                </div>
            )}
        </div>
    );
}
