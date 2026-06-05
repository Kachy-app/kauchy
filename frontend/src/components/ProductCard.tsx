"use client";
import React from 'react';

// Define Interface for Product
interface Product {
    _id?: string;
    product_name: string;
    price: number;
    vendor_username?: string;
    institute?: string;
    image_url?: string[];
    // Add other fields as necessary based on API response
}

interface ProductCardProps {
    product: Product;
    onClick: (product: Product) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-legacy-card cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-legacy-hover" onClick={() => onClick(product)}>
            {/* Fallback image logic handled inline or via utility, keeping it simple here */}
            <img
                src={(product.image_url && product.image_url.length > 0) ? product.image_url[0] : '/placeholder.svg'}
                alt={product.product_name}
                className="w-full h-[180px] object-cover bg-gray-50 dark:bg-zinc-800"
            />
            <div className="p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 leading-snug">{product.product_name}</div>
                <div className="text-base font-bold text-amber-400 mb-1.5">₦{product.price}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{product.vendor_username}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">📍 {product.institute}</div>
            </div>
        </div>
    );
}
