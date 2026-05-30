"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Info, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import FeedSidebar from '@/components/FeedSidebar';

function FeedContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();

    const initialType = searchParams.get('type');
    const initialId = searchParams.get('id');

    const [feedItems, setFeedItems] = useState<{ type: 'product' | 'content'; item: any }[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState(0);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const viewedItemsRef = useRef<Set<string>>(new Set()); // Track which items have been "viewed" this session

    useEffect(() => {
        loadFeedData();
    }, [user, initialType, initialId]);

    const loadFeedData = async () => {
        setLoading(true);
        try {
            const headers: any = { "Content-Type": "application/json" };
            if (user?.access) {
                headers["Authorization"] = `Bearer ${user.access}`;
            }

            // Use unified feed endpoint that returns products + content mixed via personalized algorithm
            const feedRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/feed/`, { headers });

            let feedData: any[] = [];
            if (feedRes.ok) {
                const raw = await feedRes.json();
                feedData = Array.isArray(raw) ? raw : [];
            } else {
                console.warn('Feed fetch failed:', feedRes.status, feedRes.statusText);
            }

            console.log(`Feed loaded: ${feedData.length} items`);

            // Map to internal format using feed_type from backend
            let mapped = feedData.map((item: any) => ({
                type: (item.feed_type === 'product' ? 'product' : 'content') as 'product' | 'content',
                item,
            }));

            // If we were deep-linked to a specific item, move it to the front
            if (initialId && initialType) {
                const targetIndex = mapped.findIndex((f: any) => {
                    const id = f.item.id?.toString() || f.item._id?.toString();
                    return f.type === initialType && id === initialId;
                });

                if (targetIndex > 0) {
                    const [target] = mapped.splice(targetIndex, 1);
                    mapped = [target, ...mapped];
                } else if (targetIndex === -1 && initialType === 'product') {
                    // Item not in feed, fetch it individually
                    try {
                        const specRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${initialId}`, { headers });
                        if (specRes.ok) {
                            const specData = await specRes.json();
                            specData.feed_type = 'product';
                            mapped = [{ type: 'product', item: specData }, ...mapped];
                        }
                    } catch (e) {
                        console.error('Failed to fetch specific product:', e);
                    }
                }
            }

            setFeedItems(mapped);
        } catch (error) {
            console.error("Error loading feed:", error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (product: any, quantity: number) => {
        if (!user) {
            showToast('Please login to add items to cart', 'error');
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/cart-items/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access}`
                },
                body: JSON.stringify({
                    product: product._id || product.id,
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

    // Track a view when an item becomes active (scroll into view)
    const trackView = useCallback((feedItem: { type: 'product' | 'content'; item: any }) => {
        const itemId = feedItem.item.id || feedItem.item._id;
        const viewKey = `${feedItem.type}-${itemId}`;

        // Only track once per session
        if (viewedItemsRef.current.has(viewKey) || !user?.access || !itemId) return;
        viewedItemsRef.current.add(viewKey);

        const headers: any = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.access}`,
        };

        if (feedItem.type === 'product') {
            // Product view: hit the detail endpoint which auto-increments views
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${itemId}`, { headers }).catch(() => {});
        } else {
            // Content view: hit the dedicated view endpoint
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${itemId}/view/`, {
                method: 'POST',
                headers,
            }).catch(() => {});
        }
    }, [user]);

    // Intersection Observer callback to track active item
    const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const index = Number(entry.target.getAttribute('data-index'));
                setActiveItemIndex(index);

                // Play video if it's a content
                const videoEl = entry.target.querySelector('video');
                if (videoEl) {
                    videoEl.currentTime = 0;
                    videoEl.play().catch(e => console.log('Autoplay blocked:', e));
                }
            } else {
                // Pause video when out of view
                const videoEl = entry.target.querySelector('video');
                if (videoEl) {
                    videoEl.pause();
                }
            }
        });
    }, []);

    // Track view when activeItemIndex changes (i.e. user scrolls to a new item)
    useEffect(() => {
        if (feedItems.length > 0 && activeItemIndex < feedItems.length) {
            trackView(feedItems[activeItemIndex]);
        }
    }, [activeItemIndex, feedItems, trackView]);

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.6 // Trigger when 60% visible
        };
        observerRef.current = new IntersectionObserver(handleIntersection, options);

        const elements = document.querySelectorAll('.feed-item');
        elements.forEach((el) => observerRef.current?.observe(el));

        return () => {
            observerRef.current?.disconnect();
        };
    }, [feedItems, handleIntersection]);


    if (loading) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center text-white flex-col gap-4">
                <div className="w-12 h-12 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <p className="font-semibold tracking-widest text-sm uppercase text-gray-400">Loading Feed</p>
            </div>
        );
    }

    if (feedItems.length === 0) {
        return (
            <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
                <p>No content available.</p>
                <button onClick={() => router.back()} className="px-6 py-2 bg-white text-black rounded-full font-bold">Go Back</button>
            </div>
        );
    }

    const activeItem = feedItems[activeItemIndex];

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            {/* Overlay Navigation & Actions */}
            <div className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-center z-40 pointer-events-none">
                <button 
                    onClick={() => {
                        if (window.history.length > 2) {
                            router.back();
                        } else {
                            router.push('/');
                        }
                    }} 
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all pointer-events-auto"
                >
                    <X size={22} />
                </button>

                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-md text-white rounded-full flex flex-col items-center justify-center hover:bg-black/60 transition-all pointer-events-auto border border-white/20 animate-pulse"
                >
                    <Info size={22} />
                </button>
            </div>

            {/* Scrollable Feed Container */}
            <div className="w-full h-full overflow-y-scroll snap-y snap-mandatory custom-scrollbar-hide bg-black relative">
                {feedItems.map((feedObj, index) => (
                    <div 
                        key={`${feedObj.type}-${feedObj.item.id || feedObj.item._id}-${index}`} 
                        className="feed-item w-full h-screen snap-start snap-always relative flex items-center justify-center bg-zinc-950"
                        data-index={index}
                    >
                        {feedObj.type === 'product' ? (
                            <ProductFeedView product={feedObj.item} isActive={index === activeItemIndex} />
                        ) : (
                            <ContentFeedView content={feedObj.item} isActive={index === activeItemIndex} />
                        )}
                        
                        {/* Gradient overlay for bottom text visibility */}
                        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
                        
                        {/* Brief Info Overlay at bottom */}
                        <div className="absolute bottom-6 left-4 right-20 z-20 text-white drop-shadow-md pointer-events-none">
                            <h2 className="text-lg sm:text-xl font-bold mb-1 line-clamp-1">
                                {feedObj.type === 'product' ? feedObj.item.product_name : (feedObj.item.vendor_username || 'Vendor')}
                            </h2>
                            <p className="text-sm text-gray-200 line-clamp-2">
                                {feedObj.type === 'product' ? (feedObj.item.description || feedObj.item.category) : feedObj.item.caption}
                            </p>
                            {feedObj.type === 'product' && (
                                <p className="text-lg font-bold text-amber-400 mt-2">₦{feedObj.item.price}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
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
                />
            )}
        </div>
    );
}

export default function FeedPage() {
    return (
        <Suspense fallback={
            <div className="w-full h-screen bg-black flex items-center justify-center text-white flex-col gap-4">
                <div className="w-12 h-12 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <p className="font-semibold tracking-widest text-sm uppercase text-gray-400">Loading Feed</p>
            </div>
        }>
            <FeedContent />
        </Suspense>
    );
}

// Sub-components for clean rendering
function ProductFeedView({ product, isActive }: { product: any, isActive: boolean }) {
    const images = product.image_url && product.image_url.length > 0 ? product.image_url : ['/placeholder.svg'];
    const [activeImage, setActiveImage] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.clientWidth;
        const newIndex = Math.round(scrollLeft / width);
        if (newIndex !== activeImage) {
            setActiveImage(newIndex);
        }
    };

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeImage < images.length - 1 && scrollRef.current) {
            const width = scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left: (activeImage + 1) * width, behavior: 'smooth' });
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeImage > 0 && scrollRef.current) {
            const width = scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left: (activeImage - 1) * width, behavior: 'smooth' });
        }
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-zinc-900 overflow-hidden">
            <div 
                ref={scrollRef}
                className="w-full h-full flex overflow-x-auto snap-x snap-mandatory custom-scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={handleScroll}
            >
                {images.map((img: any, idx: number) => (
                    <div key={idx} className="min-w-full h-full snap-start snap-always flex items-center justify-center shrink-0">
                        <img 
                            src={img} 
                            alt={`${product.product_name} - ${idx + 1}`} 
                            className="w-full h-full object-cover sm:object-contain transition-opacity duration-300"
                        />
                    </div>
                ))}
            </div>
            
            {/* Image Navigation - hidden on mobile, swipe instead */}
            {images.length > 1 && (
                <>
                    {activeImage > 0 && (
                        <button 
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full hidden sm:flex items-center justify-center text-white hover:bg-black/60 z-30"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    {activeImage < images.length - 1 && (
                        <button 
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full hidden sm:flex items-center justify-center text-white hover:bg-black/60 z-30"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                    
                    {/* Dots indicator */}
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                        {images.map((img: any, idx: number) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImage ? 'bg-white w-4' : 'bg-white/50 shadow-sm'}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function ContentFeedView({ content, isActive }: { content: any, isActive: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (isActive && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.log('Autoplay blocked:', e));
        } else if (!isActive && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive]);

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

    return (
        <div className="w-full h-full relative" onClick={togglePlay}>
            <video 
                ref={videoRef}
                src={content.video} 
                className="w-full h-full object-cover"
                loop
                playsInline
                muted={false}
            />
            
            {/* Play/Pause indicator overlay */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-30">
                    <div className="w-16 h-16 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white pl-1">
                        <Play size={32} />
                    </div>
                </div>
            )}
        </div>
    );
}
