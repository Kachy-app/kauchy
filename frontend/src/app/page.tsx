"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Footer from '@/components/Footer';
import HeroBanner from '@/components/HeroBanner';
import CategoryNav from '@/components/CategoryNav';
import { useAuth } from '@/context/AuthContext';

export default function Home(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;

  useEffect(() => {
    fetchProducts();

    // Auto-open product modal if productId is in URL (now navigates to feed)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('productId');
      if (productId) {
        handleProductClick({ id: productId });
        // Optionally clean up URL so it doesn't reopen on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const headers: any = { "Content-Type": "application/json" };
      if (user) {
        headers["Authorization"] = `Bearer ${user.access}`;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        setFilteredProducts(data);
      } else {
        console.error("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let result = products;

    if (currentCategory !== 'all') {
      result = result.filter((p: any) => p.category?.toLowerCase() === currentCategory.toLowerCase());
    }

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [currentCategory, products]);

  const handleProductClick = (product: any) => {
      const productId = product._id || product.id;
      if (productId) {
          router.push(`/feed?type=product&id=${productId}`);
      }
  };

  const categories = [
    { id: 'all', label: 'All Products' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'books', label: 'Books' },
    { id: 'furniture', label: 'Furniture' },
    { id: 'clothing', label: 'Clothing' },
    { id: 'sports', label: 'Sports' }
  ];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <>
      <div className="max-w-[1600px] mx-auto px-2.5 py-5 sm:px-5 sm:py-10 min-h-[calc(100vh-140px)]">
        <HeroBanner />

        <CategoryNav
          categories={categories}
          currentCategory={currentCategory}
          onSelectCategory={setCurrentCategory}
        />

        {/* Flash Sales Section */}
        {products.length > 0 && currentCategory === 'all' && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-red-500">⚡</span> Flash Sales
              </h2>
              <button className="text-blue-600 font-medium hover:underline text-sm">View All</button>
            </div>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 -mx-2.5 px-2.5 sm:-mx-5 sm:px-5 md:mx-0 md:px-0 scrollbar-hide">
              {products.slice(0, 6).map(product => (
                <div key={`flash-${product.id}`} className="min-w-[220px] md:min-w-[250px] flex-shrink-0">
                  <ProductCard product={product} onClick={handleProductClick} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentCategory === 'all' ? 'Just For You' : categories.find(c => c.id === currentCategory)?.label || 'Products'}
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 sm:gap-6">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                  <div className="h-[180px] bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : filteredProducts.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">No products found.</p>
            ) : (
              currentItems.map(product => (
                <ProductCard key={product.id} product={product} onClick={handleProductClick} />
              ))
            )}
          </div>

          {filteredProducts.length > itemsPerPage && (
            <div className="flex items-center justify-center gap-3 mt-10 py-5">
              <button
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm font-medium transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                disabled={currentPage === 1}
                onClick={() => paginate(currentPage - 1)}
              >
                &lt;
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    className={`min-w-[38px] h-[38px] flex items-center justify-center px-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm font-medium transition-all duration-200 hover:bg-gray-50 hover:border-blue-600 ${currentPage === number ? '!bg-blue-600 !text-white !border-blue-600' : ''
                      }`}
                    onClick={() => paginate(number)}
                  >
                    {number}
                  </button>
                ))}
              </div>
              <button
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm font-medium transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                disabled={currentPage === totalPages}
                onClick={() => paginate(currentPage + 1)}
              >
                &gt;
              </button>
            </div>
          )}
        </section>

        <Footer />
      </div>
    </>
  );
}
