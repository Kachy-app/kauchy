"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

const slides = [
  {
    id: 1,
    tag: "Weekend Special",
    tagColor: "bg-yellow-400 text-blue-900",
    titleStart: "Upgrade Your",
    titleHighlight: "Lifestyle Today",
    titleHighlightGradient: "from-yellow-300 to-yellow-500",
    description: "Discover millions of products with unbeatable prices. Fast shipping and guaranteed quality on all orders.",
    buttonText: "Shop Now",
    buttonColor: "bg-yellow-400 hover:bg-yellow-500 text-blue-900",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
    gradient: "from-blue-900 via-blue-800 to-indigo-900"
  },
  {
    id: 2,
    tag: "New Arrivals",
    tagColor: "bg-pink-500 text-white",
    titleStart: "Discover the",
    titleHighlight: "Latest Trends",
    titleHighlightGradient: "from-pink-300 to-rose-300",
    description: "Explore our brand new collection of fashion, electronics, and home essentials just added to the store.",
    buttonText: "View Collection",
    buttonColor: "bg-pink-500 hover:bg-pink-600 text-white",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
    gradient: "from-rose-900 via-purple-900 to-indigo-900"
  },
  {
    id: 3,
    tag: "Flash Sale",
    tagColor: "bg-red-500 text-white",
    titleStart: "Up to 50% Off",
    titleHighlight: "Top Electronics",
    titleHighlightGradient: "from-red-300 to-orange-300",
    description: "Limited time offer! Upgrade your tech gadgets and smart home devices. Best deals of the season.",
    buttonText: "Grab Deals",
    buttonColor: "bg-red-500 hover:bg-red-600 text-white",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2070&auto=format&fit=crop",
    gradient: "from-gray-900 via-slate-800 to-zinc-900"
  }
];

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsSwiping(true);
    if ('touches' in e) {
      touchStartX.current = e.touches[0].clientX;
    } else {
      touchStartX.current = (e as React.MouseEvent).clientX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping) return;
    if ('touches' in e) {
      touchEndX.current = e.touches[0].clientX;
    } else {
      touchEndX.current = (e as React.MouseEvent).clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    // Only process if endX was recorded
    if (touchEndX.current === 0) return;

    const diff = touchStartX.current - touchEndX.current;

    // Minimum swipe distance
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      } else {
        // Swipe right
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      }
    }
    touchEndX.current = 0;
  };

  return (
    <div 
      className="relative w-full h-[220px] md:h-[400px] lg:h-[450px] rounded-2xl overflow-hidden mb-8 md:mb-12 shadow-lg group cursor-grab active:cursor-grabbing transition-all duration-500 ring-1 ring-transparent hover:ring-blue-400/60 hover:shadow-[0_0_50px_rgba(59,130,246,0.4)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <div 
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={slide.id} className="min-w-full h-full relative flex-shrink-0">
            {/* Background Image / Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}>
              <div 
                className="absolute inset-0 opacity-20 mix-blend-overlay bg-cover bg-center transition-all duration-700 hover:scale-105" 
                style={{ backgroundImage: `url('${slide.image}')` }}
              />
            </div>

            {/* Decorative Circles */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Content */}
            <div className="relative h-full flex flex-col justify-center px-6 md:px-16 lg:px-24 z-10 w-full select-none pointer-events-none">
              <span className={`inline-block px-2 md:px-3 py-1 mb-2 md:mb-4 text-[10px] md:text-xs font-bold tracking-wider uppercase rounded-full w-fit ${slide.tagColor}`}>
                {slide.tag}
              </span>
              <h1 className="text-2xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 md:mb-4 leading-tight max-w-2xl">
                {slide.titleStart} <br className="hidden md:block" />
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.titleHighlightGradient}`}>
                  {slide.titleHighlight}
                </span>
              </h1>
              <p className="text-blue-50 text-xs md:text-xl mb-4 md:mb-8 max-w-xl line-clamp-2 md:line-clamp-none">
                {slide.description}
              </p>
              
              <button className={`flex items-center gap-2 font-bold py-2 md:py-3.5 px-6 md:px-8 text-sm md:text-base rounded-full w-fit transition-transform duration-300 hover:scale-105 shadow-md ${slide.buttonColor} pointer-events-auto`}>
                {slide.buttonText}
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10 pointer-events-none">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 pointer-events-auto ${
              currentSlide === idx ? "w-8 bg-yellow-400" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Left/Right controls (visible on hover) */}
      <button 
        onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm pointer-events-auto cursor-pointer"
      >
        <ArrowRight className="w-5 h-5 rotate-180" />
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev + 1) % slides.length); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm pointer-events-auto cursor-pointer"
      >
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
