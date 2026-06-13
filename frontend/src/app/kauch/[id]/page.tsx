"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAuthGate } from '@/context/AuthGateContext';
import { Heart, MessageCircle, Share2, MoreHorizontal, ShoppingBag, ArrowLeft, Users, Send } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

interface Comment {
  id: number;
  user: { id: number; username: string; avatar_url: string };
  text: string;
  created_at: string;
}

interface TaggedProduct {
  id: number;
  product_name: string;
  price: string;
  image_url: string[];
}

interface Post {
  id: number;
  description: string;
  media_type: 'image' | 'video';
  media_url: string;
  media_urls?: string[];
  tagged_products: TaggedProduct[];
  likes_count: number;
  comments_count: number;
  is_liked_by_user: boolean;
  created_at: string;
}

interface Kauch {
  id: number;
  name: string;
  description: string;
  avatar_url: string | null;
  followers_count: number;
  is_following: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL;

function timeAgo(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function KauchProfile() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { requireAuth } = useAuthGate();
  const kauchId = params?.id as string;

  const [kauch, setKauch] = useState<Kauch | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Comments: which post is expanded, and per-post data
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<number, Comment[]>>({});
  const [commentLoading, setCommentLoading] = useState<number | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<number | null>(null);

  useEffect(() => {
    if (!kauchId) return;

    const headers: Record<string, string> = {};
    if (user) headers['Authorization'] = `Bearer ${user.access}`;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [kRes, pRes] = await Promise.all([
          fetch(`${API}/kauch/${kauchId}/`, { headers }),
          fetch(`${API}/kauch/${kauchId}/posts/`, { headers }),
        ]);
        if (kRes.ok) setKauch(await kRes.json());
        if (pRes.ok) {
          const data = await pRes.json();
          setPosts(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load kauch', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [kauchId, user]);

  const handleFollowToggle = async () => {
    if (!requireAuth('follow this store')) return;
    if (!kauch) return;

    // optimistic update
    setKauch(prev => prev && ({
      ...prev,
      is_following: !prev.is_following,
      followers_count: prev.is_following ? prev.followers_count - 1 : prev.followers_count + 1,
    }));

    try {
      const res = await fetch(`${API}/kauch/${kauch.id}/follow/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.access}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKauch(prev => prev && ({
          ...prev,
          is_following: data.is_following,
          followers_count: data.followers_count,
        }));
      } else {
        throw new Error('failed');
      }
    } catch (e) {
      // revert on failure
      setKauch(prev => prev && ({
        ...prev,
        is_following: !prev.is_following,
        followers_count: prev.is_following ? prev.followers_count - 1 : prev.followers_count + 1,
      }));
      showToast('Could not update follow status.', 'error');
    }
  };

  const handleLike = async (id: number) => {
    if (!requireAuth('like posts')) return;

    // optimistic update
    setPosts(prev => prev.map(post =>
      post.id === id
        ? {
            ...post,
            is_liked_by_user: !post.is_liked_by_user,
            likes_count: post.is_liked_by_user ? post.likes_count - 1 : post.likes_count + 1,
          }
        : post
    ));

    try {
      const res = await fetch(`${API}/kauch/posts/${id}/like/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.access}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(post =>
          post.id === id
            ? { ...post, is_liked_by_user: data.liked, likes_count: data.likes_count }
            : post
        ));
      } else {
        throw new Error('failed');
      }
    } catch (e) {
      // revert on failure
      setPosts(prev => prev.map(post =>
        post.id === id
          ? {
              ...post,
              is_liked_by_user: !post.is_liked_by_user,
              likes_count: post.is_liked_by_user ? post.likes_count - 1 : post.likes_count + 1,
            }
          : post
      ));
      showToast('Could not update like.', 'error');
    }
  };

  const fetchComments = async (postId: number) => {
    setCommentLoading(postId);
    try {
      const res = await fetch(`${API}/kauch/posts/${postId}/comments/`);
      if (res.ok) {
        const data = await res.json();
        setCommentsMap(prev => ({ ...prev, [postId]: Array.isArray(data) ? data : [] }));
      }
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setCommentLoading(null);
    }
  };

  const toggleComments = (postId: number) => {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    if (commentsMap[postId] === undefined) fetchComments(postId);
  };

  const submitComment = async (postId: number) => {
    if (!requireAuth('comment')) return;
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;

    setCommentSubmitting(postId);
    try {
      const res = await fetch(`${API}/kauch/posts/${postId}/comments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access}`,
        },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const created: Comment = await res.json();
        setCommentsMap(prev => ({ ...prev, [postId]: [created, ...(prev[postId] || [])] }));
        setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        ));
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to post comment.', 'error');
      }
    } catch (e) {
      showToast('Error posting comment.', 'error');
    } finally {
      setCommentSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#f4f6fa] dark:bg-zinc-950 min-h-[calc(100vh-70px)] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!kauch) {
    return (
      <div className="bg-[#f4f6fa] dark:bg-zinc-950 min-h-[calc(100vh-70px)] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600 dark:text-gray-400">Kauch not found.</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">Go back</button>
      </div>
    );
  }

  // Shared profile card — stacks on top on mobile, lives in the sidebar on desktop.
  const profileCard = (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-8 sm:p-10">
      <div className="flex flex-col items-center text-center gap-5">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-800 ring-4 ring-gray-100 dark:ring-zinc-800 shrink-0">
          <img src={kauch.avatar_url || '/placeholder.svg'} alt={kauch.name} className="w-full h-full object-cover" />
        </div>
        <div className="w-full">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">{kauch.name}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed max-w-md mx-auto">
            {kauch.description?.trim() || 'Discover our latest drops and shop the products tagged in every post.'}
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
              <Users size={18} className="text-blue-600" />
              <span>{kauch.followers_count.toLocaleString()} <span className="text-gray-500 dark:text-gray-400 font-normal">Followers</span></span>
            </div>

            <button
              onClick={handleFollowToggle}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
                kauch.is_following
                  ? 'bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-zinc-700'
                  : 'bg-amber-400 text-white hover:bg-amber-500 shadow-md'
              }`}
            >
              {kauch.is_following ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#f4f6fa] dark:bg-zinc-950 min-h-[calc(100vh-70px)] pb-20">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-[#f4f6fa]/85 dark:bg-zinc-950/85 backdrop-blur border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft size={22} className="text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{kauch.name}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">

          {/* Main column — posts feed */}
          <div className="min-w-0">
            {/* Profile card stacks here on mobile; moves to the sidebar on desktop */}
            <div className="lg:hidden mb-6">{profileCard}</div>

            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 px-1 border-b border-gray-200 dark:border-zinc-800 pb-2">Posts</h3>

        {posts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm px-2">No posts yet.</p>
        ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors hover:border-gray-300 dark:hover:border-zinc-700">

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{timeAgo(post.created_at)}</span>
                  <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-all">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <p className="text-gray-800 dark:text-gray-100 text-sm leading-relaxed mb-4">{post.description}</p>
              </div>

              {/* Media Container — one video, one image, or a swipeable image carousel */}
              {(() => {
                const images = (post.media_urls && post.media_urls.length > 0)
                  ? post.media_urls
                  : (post.media_url ? [post.media_url] : []);
                if (images.length === 0) return null;

                return (
                  <div className="w-full aspect-square sm:aspect-[4/5] bg-gray-100 dark:bg-zinc-800 relative overflow-hidden">
                    {post.media_type === 'video' ? (
                      <video src={images[0]} className="w-full h-full object-cover" controls />
                    ) : images.length === 1 ? (
                      <img src={images[0]} alt="Post media" className="w-full h-full object-cover" />
                    ) : (
                      <Swiper
                        modules={[Pagination]}
                        slidesPerView={1}
                        pagination={{ clickable: true }}
                        className="w-full h-full kauch-post-carousel"
                      >
                        {images.map((src, i) => (
                          <SwiperSlide key={`${src}-${i}`}>
                            <img src={src} alt={`Post media ${i + 1}`} className="w-full h-full object-cover" />
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    )}
                  </div>
                );
              })()}

              {/* Actions Bar */}
              <div className="px-4 py-4 flex items-center gap-6 border-b border-gray-50 dark:border-zinc-800">
                <button onClick={() => handleLike(post.id)} className="flex items-center gap-2 group">
                  <Heart size={26} className={`transition-all ${post.is_liked_by_user ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900'}`} />
                  <span className={`font-medium ${post.is_liked_by_user ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>{post.likes_count}</span>
                </button>
                <button onClick={() => toggleComments(post.id)} className={`flex items-center gap-2 group transition-colors ${openComments === post.id ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}>
                  <MessageCircle size={26} className="transition-transform group-hover:scale-110" />
                  <span className="font-medium">{post.comments_count}</span>
                </button>
                <button className="flex items-center gap-2 group text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors">
                  <Share2 size={24} className="transition-transform group-hover:scale-110" />
                </button>
              </div>

              {/* Comments Panel */}
              {openComments === post.id && (
                <div className="px-4 py-4 border-b border-gray-50 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40">
                  {/* Composer */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={commentDrafts[post.id] || ''}
                      onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitComment(post.id); }}
                      placeholder={user ? 'Add a comment...' : 'Log in to comment'}
                      disabled={!user}
                      className="flex-1 border border-gray-300 dark:border-zinc-700 rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 bg-white dark:bg-zinc-800 placeholder-gray-400 dark:placeholder-gray-500 disabled:bg-gray-100 dark:disabled:bg-zinc-900"
                    />
                    <button
                      onClick={() => submitComment(post.id)}
                      disabled={!user || commentSubmitting === post.id || !(commentDrafts[post.id] || '').trim()}
                      className="p-2.5 bg-blue-600 text-white rounded-full disabled:opacity-50 flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      {commentSubmitting === post.id
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send size={18} />}
                    </button>
                  </div>

                  {/* List */}
                  {commentLoading === post.id ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">Loading comments...</p>
                  ) : (commentsMap[post.id]?.length ?? 0) === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2 italic">No comments yet. Be the first!</p>
                  ) : (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {commentsMap[post.id].map(comment => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 shrink-0">
                            <img src={comment.user?.avatar_url || '/placeholder.svg'} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl px-3 py-2 border border-gray-100 dark:border-zinc-800">
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{comment.user?.username || 'User'}</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{comment.text}</p>
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-1">{timeAgo(comment.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tagged Products Carousel */}
              {post.tagged_products.length > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                    <ShoppingBag size={16} className="text-blue-600" />
                    Tagged Products
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                    {post.tagged_products.map(product => (
                      <div
                        key={product.id}
                        onClick={() => router.push(`/feed?type=product&id=${product.id}`)}
                        className="min-w-[140px] max-w-[140px] bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden cursor-pointer snap-start hover:border-blue-500 transition-all shadow-sm group"
                      >
                        <div className="h-[120px] bg-gray-100 dark:bg-zinc-800 relative">
                          <img src={product.image_url?.[0] || '/placeholder.svg'} alt={product.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate" title={product.product_name}>{product.product_name}</p>
                          <p className="text-sm font-bold text-blue-600 mt-0.5">₦{product.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
        )}
          </div>{/* /main column */}

          {/* Sidebar — desktop only, sticky beneath the top bar */}
          <aside className="hidden lg:block lg:sticky lg:top-[76px]">
            {profileCard}
          </aside>

        </div>{/* /grid */}
      </div>{/* /container */}
    </div>
  );
}
