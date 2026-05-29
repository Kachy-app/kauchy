"use client";
import React, { useEffect, useRef, useState } from 'react';
import { X, Heart, MessageCircle, Send } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Comment {
    id: number;
    user: number;
    user_email: string;
    comment: string;
    created_at: string;
    updated_at: string;
}

interface VideoModalProps {
    video: string;
    caption: string;
    contentId: number;
    likes?: number;
    views?: number;
    isLikedByUser?: boolean;
    reviewsCount?: number;
    onClose: () => void;
}

function timeAgo(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

export default function VideoModal({ video, caption, contentId, likes = 0, views = 0, isLikedByUser = false, reviewsCount = 0, onClose }: VideoModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { user } = useAuth();
    const { showToast } = useToast();

    // Like state
    const [liked, setLiked] = useState(isLikedByUser);
    const [likesCount, setLikesCount] = useState(likes);
    const [likeLoading, setLikeLoading] = useState(false);
    const [viewsCount, setViewsCount] = useState(views);

    // Comments state
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [totalComments, setTotalComments] = useState(reviewsCount);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    const commentsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Lock scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
            // Cleanup video
            if (videoRef.current) {
                videoRef.current.pause();
            }
        };
    }, []);

    useEffect(() => {
        if (contentId) {
            fetchComments();
            incrementView();
        }
    }, [contentId]);

    async function incrementView() {
        if (!contentId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${contentId}/view/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (typeof data.views === 'number') {
                    setViewsCount(data.views);
                }
            }
        } catch (e) {
            console.error('Error incrementing view count:', e);
        }
    }

    async function fetchComments() {
        if (!contentId) return;
        setLoadingComments(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${contentId}/reviews/`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.reviews || []);
                setTotalComments(data.total_reviews || 0);
            }
        } catch (e) {
            console.error('Error fetching comments:', e);
        } finally {
            setLoadingComments(false);
        }
    }

    async function handleLikeToggle() {
        if (!user) {
            showToast('Please login to like content', 'error');
            return;
        }
        if (likeLoading || !contentId) return;
        setLikeLoading(true);

        try {
            const method = liked ? 'DELETE' : 'POST';
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${contentId}/like/`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                if (liked) {
                    // Unliked
                    setLiked(false);
                    setLikesCount(data.content_likes_count ?? likesCount - 1);
                } else {
                    // Liked
                    setLiked(true);
                    setLikesCount(data.content_likes_count ?? likesCount + 1);
                }
            } else {
                const errData = await res.json();
                showToast(errData.error || 'Failed to update like', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        } finally {
            setLikeLoading(false);
        }
    }

    async function handleSubmitComment(e: React.FormEvent) {
        e.preventDefault();
        if (!user) {
            showToast('Please login to comment', 'error');
            return;
        }
        if (commentText.trim().length < 3) {
            showToast('Comment must be at least 3 characters', 'error');
            return;
        }
        if (submittingComment || !contentId) return;
        setSubmittingComment(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customers/content/${contentId}/review/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access}`,
                },
                body: JSON.stringify({ comment: commentText }),
            });
            if (res.ok) {
                const data = await res.json();
                setComments(prev => [...prev, data]);
                setTotalComments(prev => prev + 1);
                setCommentText('');
                // Scroll to bottom of comments
                setTimeout(() => {
                    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                const errData = await res.json();
                showToast(errData.error || 'Failed to post comment', 'error');
            }
        } catch (e) {
            showToast('Network error', 'error');
        } finally {
            setSubmittingComment(false);
        }
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const currentPath = usePathname();

    const commentForm = (
        <div className="mt-auto flex flex-col gap-3 flex-shrink-0 pt-3 border-t border-gray-100">
            <div className="flex gap-4">
                <button
                    className={`flex items-center gap-2 px-4 py-2 border rounded-full cursor-pointer text-sm transition-all justify-center ${liked
                            ? 'bg-red-50 border-red-300 text-red-500'
                            : 'border-[#eee] bg-white text-[#444] hover:bg-gray-50 hover:border-red-200 hover:text-red-500'
                        } ${likeLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={handleLikeToggle}
                >
                    <Heart size={20} fill={liked ? 'currentColor' : 'none'} className={`transition-transform duration-300 ${liked ? 'scale-110' : ''}`} />
                    <span className="font-semibold">{likesCount}</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-[#eee] rounded-full bg-white cursor-pointer text-sm text-[#444] transition-all justify-center hover:bg-gray-50 hover:border-blue-200 hover:text-blue-500">
                    <MessageCircle size={20} />
                    <span className="font-semibold">{totalComments}</span>
                </button>
            </div>
            {user ? (
                <form className="flex gap-2" onSubmit={handleSubmitComment}>
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                    />
                    <button
                        type="submit"
                        disabled={submittingComment || commentText.trim().length < 3}
                        className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                        {submittingComment ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <Send size={14} />
                        )}
                        Post
                    </button>
                </form>
            ) : (
                <p className="text-center text-sm text-gray-500">
                    <a href="/login" className="text-blue-600 font-medium hover:underline">Log in</a> to comment
                </p>
            )}
        </div>

    );


    return (
        <div className="fixed inset-0 bg-black/85 z-[1000] flex items-center justify-center animate-fadeIn" onClick={handleBackdropClick}>
            <div className="flex w-[95%] md:w-[90%] max-w-[1000px] h-[90vh] md:h-[85vh] bg-black rounded-xl overflow-hidden relative shadow-2xl flex-col md:flex-row">
                <button className="absolute top-2.5 right-2.5 md:top-4 md:right-4 z-10 bg-black/50 text-white border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition-all hover:bg-white/20" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="w-full md:flex-1 bg-black flex items-center justify-center h-[50%] md:h-full flex-shrink-0">
                    <video
                        ref={videoRef}
                        className="max-w-full max-h-full object-contain"
                        controls
                        autoPlay
                        playsInline
                        src={video}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                <div className="w-full flex-1 md:w-[350px] bg-white p-4 md:p-6 flex flex-col border-l border-[#333] overflow-hidden">
                    <div className="video-header mb-4 flex-shrink-0">
                        <h3 className="text-lg font-semibold text-[#333]">{caption || 'Untitled Video'}</h3>
                    </div>

                    <div className="bg-[#f4f6fa] p-3 rounded-lg flex-shrink-0 mb-4">
                        <div className="flex justify-between mb-1.5 text-sm text-[#555]">
                            <span>Views</span>
                            <span className="font-medium">{viewsCount}</span>
                        </div>
                        <div className="flex justify-between text-sm text-[#555]">
                            <span>Likes</span>
                            <span className="font-medium">{likesCount}</span>
                        </div>
                    </div>

                    {/* Comments Area (Scrollable) */}
                    <div className="flex-1 overflow-y-auto mb-4 min-h-[80px] pr-2 custom-scrollbar">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Comments ({totalComments})</h4>
                        <div className="flex flex-col gap-4">
                            {loadingComments ? (
                                <div className="flex flex-col gap-3 animate-pulse">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"></div>
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : comments.length === 0 ? (
                                <p className="text-sm text-center text-gray-500 italic mt-4">No comments yet. Be the first to comment!</p>
                            ) : (
                                comments.map(c => (
                                    <div key={c.id} className="flex gap-2 group">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {(c.user_email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-900">{c.user_email?.split('@')[0] || 'User'}</span>
                                                <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
                                            </div>
                                            <span className="text-sm text-gray-700 leading-relaxed">{c.comment}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={commentsEndRef} />
                        </div>
                    </div>

                    {/* Action Buttons & Input */}
                    {currentPath !== "/inventory" && commentForm}

                </div>
            </div>
        </div>
    );
}
