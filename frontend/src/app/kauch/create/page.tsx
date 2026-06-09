"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthWall } from '@/context/AuthGateContext';
import { Image as ImageIcon, Video, Plus, ArrowLeft, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface Kauch {
  id: number;
  name: string;
  followers_count: number;
}

interface MyProduct {
  id: number;
  product_name: string;
  price: string;
  image_url: string[];
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CreateKauchContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'post' | 'kauches'>('post');

  // Data from API
  const [myKauches, setMyKauches] = useState<Kauch[]>([]);
  const [myProducts, setMyProducts] = useState<MyProduct[]>([]);

  // Post State
  const [selectedKauchId, setSelectedKauchId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // New Kauch State
  const [showCreateKauch, setShowCreateKauch] = useState(false);
  const [newKauchName, setNewKauchName] = useState('');
  const [newKauchDesc, setNewKauchDesc] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [kauchSubmitting, setKauchSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchKauches = async () => {
      try {
        const res = await fetch(`${API}/kauch/my-kauches/`, {
          headers: { Authorization: `Bearer ${user.access}` },
        });
        if (res.ok) {
          const data = await res.json();
          const kauches: Kauch[] = Array.isArray(data) ? data : [];
          setMyKauches(kauches);
          if (kauches.length > 0) setSelectedKauchId(kauches[0].id);
        }
      } catch (e) {
        console.error('Failed to load kauches', e);
      }
    };

    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API}/products/my_products/`, {
          headers: { Authorization: `Bearer ${user.access}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMyProducts(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load products', e);
      }
    };

    fetchKauches();
    fetchProducts();
  }, [user]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKauchId || !description) {
      showToast('Please fill all required fields.', 'error');
      return;
    }
    if (!mediaFile) {
      showToast('Please upload an image or video.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('description', description);
    formData.append('media', mediaFile);
    formData.append('tagged_product_ids', JSON.stringify(selectedProducts));

    setPostSubmitting(true);
    try {
      const res = await fetch(`${API}/kauch/${selectedKauchId}/posts/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.access}` },
        body: formData,
      });
      if (res.ok) {
        showToast('Post created successfully!', 'success');
        router.push(`/kauch/${selectedKauchId}`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to create post.', 'error');
      }
    } catch (e) {
      showToast('Error creating post.', 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleCreateKauch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKauchName || !newKauchDesc) {
      showToast('Please fill all required fields.', 'error');
      return;
    }
    if (myKauches.length >= 2) {
      showToast('You can only have a maximum of 2 Kauches.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('name', newKauchName);
    formData.append('description', newKauchDesc);
    if (avatarFile) formData.append('avatar', avatarFile);

    setKauchSubmitting(true);
    try {
      const res = await fetch(`${API}/kauch/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.access}` },
        body: formData,
      });
      if (res.ok) {
        const created: Kauch = await res.json();
        showToast('Kauch created successfully!', 'success');
        setMyKauches(prev => [...prev, created]);
        if (selectedKauchId === '') setSelectedKauchId(created.id);
        setShowCreateKauch(false);
        setNewKauchName('');
        setNewKauchDesc('');
        setAvatarFile(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to create Kauch.', 'error');
      }
    } catch (e) {
      showToast('Error creating Kauch.', 'error');
    } finally {
      setKauchSubmitting(false);
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  if (!user) return <AuthWall reason="create a post" loading={authLoading} />;

  return (
    <div className="bg-gray-50 min-h-screen dark:bg-zinc-950 pb-20 pt-24 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 bg-white dark:bg-zinc-900 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-full transition-colors border border-gray-100 dark:border-zinc-800">
            <ArrowLeft size={20} className="text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Vendor Kauch Studio</h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 mb-6">
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'post' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
          >
            Create Post
          </button>
          <button
            onClick={() => setActiveTab('kauches')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'kauches' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
          >
            Manage Kauches
          </button>
        </div>

        {/* CREATE POST TAB */}
        {activeTab === 'post' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">New Feed Post</h2>

            <form onSubmit={handleCreatePost} className="space-y-6">
              {/* Select Kauch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Post to Kauch *</label>
                <select
                  value={selectedKauchId}
                  onChange={(e) => setSelectedKauchId(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                >
                  <option value="" disabled>Select a Kauch</option>
                  {myKauches.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
                {myKauches.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">You don't have any Kauches yet. Go to 'Manage Kauches' to create one.</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write an engaging caption..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[120px] resize-y"
                  required
                />
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Media (Image or Video) *</label>
                <div
                  onClick={() => mediaInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4 mb-3 text-gray-400 group-hover:text-blue-500 transition-colors">
                    <ImageIcon size={32} />
                    <span className="text-gray-300">|</span>
                    <Video size={32} />
                  </div>
                  {mediaFile ? (
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{mediaFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">MP4, JPG, PNG (Max 50MB)</p>
                    </>
                  )}
                  <input
                    ref={mediaInputRef}
                    type="file"
                    className="hidden"
                    accept="video/*,image/*"
                    onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>

              {/* Tag Products */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                  <span>Tag Products (Optional)</span>
                  <span className="text-xs font-normal text-gray-500">{selectedProducts.length} selected</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700">
                  {myProducts.length === 0 && (
                    <p className="text-sm text-gray-500 col-span-full">You have no products to tag yet.</p>
                  )}
                  {myProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => toggleProductSelection(product.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedProducts.includes(product.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-gray-300 dark:hover:border-zinc-700'}`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                        <img src={product.image_url?.[0] || '/placeholder.svg'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.product_name}</p>
                        <p className="text-xs font-bold text-blue-600 mt-0.5">₦{product.price}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selectedProducts.includes(product.id) ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-zinc-600'}`}>
                        {selectedProducts.includes(product.id) && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={myKauches.length === 0 || postSubmitting}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all"
                >
                  {postSubmitting ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MANAGE KAUCHES TAB */}
        {activeTab === 'kauches' && (
          <div className="space-y-6">

            {/* Create Kauch Button / Form */}
            {!showCreateKauch ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">Create a New Kauch</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">You can create up to 2 Kauches to segment your communities.</p>
                </div>
                <button
                  onClick={() => setShowCreateKauch(true)}
                  disabled={myKauches.length >= 2}
                  className="shrink-0 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-sm transition-all"
                >
                  <Plus size={20} /> New Kauch
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 sm:p-8 animate-fadeIn relative">
                <button onClick={() => setShowCreateKauch(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                  <X size={24} />
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create New Kauch</h2>
                <form onSubmit={handleCreateKauch} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kauch Name *</label>
                    <input
                      type="text"
                      value={newKauchName}
                      onChange={(e) => setNewKauchName(e.target.value)}
                      placeholder="e.g. Sneakerheads Hub"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                    <textarea
                      value={newKauchDesc}
                      onChange={(e) => setNewKauchDesc(e.target.value)}
                      placeholder="What is this community about?"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar (Optional)</label>
                    <input
                      type="file"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={kauchSubmitting}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-md transition-all"
                    >
                      {kauchSubmitting ? 'Creating...' : 'Create Kauch'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List Kauches */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center justify-between">
                <span>My Kauches</span>
                <span className="text-sm font-medium px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full">{myKauches.length} / 2</span>
              </h3>

              <div className="space-y-4">
                {myKauches.length === 0 && (
                  <p className="text-sm text-gray-500">You haven't created any Kauches yet.</p>
                )}
                {myKauches.map(kauch => (
                  <div key={kauch.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600 transition-colors bg-gray-50/50 dark:bg-zinc-950/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-bold text-gray-500">
                        {kauch.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{kauch.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{(kauch.followers_count ?? 0).toLocaleString()} followers</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/kauch/${kauch.id}`)}
                      className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
