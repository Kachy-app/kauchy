"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Info, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
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

    const initialType = searchParams.get('type');
    const initialId = searchParams.get('id');
    const vendorId = searchParams.get('vendorId');

    const [feedItems, setFeedItems] = useState<{ type: 'product' | 'content'; item: any }[]>([]);
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
            const headers: any = { "Content-Type": "application/json" };
            if (user?.access) {
                headers["Authorization"] = `Bearer ${user.access}`;
            }

            const feedUrl = vendorId 
                ? `${process.env.NEXT_PUBLIC_API_URL}/customers/feed/?vendor_id=${vendorId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/customers/feed/`;

            const feedRes = await fetch(feedUrl, { headers });

            let feedData: any[] = [];
            if (feedRes.ok) {
                const raw = await feedRes.json();
                feedData = Array.isArray(raw) ? raw : [];
            } else {
                console.warn('Feed fetch failed:', feedRes.status, feedRes.statusText);
            }

            let mapped = feedData.map((item: any) => ({
                type: (item.feed_type === 'product' ? 'product' : 'content') as 'product' | 'content',
                item,
            }));

            if (initialId && initialType) {
                const targetIndex = mapped.findIndex((f: any) => {
                    const id = f.item.id?.toString() || f.item._id?.toString();
                    return f.type === initialType && id === initialId;
                });

                if (targetIndex > 0) {
                    const [target] = mapped.splice(targetIndex, 1);
                    mapped = [target, ...mapped];
                } else if (targetIndex === -1 && initialType === 'product') {
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

    const trackView = useCallback((feedItem: { type: 'product' | 'content'; item: any }) => {
        const itemId = feedItem.item.id || feedItem.item._id;
        const viewKey = `${feedItem.type}-${itemId}`;

        if (viewedItemsRef.current.has(viewKey) || !user?.access || !itemId) return;
        viewedItemsRef.current.add(viewKey);

        const headers: any = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.access}`,
        };

        if (feedItem.type === 'product') {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${itemId}`, { headers }).catch(() => {});
        } else {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${itemId}/view/`, {
                method: 'POST',
                headers,
            }).catch(() => {});
        }
    }, [user]);

    const handleSlideChange = (swiper: SwiperType) => {
        const index = swiper.activeIndex;
        setActiveItemIndex(index);
        if (feedItems.length > 0 && index < feedItems.length) {
            trackView(feedItems[index]);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-[100dvh] bg-black flex items-center justify-center text-white flex-col gap-4">
                <div className="w-12 h-12 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <p className="font-semibold tracking-widest text-sm uppercase text-gray-400">Loading Feed</p>
            </div>
        );
    }

    if (feedItems.length === 0) {
        return (
            <div className="w-full h-[100dvh] bg-black flex flex-col items-center justify-center text-white gap-4">
                <p>No content available.</p>
                <button onClick={() => router.back()} className="px-6 py-2 bg-white text-black rounded-full font-bold">Go Back</button>
            </div>
        );
    }

    const activeItem = feedItems[activeItemIndex];

    return (
        <div className="w-full h-[100dvh] bg-black relative overflow-hidden">
            {/* Global Styles to hide Swiper default outlines */}
            <style dangerouslySetInnerHTML={{__html: `
                .swiper-container { width: 100%; height: 100%; }
                .swiper-slide { display: flex; justify-content: center; align-items: center; }
            `}} />

            {/* Overlay Navigation & Actions */}
            <div className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-center z-40 pointer-events-none">
                <button 
                    onClick={() => {
                        if (window.history.length > 2) router.back();
                        else router.push('/');
                    }} 
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all pointer-events-auto shadow-lg"
                >
                    <X size={22} />
                </button>

                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-md text-white rounded-full flex flex-col items-center justify-center hover:bg-black/60 transition-all pointer-events-auto border border-white/20 shadow-lg animate-pulse"
                >
                    <Info size={22} />
                </button>
            </div>

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
                {feedItems.map((feedObj, index) => (
                    <SwiperSlide key={`${feedObj.type}-${feedObj.item.id || feedObj.item._id}-${index}`} virtualIndex={index}>
                        <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
                            {feedObj.type === 'product' ? (
                                <ProductFeedView product={feedObj.item} isActive={index === activeItemIndex} />
                            ) : (
                                <ContentFeedView content={feedObj.item} isActive={index === activeItemIndex} />
                            )}
                            
                            {/* Gradient overlay for bottom text visibility */}
                            <div className="absolute bottom-0 left-0 w-full h-2/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />
                            
                            {/* Brief Info Overlay at bottom */}
                            <div className="absolute bottom-6 left-4 right-20 z-20 text-white drop-shadow-md pointer-events-none flex flex-col justify-end">
                                <h2 className="text-xl sm:text-2xl font-bold mb-1 line-clamp-1 drop-shadow-lg">
                                    {feedObj.type === 'product' ? feedObj.item.product_name : (feedObj.item.vendor_username || 'Vendor')}
                                </h2>
                                <p className="text-[15px] sm:text-base text-gray-200 line-clamp-2 drop-shadow-md leading-snug">
                                    {feedObj.type === 'product' ? (feedObj.item.description || feedObj.item.category) : feedObj.item.caption}
                                </p>
                                {feedObj.type === 'product' && (
                                    <div className="mt-2.5 inline-block bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10 self-start">
                                        <p className="text-lg font-bold text-amber-400">₦{feedObj.item.price}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

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
            <div className="w-full h-[100dvh] bg-black flex items-center justify-center text-white flex-col gap-4">
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

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-zinc-900 overflow-hidden">
            <Swiper
                direction="horizontal"
                slidesPerView={1}
                spaceBetween={0}
                onSlideChange={(swiper) => setActiveImage(swiper.activeIndex)}
                className="w-full h-full"
                nested={true} // Allows horizontal swiper inside vertical swiper
            >
                {images.map((img: any, idx: number) => (
                    <SwiperSlide key={idx} className="w-full h-full flex items-center justify-center">
                        <img 
                            src={img} 
                            alt={`${product.product_name} - ${idx + 1}`} 
                            className="w-full h-full object-cover sm:object-contain transition-opacity duration-500 ease-in-out"
                            style={{ opacity: isActive ? 1 : 0 }}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
            
            {/* Dots indicator for Images */}
            {images.length > 1 && (
                <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 flex gap-1.5 z-30 pointer-events-none">
                    {images.map((_: any, idx: number) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === activeImage ? 'bg-white w-4' : 'bg-white/40 shadow-sm'}`} />
                    ))}
                </div>
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
                    <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white pl-2 border border-white/20 shadow-2xl">
                        <Play size={40} />
                    </div>
                </div>
            )}
        </div>
    );
}
