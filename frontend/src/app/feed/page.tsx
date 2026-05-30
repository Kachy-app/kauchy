"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Info, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import FeedSidebar from '@/components/FeedSidebar';

// Utility to shuffle array
function shuffleArray(array: any[]) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export default function FeedPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { addToCart } = useCart();

    const initialType = searchParams.get('type');
    const initialId = searchParams.get('id');

    const [feedItems, setFeedItems] = useState<{ type: 'product' | 'content'; item: any }[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState(0);

    const observerRef = useRef<IntersectionObserver | null>(null);

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

            // Fetch products and contents concurrently
            const [prodRes, contRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/`, { headers }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/allcontents/`, { headers })
            ]);

            let products = prodRes.ok ? await prodRes.json() : [];
            let contents = contRes.ok ? await contRes.json() : [];

            let initialItemObj = null;

            if (initialId && initialType) {
                if (initialType === 'product') {
                    // Try to find in fetched products, or fetch specifically
                    const found = products.find((p: any) => p.id?.toString() === initialId || p._id?.toString() === initialId);
                    if (found) {
                        initialItemObj = { type: 'product', item: found };
                        products = products.filter((p: any) => p.id !== found.id && p._id !== found._id);
                    } else {
                        // Fetch specific product
                        const specRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${initialId}`, { headers });
                        if (specRes.ok) {
                            initialItemObj = { type: 'product', item: await specRes.json() };
                        }
                    }
                } else if (initialType === 'content') {
                    const found = contents.find((c: any) => c.id?.toString() === initialId);
                    if (found) {
                        initialItemObj = { type: 'content', item: found };
                        contents = contents.filter((c: any) => c.id !== found.id);
                    }
                }
            }

            // Map to feed format
            const mappedProducts = products.map((p: any) => ({ type: 'product' as const, item: p }));
            const mappedContents = contents.map((c: any) => ({ type: 'content' as const, item: c }));

            // Mix them
            let mixedFeed = shuffleArray([...mappedProducts, ...mappedContents]);

            if (initialItemObj) {
                mixedFeed = [initialItemObj, ...mixedFeed];
            }

            setFeedItems(mixedFeed);

        } catch (error) {
            console.error("Error loading feed:", error);
        } finally {
            setLoading(false);
        }
    };

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
                    className="w-12 h-12 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all pointer-events-auto"
                >
                    <X size={24} />
                </button>

                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="w-12 h-12 bg-black/40 backdrop-blur-md text-white rounded-full flex flex-col items-center justify-center hover:bg-black/60 transition-all pointer-events-auto border border-white/20 animate-pulse"
                >
                    <Info size={24} />
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
                            <h2 className="text-xl font-bold mb-1 line-clamp-1">
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

// Sub-components for clean rendering
function ProductFeedView({ product, isActive }: { product: any, isActive: boolean }) {
    const images = product.image_url && product.image_url.length > 0 ? product.image_url : ['/placeholder.svg'];
    const [activeImage, setActiveImage] = useState(0);

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeImage < images.length - 1) setActiveImage(prev => prev + 1);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeImage > 0) setActiveImage(prev => prev - 1);
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center">
            <img 
                src={images[activeImage]} 
                alt={product.product_name} 
                className="w-full h-full object-cover sm:object-contain bg-zinc-900 transition-opacity duration-300"
            />
            
            {/* Image Navigation */}
            {images.length > 1 && (
                <>
                    {activeImage > 0 && (
                        <button 
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 z-30"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    {activeImage < images.length - 1 && (
                        <button 
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 z-30"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                    
                    {/* Dots indicator */}
                    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                        {images.map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImage ? 'bg-white w-4' : 'bg-white/50'}`} />
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
