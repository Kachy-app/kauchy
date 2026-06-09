"use client";
import React from 'react';
import { LayoutGrid, Smartphone, BookOpen, Armchair, Shirt, Dumbbell } from 'lucide-react';

interface CategoryNavProps {
  categories: { id: string; label: string }[];
  currentCategory: string;
  onSelectCategory: (id: string) => void;
}

export default function CategoryNav({ categories, currentCategory, onSelectCategory }: CategoryNavProps) {
  
  // Map category IDs to specific icons and colors
  const getCategoryDetails = (id: string) => {
    switch (id) {
      case 'all': return { icon: <LayoutGrid className="w-6 h-6" />, color: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white', active: 'bg-blue-600 text-white shadow-md' };
      case 'electronics': return { icon: <Smartphone className="w-6 h-6" />, color: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white', active: 'bg-purple-600 text-white shadow-md' };
      case 'books': return { icon: <BookOpen className="w-6 h-6" />, color: 'bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white', active: 'bg-orange-600 text-white shadow-md' };
      case 'furniture': return { icon: <Armchair className="w-6 h-6" />, color: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white', active: 'bg-emerald-600 text-white shadow-md' };
      case 'clothing': return { icon: <Shirt className="w-6 h-6" />, color: 'bg-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white', active: 'bg-pink-600 text-white shadow-md' };
      case 'sports': return { icon: <Dumbbell className="w-6 h-6" />, color: 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white', active: 'bg-red-600 text-white shadow-md' };
      default: return { icon: <LayoutGrid className="w-6 h-6" />, color: 'bg-gray-100 text-gray-600 group-hover:bg-gray-600 group-hover:text-white', active: 'bg-gray-600 text-white shadow-md' };
    }
  };

  return (
    <div className="py-6 overflow-x-auto hide-scrollbar mb-8">
      <div className="flex gap-4 min-w-max px-2 md:justify-center">
        {categories.map((cat) => {
          const details = getCategoryDetails(cat.id);
          const isActive = currentCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group flex flex-col items-center gap-3 min-w-[80px] focus:outline-none"
            >
              <div 
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform group-hover:-translate-y-1 
                ${isActive ? details.active : details.color}`}
              >
                {details.icon}
              </div>
              <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
