"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Play, Heart, MessageCircle, Share2, UserCircle, ShoppingBag, Bookmark, ChevronUp, X, Mic } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAuthGate } from '@/context/AuthGateContext';
import FeedSidebar from '@/components/FeedSidebar';

// Swiper integration
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Virtual, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/virtual';

// Module-level cache of the home feed so returning to this page (e.g. after opening
// a product) restores instantly instead of refetching + resetting scroll. Cleared
// on full page reload / logout (logout does a hard navigation).
let feedCache: { items: { type: 'kauch'; item: any }[]; index: number; uid: any } | null = null;

function FeedContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { requireAuth } = useAuthGate();

    const initialType = searchParams.get('type');
    const initialId = searchParams.get('id');
    const vendorId = searchParams.get('vendorId');
    const hasParams = !!(initialType || initialId || vendorId);

    // Restore from the module cache on mount (lazy init) so there's no spinner/flash
    // or scroll reset when returning to the feed.
    const canRestore = !hasParams && !!feedCache;
    const [feedItems, setFeedItems] = useState<{ type: 'kauch'; item: any }[]>(() => canRestore ? feedCache!.items : []);
    const [loading, setLoading] = useState(!canRestore);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [productSheetOpen, setProductSheetOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState(() => canRestore ? feedCache!.index : 0);
    // Custom right-click floating menu: position + the post it targets.
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; item: any } | null>(null);

    const swiperRef = useRef<SwiperType | null>(null);
    const viewedItemsRef = useRef<Set<string>>(new Set());

    // Bookmarks live client-side only (no backend), persisted to localStorage.
    const [bookmarks, setBookmarks] = useState<number[]>([]);
    // Which post id currently shows the double-tap heart burst.
    const [burstId, setBurstId] = useState<number | null>(null);

    // Gesture bookkeeping shared across slides.
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFired = useRef(false);
    const gestureActive = useRef(false);
    const pressStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lastTap = useRef<{ t: number; id: number | null }>({ t: 0, id: null });

    useEffect(() => {
        try {
            const stored = localStorage.getItem('kauch_bookmarks');
            if (stored) setBookmarks(JSON.parse(stored));
        } catch { /* ignore */ }
    }, []);

    const toggleBookmark = useCallback((item: any) => {
        // Side effects (toast, storage) must stay OUT of the state updater — React
        // calls updaters twice in dev StrictMode, which double-fired the toast.
        const exists = bookmarks.includes(item.id);
        const next = exists ? bookmarks.filter(id => id !== item.id) : [...bookmarks, item.id];
        setBookmarks(next);
        try { localStorage.setItem('kauch_bookmarks', JSON.stringify(next)); } catch { /* ignore */ }
        showToast(exists ? 'Removed from bookmarks' : 'Saved to bookmarks', 'success');
    }, [bookmarks, showToast]);

    useEffect(() => {
        // Skip refetch when we already have a cached feed for this same user.
        if (!hasParams && feedCache && feedCache.uid === (user?.id ?? null)) return;
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
                    // Full ordered media list. Backend guarantees a non-empty list
                    // (it falls back to [media_url] for older single-media posts).
                    media_urls: Array.isArray(p.media_urls) && p.media_urls.length > 0
                        ? p.media_urls
                        : (p.media_url ? [p.media_url] : []),
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
            // Cache for instant restore when returning to the feed.
            if (!hasParams) {
                feedCache = { items: mapped, index: 0, uid: user?.id ?? null };
                setActiveItemIndex(0);
            }
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

    // Open a product feed containing ONLY this post's carousel products, starting
    // at the tapped one. The id list is handed to /feed via sessionStorage.
    const openProduct = (product: any, list?: any[]) => {
        const productId = product._id || product.id;
        if (!productId) return;
        try {
            const source = (list && list.length ? list : [product]);
            const ids = source.map((p: any) => p._id || p.id).filter(Boolean);
            sessionStorage.setItem('carouselFeed', JSON.stringify({ ids, clicked: productId }));
        } catch { /* ignore */ }
        router.push('/feed?source=carousel');
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
        setCtxMenu(null);
        // Remember position so returning to the feed lands on the same post.
        if (feedCache) feedCache.index = swiper.activeIndex;
    };

    // Share a post: native OS share sheet on mobile, clipboard fallback elsewhere.
    // The URL points at the server-rendered /kauch/post/[id] page whose OG tags
    // give link previews the post thumbnail.
    const handleShare = async (item: any) => {
        const url = `${window.location.origin}/kauch/post/${item.id}`;
        const title = `${item.vendor_username || 'Kauchy'} on Kauchy`;
        const text = item.caption || 'Check out this post on Kauchy';

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title, text, url });
            } catch (err: any) {
                // Swallow the cancel action; surface anything else.
                if (err?.name !== 'AbortError') showToast('Could not share', 'error');
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            showToast('Link copied to clipboard!', 'success');
        } catch {
            showToast('Could not copy link', 'error');
        }
    };

    // Open our custom floating menu at the cursor instead of the browser menu.
    const handleContextMenu = (e: React.MouseEvent, item: any) => {
        e.preventDefault();
        const MENU_W = 208;
        const MENU_H = 300;
        const x = Math.min(e.clientX, window.innerWidth - MENU_W - 8);
        const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);
        setCtxMenu({ x: Math.max(8, x), y: Math.max(8, y), item });
    };

    // Double-tap always *likes* (Instagram-style — never unlikes) and shows a burst.
    const doubleTapLike = (item: any) => {
        if (!item.is_liked_by_user) handleLike(item.id);
        setBurstId(item.id);
        setTimeout(() => setBurstId(curr => (curr === item.id ? null : curr)), 800);
    };

    // Unified pointer gestures on the media: long-press → bookmark, double-tap → like.
    // Taps starting on a button/link (action rail, products, username) are ignored.
    const onMediaPointerDown = (e: React.PointerEvent, item: any) => {
        if (e.button && e.button !== 0) { gestureActive.current = false; return; } // ignore right/middle click
        if ((e.target as HTMLElement).closest('button, a')) { gestureActive.current = false; return; }
        gestureActive.current = true;
        longPressFired.current = false;
        pressStart.current = { x: e.clientX, y: e.clientY };
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = setTimeout(() => {
            longPressFired.current = true;
            toggleBookmark(item);
        }, 500);
    };

    const cancelPress = () => {
        if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    };

    const onMediaPointerMove = (e: React.PointerEvent) => {
        // A drag (swipe) cancels both long-press and the pending tap.
        const dx = Math.abs(e.clientX - pressStart.current.x);
        const dy = Math.abs(e.clientY - pressStart.current.y);
        if (dx > 10 || dy > 10) cancelPress();
    };

    const onMediaPointerUp = (item: any) => {
        if (!gestureActive.current) return;
        gestureActive.current = false;
        cancelPress();
        if (longPressFired.current) { longPressFired.current = false; return; }
        const now = Date.now();
        if (now - lastTap.current.t < 300 && lastTap.current.id === item.id) {
            lastTap.current = { t: 0, id: null };
            doubleTapLike(item);
        } else {
            lastTap.current = { t: now, id: item.id };
        }
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
                @keyframes likeBurst {
                    0%   { transform: scale(0);   opacity: 0; }
                    25%  { transform: scale(1.2); opacity: 1; }
                    60%  { transform: scale(1);   opacity: 1; }
                    100% { transform: scale(1.3); opacity: 0; }
                }
                .like-burst { animation: likeBurst 0.8s ease-in-out forwards; }
            `}} />

            {/* Swiper Vertical Feed Container */}
            <Swiper
                direction="vertical"
                slidesPerView={1}
                spaceBetween={0}
                initialSlide={activeItemIndex}
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

                    // Single media (one image OR a video) sizes to its natural aspect
                    // on desktop (capped), so it fills its frame with no blank space.
                    // Only multi-image carousels keep a fixed portrait frame.
                    const mediaImages = Array.isArray(feedObj.item.media_urls) && feedObj.item.media_urls.length > 0
                        ? feedObj.item.media_urls
                        : (feedObj.item.media_url ? [feedObj.item.media_url] : []);
                    const isCarousel = feedObj.item.media_type === 'image' && mediaImages.length > 1;
                    const frameClass = !isCarousel
                        ? 'md:w-auto md:h-auto md:max-h-[92vh] md:max-w-[88vw]'
                        : 'md:w-auto md:h-[94%] md:aspect-[9/16] overflow-hidden md:rounded-2xl md:shadow-2xl';

                    return (
                        <SwiperSlide key={`kauch-${feedObj.item.id}-${index}`} virtualIndex={index}>
                            <div
                                className={`relative flex items-center justify-center bg-zinc-950 w-full h-full ${frameClass}`}
                                onPointerDown={(e) => onMediaPointerDown(e, feedObj.item)}
                                onPointerMove={onMediaPointerMove}
                                onPointerUp={() => onMediaPointerUp(feedObj.item)}
                                onPointerLeave={cancelPress}
                                onContextMenu={(e) => handleContextMenu(e, feedObj.item)}
                            >
                                <ContentFeedView content={feedObj.item} isActive={index === activeItemIndex} />

                                {/* Double-tap heart burst */}
                                {burstId === feedObj.item.id && (
                                    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                                        <Heart size={120} className="text-white like-burst drop-shadow-2xl" fill="currentColor" />
                                    </div>
                                )}

                                {/* Gradient overlay for bottom text visibility */}
                                <div className="absolute bottom-0 left-0 w-full h-2/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

                                {/* Brief Info Overlay at bottom left */}
                                <div className={`absolute ${bottomOffset} left-4 right-16 z-20 text-white drop-shadow-md pointer-events-none flex flex-col justify-end pr-2`}>
                                    <h2 className="text-xl sm:text-2xl font-bold mb-1 line-clamp-1 drop-shadow-lg w-fit pointer-events-auto cursor-pointer hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (feedObj.item.kauch_id) router.push(`/kauch/${feedObj.item.kauch_id}`);
                                        }}
                                    >
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
                                    <button className="flex flex-col items-center gap-1 text-white drop-shadow-lg group" onClick={(e) => { e.stopPropagation(); handleShare(feedObj.item); }}>
                                        <div className="p-2 rounded-full transition-all group-hover:bg-white/10">
                                            <Share2 size={30} />
                                        </div>
                                        <span className="text-xs font-semibold">{feedObj.item.shares_count || 0}</span>
                                    </button>

                                    {/* Bookmark Button (also triggered by long-press on the media) */}
                                    <button className="flex flex-col items-center gap-1 text-white drop-shadow-lg group" onClick={(e) => { e.stopPropagation(); toggleBookmark(feedObj.item); }}>
                                        <div className={`p-2 rounded-full transition-all group-hover:bg-white/10 ${bookmarks.includes(feedObj.item.id) ? 'text-amber-400' : 'text-white'}`}>
                                            <Bookmark size={30} fill={bookmarks.includes(feedObj.item.id) ? 'currentColor' : 'none'} />
                                        </div>
                                        <span className="text-xs font-semibold">Save</span>
                                    </button>
                                </div>

                                {/* Referenced Products — full-width bottom carousel */}
                                {hasProducts && (
                                    <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-auto">
                                        <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-8 pb-3 px-3">
                                            <div className="flex items-center justify-between mb-2 px-1 text-white/90">
                                                <div className="flex items-center gap-1.5">
                                                    <ShoppingBag size={14} />
                                                    <span className="text-xs font-semibold uppercase tracking-wide">Shop this post</span>
                                                </div>
                                                {feedObj.item.products.length > 1 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setProductSheetOpen(true); }}
                                                        className="flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white"
                                                        title="See all products"
                                                    >
                                                        <span>See all {feedObj.item.products.length}</span>
                                                        <ChevronUp size={18} className="animate-bounce" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
                                                {feedObj.item.products.map((product: any) => (
                                                    <button
                                                        key={product.id || product._id}
                                                        onClick={(e) => { e.stopPropagation(); openProduct(product, feedObj.item.products); }}
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

            {/* Expanded product list — opened by the up arrow on the product strip.
                Same geometry as the comments sheet, but with a transparent/frosted bg. */}
            <div
                className={`fixed inset-0 z-[110] transition-opacity duration-300 ${productSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setProductSheetOpen(false)}
            />
            {activeItem && Array.isArray(activeItem.item.products) && (
                <div
                    className={`fixed z-[120] flex flex-col bg-black/30 backdrop-blur-xl border-white/10 transform transition-transform duration-300 ease-in-out
                                inset-x-0 bottom-0 mx-auto max-w-2xl h-[60vh] rounded-t-2xl border-t
                                md:inset-y-0 md:right-0 md:!left-auto md:mx-0 md:max-w-none md:w-[420px] md:h-full md:rounded-none md:border-t-0 md:border-l
                                ${productSheetOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}
                >
                    {/* Grab handle (mobile only) */}
                    <div className="flex md:hidden justify-center pt-2.5 pb-1 shrink-0">
                        <span className="w-10 h-1.5 rounded-full bg-white/40" />
                    </div>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 shrink-0 text-white">
                        <h2 className="text-base font-bold flex items-center gap-2">
                            <ShoppingBag size={18} /> Products ({activeItem.item.products.length})
                        </h2>
                        <button onClick={() => setProductSheetOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-2.5">
                        {activeItem.item.products.map((product: any) => (
                            <button
                                key={product.id || product._id}
                                onClick={() => { setProductSheetOpen(false); openProduct(product, activeItem.item.products); }}
                                className="w-full flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-xl p-2 shadow-lg hover:bg-white active:scale-[0.99] transition-all text-left"
                            >
                                <img
                                    src={product.image_url?.[0] || '/placeholder.svg'}
                                    alt={product.product_name}
                                    className="w-16 h-16 rounded-lg object-cover shrink-0 bg-gray-100"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{product.product_name}</p>
                                    <p className="text-base font-bold text-blue-600 mt-0.5">₦{product.price}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom right-click floating menu */}
            {ctxMenu && (
                <>
                    <div
                        className="fixed inset-0 z-[130]"
                        onClick={() => setCtxMenu(null)}
                        onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}
                    />
                    <div
                        className="fixed z-[140] w-52 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl py-1.5 text-white animate-fadeIn"
                        style={{ left: ctxMenu.x, top: ctxMenu.y }}
                    >
                        <button onClick={() => { handleLike(ctxMenu.item.id); setCtxMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
                            <Heart size={18} className={ctxMenu.item.is_liked_by_user ? 'text-red-500' : ''} fill={ctxMenu.item.is_liked_by_user ? 'currentColor' : 'none'} />
                            {ctxMenu.item.is_liked_by_user ? 'Unlike' : 'Like'}
                        </button>
                        <button onClick={() => { setSidebarOpen(true); setCtxMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
                            <MessageCircle size={18} /> Comment
                        </button>
                        <button onClick={() => { handleShare(ctxMenu.item); setCtxMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
                            <Share2 size={18} /> Share
                        </button>
                        <button onClick={() => { toggleBookmark(ctxMenu.item); setCtxMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
                            <Bookmark size={18} className={bookmarks.includes(ctxMenu.item.id) ? 'text-amber-400' : ''} fill={bookmarks.includes(ctxMenu.item.id) ? 'currentColor' : 'none'} />
                            {bookmarks.includes(ctxMenu.item.id) ? 'Saved' : 'Save'}
                        </button>
                        {Array.isArray(ctxMenu.item.products) && ctxMenu.item.products.length > 0 && (
                            <button onClick={() => { setProductSheetOpen(true); setCtxMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
                                <ShoppingBag size={18} /> Shop products
                            </button>
                        )}
                        <div className="h-px bg-white/10 my-1" />
                        <button onClick={() => { if (ctxMenu.item.kauch_id) router.push(`/kauch/${ctxMenu.item.kauch_id}`); setCtxMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
                            <UserCircle size={18} /> View creator
                        </button>
                    </div>
                </>
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

    if (content.media_type === 'audio') {
        // Voice-note post: a centered audio card on the dark feed background.
        return (
            <div className="w-full h-full flex items-center justify-center p-6 md:w-[440px] md:h-auto">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center gap-5 border border-white/10">
                    <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                        <Mic size={44} className="text-white" />
                    </div>
                    <p className="text-white/80 text-sm font-semibold uppercase tracking-wide">Voice note</p>
                    <audio src={mediaSrc} controls className="w-full" />
                </div>
            </div>
        );
    }

    if (!isVideo) {
        // Image post: may hold one or many images. Fall back to the single
        // media_url for older posts that predate media_urls.
        const images: string[] = (Array.isArray(content.media_urls) && content.media_urls.length > 0)
            ? content.media_urls
            : (mediaSrc ? [mediaSrc] : []);

        if (images.length === 0) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-gray-500 text-sm">No media</div>
            );
        }

        // Single image. On mobile it fills the screen (object-cover). On desktop it
        // sizes to its natural aspect (capped), so the wrapper hugs it with no blank
        // space — wide images render wide, tall images render tall.
        if (images.length === 1) {
            return (
                <div className="w-full h-full relative md:w-auto md:h-auto">
                    <img
                        src={images[0]}
                        alt={content.caption || 'Post'}
                        className="w-full h-full object-contain md:w-auto md:h-auto md:max-h-[92vh] md:max-w-[88vw] md:rounded-2xl md:shadow-2xl"
                    />
                </div>
            );
        }

        // Multiple images: a horizontal swiper nested inside the vertical feed.
        return <ImageCarousel images={images} caption={content.caption} />;
    }

    return (
        <div className="w-full h-full relative md:w-auto md:h-auto" onClick={togglePlay}>
            <video
                ref={videoRef}
                src={mediaSrc}
                className="w-full h-full object-cover md:w-auto md:h-auto md:max-h-[92vh] md:max-w-[88vw] md:object-contain md:rounded-2xl md:shadow-2xl"
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

// Horizontal image carousel for multi-image posts, nested inside the vertical feed.
// The outer feed is a *vertical* Swiper; this is a *horizontal* one. We stop touch
// events from bubbling so a sideways swipe pages images instead of scrolling the feed.
function ImageCarousel({ images, caption }: { images: string[]; caption?: string }) {
    const [index, setIndex] = useState(0);

    return (
        <div
            className="w-full h-full relative"
            // Keep horizontal drags inside this carousel; don't let the parent
            // vertical feed treat them as a vertical scroll.
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
        >
            <Swiper
                modules={[Pagination]}
                direction="horizontal"
                slidesPerView={1}
                className="w-full h-full"
                nested
                onSlideChange={(s) => setIndex(s.activeIndex)}
            >
                {images.map((src, i) => (
                    <SwiperSlide key={`${src}-${i}`}>
                        <img src={src} alt={caption || `Image ${i + 1}`} className="w-full h-full object-contain" />
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Dot indicators: which image of how many. pointer-events-none so taps
                fall through to the swiper underneath. */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 pointer-events-none">
                {images.map((_, i) => (
                    <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                    />
                ))}
            </div>
        </div>
    );
}
