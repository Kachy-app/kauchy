"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import VideoModal from '@/components/VideoModal';

export default function InventoryPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('inventory');
    const [products, setProducts] = useState<any[]>([]);
    const [contents, setContents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [isAddContentOpen, setIsAddContentOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [isEditProductOpen, setIsEditProductOpen] = useState(false);
    const [selectedVideoToPlay, setSelectedVideoToPlay] = useState<any | null>(null);

    // Drag & Drop Image States
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isDraggingImages, setIsDraggingImages] = useState(false);

    // Content Upload States
    const [contentVideoFile, setContentVideoFile] = useState<File | null>(null);
    const [contentVideoPreview, setContentVideoPreview] = useState<string>('');
    const [contentCaption, setContentCaption] = useState<string>('');
    const videoInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            loadData();
        } else {
            const timer = setTimeout(() => setLoading(false), 500);
            return () => clearTimeout(timer);
        }
    }, [user, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'inventory') {
                const res = await fetch('https://kachy-production.up.railway.app/products/my_products/', {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProducts(Array.isArray(data) ? data : []);
                }
            } else {
                const res = await fetch(`https://kachy-production.up.railway.app/customers/mycontents/?_=${Date.now()}`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setContents(Array.isArray(data) ? data : []);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm("Delete product?")) return;
        try {
            const res = await fetch(`https://kachy-production.up.railway.app/products/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${user.access}` }
            });
            if (res.ok) {
                setProducts(prev => prev.filter(p => p.id !== id));
                showToast("Product deleted", "success");
            } else {
                showToast("Failed to delete product", "error");
            }
        } catch (e) { showToast("Error deleting product", "error"); }
    };

    // Img Drag & Drop
    const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingImages(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addImages(Array.from(e.dataTransfer.files));
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addImages(Array.from(e.target.files));
        }
    };

    const addImages = (files: File[]) => {
        const newFiles = [...selectedImages, ...files];
        setSelectedImages(newFiles);
        setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
    };

    const removeImage = (index: number) => {
        const newFiles = [...selectedImages];
        newFiles.splice(index, 1);
        setSelectedImages(newFiles);
        setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
    };

    // Close and Clear Image Modals
    const closeAddProductModal = () => {
        setIsAddProductOpen(false);
        setSelectedImages([]);
        setImagePreviews([]);
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (selectedImages.length === 0) {
            showToast("At least one image is required", "error");
            return;
        }

        const formData = new FormData(e.currentTarget);
        formData.delete('image_url');
        selectedImages.forEach(file => {
            formData.append('image_url', file);
        });

        try {
            const res = await fetch('https://kachy-production.up.railway.app/products/create', {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.access}` },
                body: formData
            });
            if (res.ok) {
                closeAddProductModal();
                loadData();
                showToast("Product created successfully", "success");
            } else {
                showToast("Failed to create product", "error");
            }
        } catch (err) { showToast("Error creating product", "error"); }
    };

    const handleUpdateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(fd.entries());
        try {
            const res = await fetch(`https://kachy-production.up.railway.app/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.access}`
                },
                body: JSON.stringify({
                    product_name: data.product_name,
                    description: data.description,
                    price: parseFloat(data.price),
                    quantity: parseInt(data.quantity),
                    category: data.category
                })
            });
            if (res.ok) {
                setIsEditProductOpen(false);
                setEditingProduct(null);
                loadData();
                showToast("Product updated", "success");
            } else { showToast("Failed to update product", "error"); }
        } catch (e) { showToast("Error updating product", "error"); }
    };

    // Content Upload Handlers
    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setContentVideoFile(file);
            setContentVideoPreview(URL.createObjectURL(file));
        }
    };

    const removeVideo = () => {
        setContentVideoFile(null);
        setContentVideoPreview('');
        if (videoInputRef.current) videoInputRef.current.value = "";
    };

    const closeAddContentModal = () => {
        setIsAddContentOpen(false);
        removeVideo();
        setContentCaption('');
    };

    const handleCreateContent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!contentCaption || !contentVideoFile) {
            showToast("Please enter a caption and select a video", "error");
            return;
        }
        
        const formData = new FormData();
        formData.append('caption', contentCaption);
        formData.append('video', contentVideoFile);
        
        try {
            const res = await fetch('https://kachy-production.up.railway.app/customers/content/upload/', {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.access}` },
                body: formData
            });
            if (res.ok) {
                closeAddContentModal();
                loadData();
                showToast("Content added successfully", "success");
            } else {
                showToast("Failed to add content", "error");
            }
        } catch (err) { showToast("Error appending content", "error"); }
    };

    if (!user) return <div className="p-10 text-center">Please login</div>;

    return (
        <div className="container mx-auto px-2.5 py-5 sm:px-5 sm:py-10 w-full max-w-[1400px]">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-[#1d1d1d]">Inventory Management</h1>
                {activeTab === 'inventory' ? (
                    <button
                        className="bg-[#1c6ef2] text-white px-6 py-2.5 rounded-full font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
                        onClick={() => setIsAddProductOpen(true)}
                    >
                        + Add Product
                    </button>
                ) : (
                    <button
                        className="bg-[#ffb800] text-white px-6 py-2.5 rounded-full font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
                        onClick={() => setIsAddContentOpen(true)}
                    >
                        + Add Content
                    </button>
                )}
            </div>

            <div className="flex gap-5 border-b border-gray-200 mb-8">
                <button
                    className={`pb-2.5 px-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'inventory' ? 'text-[#1c6ef2] border-[#1c6ef2]' : 'text-gray-500 border-transparent hover:text-[#1c6ef2]'}`}
                    onClick={() => setActiveTab('inventory')}
                >
                    My Products
                </button>
                <button
                    className={`pb-2.5 px-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'content' ? 'text-[#ffb800] border-[#ffb800]' : 'text-gray-500 border-transparent hover:text-[#ffb800]'}`}
                    onClick={() => setActiveTab('content')}
                >
                    My Content
                </button>
            </div>

            {loading ? <p className="text-center py-10 text-gray-500">Loading...</p> : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 sm:gap-6">
                    {activeTab === 'inventory' && products.map(p => (
                        <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-legacy-card hover:shadow-legacy-hover hover:-translate-y-1 transition-all duration-300">
                            <img src={p.image_url?.[0] || '/placeholder.svg'} className="w-full h-40 object-cover bg-gray-50" alt={p.product_name} />
                            <div className="p-4">
                                <div className="font-semibold text-[#1d1d1d] mb-1 truncate">{p.product_name}</div>
                                <div className="text-[#ffb800] font-bold mb-2">₦{p.price}</div>
                                <div className="text-xs text-gray-500 mb-3">Qty: {p.quantity} | Views: {p.view_count || 0}</div>
                                <div className="flex gap-2">
                                    <button
                                        className="flex-1 py-1.5 bg-[#1c6ef2] text-white text-xs rounded hover:bg-[#165bbd] transition-colors"
                                        onClick={() => { setEditingProduct(p); setIsEditProductOpen(true); }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="flex-1 py-1.5 bg-[#ff4d4d] text-white text-xs rounded hover:bg-[#e63e3e] transition-colors"
                                        onClick={() => handleDeleteProduct(p.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {activeTab === 'inventory' && products.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            <div className="text-5xl mb-3">📦</div>
                            <div>No products found. Add one!</div>
                        </div>
                    )}

                    {activeTab === 'content' && contents.map((c, i) => (
                        <div 
                            key={i} 
                            className="bg-white rounded-xl overflow-hidden shadow-legacy-card cursor-pointer group" 
                            onClick={() => setSelectedVideoToPlay(c)}
                            onMouseEnter={(e) => e.currentTarget.querySelector('video')?.play()}
                            onMouseLeave={(e) => e.currentTarget.querySelector('video')?.pause()}
                        >
                            <div className="relative w-full h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
                                <video src={c.video} className="w-full h-full object-cover" preload="metadata" muted loop playsInline></video>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col items-center justify-center gap-2 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    <span className="text-5xl drop-shadow-md text-white">▶</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="font-medium text-[#1d1d1d] truncate text-center">{c.caption || 'Untitled'}</div>
                            </div>
                        </div>
                    ))}

                    {activeTab === 'content' && contents.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            <div className="text-5xl mb-3">🎬</div>
                            <div>No content found. Upload something!</div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Product Modal */}
            {isAddProductOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeAddProductModal}>
                    <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-[#1d1d1d]">Add New Product</h3>
                            <button onClick={closeAddProductModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg transition-colors">✕</button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <form id="addProductForm" onSubmit={handleCreateProduct}>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Product Name *</label>
                                    <input name="product_name" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors" placeholder="Enter product name" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Description *</label>
                                    <textarea name="description" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] min-h-[80px] transition-colors" placeholder="Describe your product"></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Price (₦) *</label>
                                        <input name="price" type="number" required placeholder="0.00" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Quantity *</label>
                                        <input name="quantity" type="number" required placeholder="1" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors" />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Category *</label>
                                    <select name="category" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors bg-white">
                                        <option value="">Select Category</option>
                                        <option value="electronics">Electronics</option>
                                        <option value="books">Books</option>
                                        <option value="furniture">Furniture</option>
                                        <option value="clothing">Clothing</option>
                                        <option value="sports">Sports</option>
                                        <option value="others">Others</option>
                                    </select>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Product Images *</label>
                                    <div 
                                        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDraggingImages ? 'border-[#1c6ef2] bg-blue-50/50' : 'border-gray-300 hover:border-[#1c6ef2] hover:bg-gray-50'}`}
                                        onDragOver={e => { e.preventDefault(); setIsDraggingImages(true); }}
                                        onDragLeave={() => setIsDraggingImages(false)}
                                        onDrop={handleImageDrop}
                                        onClick={() => imageInputRef.current?.click()}
                                    >
                                        <input type="file" required={selectedImages.length === 0} multiple accept="image/*" ref={imageInputRef} onChange={handleImageSelect} className="hidden" />
                                        <div className="text-sm text-gray-500 font-medium">📸 Click to upload or drag and drop<br/><span className="text-xs font-normal">You can select multiple images</span></div>
                                    </div>
                                    {/* Image Previews */}
                                    {imagePreviews.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {imagePreviews.map((src, idx) => (
                                                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                                                    <img src={src} className="w-full h-full object-cover bg-gray-50" alt={`Preview ${idx}`} />
                                                    <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button type="submit" className="w-full py-2.5 bg-[#1c6ef2] hover:-translate-y-[2px] hover:shadow-[0_8px_16px_rgba(28,110,242,0.3)] text-white font-bold rounded-lg transition-all">Add Product</button>
                                    <button type="button" onClick={closeAddProductModal} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 rounded-lg transition-colors">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {isEditProductOpen && editingProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsEditProductOpen(false)}>
                    <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-[#1d1d1d]">Edit Product</h3>
                            <button onClick={() => setIsEditProductOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg transition-colors">✕</button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <form onSubmit={handleUpdateProduct}>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Product Name</label>
                                    <input name="product_name" defaultValue={editingProduct.product_name} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Description</label>
                                    <textarea name="description" defaultValue={editingProduct.description} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] min-h-[80px] transition-colors"></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Price (₦)</label>
                                        <input name="price" type="number" defaultValue={editingProduct.price} required step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Quantity</label>
                                        <input name="quantity" type="number" defaultValue={editingProduct.quantity} required min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors" />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Category</label>
                                    <select name="category" defaultValue={editingProduct.category} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors bg-white">
                                        <option value="electronics">Electronics</option>
                                        <option value="books">Books</option>
                                        <option value="furniture">Furniture</option>
                                        <option value="clothing">Clothing</option>
                                        <option value="sports">Sports</option>
                                        <option value="others">Others</option>
                                    </select>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 mb-6 font-medium">
                                    Views: <strong>{editingProduct.view_count || 0}</strong>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button type="submit" className="w-full py-2.5 bg-[#1c6ef2] hover:-translate-y-[2px] hover:shadow-[0_8px_16px_rgba(28,110,242,0.3)] text-white font-bold rounded-lg transition-all">Save Changes</button>
                                    <button type="button" onClick={() => { handleDeleteProduct(editingProduct.id); setIsEditProductOpen(false); }} className="w-full py-2.5 bg-[#ff4d4d] hover:bg-[#e63e3e] text-white font-bold rounded-lg transition-colors">Delete Product</button>
                                    <button type="button" onClick={() => setIsEditProductOpen(false)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 rounded-lg transition-colors">Close</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Content Modal */}
            {isAddContentOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeAddContentModal}>
                    <div className="bg-white rounded-xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-[#1d1d1d]">Add Content</h3>
                            <button onClick={closeAddContentModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg transition-colors">✕</button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <form id="uploadModalForm" onSubmit={handleCreateContent}>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Content Video</label>
                                    
                                    {!contentVideoPreview ? (
                                        <div 
                                            className="relative border-2 border-dashed border-[#ffb800] rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-[#e6a700] hover:bg-[#ffb800]/5"
                                            onClick={() => videoInputRef.current?.click()}
                                        >
                                            <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" />
                                            <div className="text-sm text-gray-500 font-medium">🎥 Upload a video (MP4, WebM)</div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 border border-gray-200 p-3 rounded-lg bg-white">
                                            <video src={contentVideoPreview} controls className="w-full max-h-[200px] bg-black rounded-md" />
                                            <div className="text-xs text-gray-500 truncate">{contentVideoFile?.name}</div>
                                            <button type="button" onClick={removeVideo} className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-md transition-colors">Remove</button>
                                        </div>
                                    )}
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold mb-1.5 text-[#1d1d1d]">Caption</label>
                                    <textarea required rows={4} value={contentCaption} onChange={e => setContentCaption(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1c6ef2] transition-colors resize-y" placeholder="Describe your content"></textarea>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button type="submit" className="w-full py-2.5 bg-[#ffb800] hover:-translate-y-[2px] hover:shadow-[0_8px_16px_rgba(255,184,0,0.3)] text-white font-bold rounded-lg transition-all">Upload Content</button>
                                    <button type="button" onClick={closeAddContentModal} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 rounded-lg transition-colors">Close</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Viewer Modal */}
            {selectedVideoToPlay && (
                <VideoModal
                    video={selectedVideoToPlay.video}
                    caption={selectedVideoToPlay.caption}
                    contentId={selectedVideoToPlay.id}
                    likes={selectedVideoToPlay.likes_count || 0}
                    views={selectedVideoToPlay.views || 0}
                    isLikedByUser={selectedVideoToPlay.is_liked_by_user || false}
                    reviewsCount={selectedVideoToPlay.reviews_count || 0}
                    onClose={() => setSelectedVideoToPlay(null)}
                />
            )}
        </div>
    );
}
