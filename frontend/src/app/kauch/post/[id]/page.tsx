import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

interface SharedPost {
  id: number;
  description: string;
  media_type: 'image' | 'video';
  media_url: string | null;
  media_urls?: string[];
  kauch?: { id: number; name: string; avatar_url?: string | null };
  likes_count: number;
  comments_count: number;
}

async function getPost(id: string): Promise<SharedPost | null> {
  try {
    // No-store: link previews and visitors should see current data.
    const res = await fetch(`${API}/kauch/posts/${id}/`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Cloudinary can render a poster frame for a video by swapping the extension to
// .jpg and seeking to the first second (so_1). Images are used as-is.
function thumbnailFor(post: SharedPost): string | undefined {
  const first = (post.media_urls && post.media_urls[0]) || post.media_url || undefined;
  if (!first) return undefined;
  if (post.media_type !== 'video') return first;
  return first
    .replace('/video/upload/', '/video/upload/so_1/')
    .replace(/\.(mp4|mov|webm|m3u8)(\?.*)?$/i, '.jpg');
}

// Runs on the server at request time — this is what produces the <meta og:*>
// tags a link-preview crawler reads to build its card.
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const post = await getPost(params.id);
  if (!post) {
    return { title: 'Post not found · Kauchy' };
  }

  const kauchName = post.kauch?.name || 'Kauchy';
  const title = `${kauchName} on Kauchy`;
  const description = post.description?.trim() || `See this post from ${kauchName} on Kauchy.`;
  const image = thumbnailFor(post);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharedPostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  if (!post) notFound();

  const images = (post.media_urls && post.media_urls.length > 0)
    ? post.media_urls
    : (post.media_url ? [post.media_url] : []);
  const kauchName = post.kauch?.name || 'Kauch';

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Kauch header */}
        <Link
          href={post.kauch ? `/kauch/${post.kauch.id}` : '/'}
          className="flex items-center gap-3 mb-4"
        >
          <span className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
            {post.kauch?.avatar_url
              ? <img src={post.kauch.avatar_url} alt={kauchName} className="w-full h-full object-cover" />
              : <span className="font-bold text-gray-300">{kauchName.charAt(0).toUpperCase()}</span>}
          </span>
          <span className="font-bold">{kauchName}</span>
        </Link>

        {/* Media */}
        <div className="rounded-2xl overflow-hidden bg-zinc-900 mb-4">
          {post.media_type === 'video' && images[0] ? (
            <video src={images[0]} className="w-full aspect-square object-cover" controls playsInline />
          ) : images.length > 0 ? (
            // CSS scroll-snap strip — multiple images swipe horizontally with no JS,
            // which keeps this page a pure server component.
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {images.map((src, i) => (
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt={`Image ${i + 1}`}
                  className="w-full shrink-0 snap-center aspect-square object-cover"
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Caption + counts */}
        {post.description && (
          <p className="text-sm text-gray-200 leading-relaxed mb-3">{post.description}</p>
        )}
        <p className="text-xs text-gray-500 mb-6">
          {post.likes_count} likes · {post.comments_count} comments
        </p>

        {/* CTAs into the app */}
        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 text-center py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition-colors"
          >
            Open Kauchy
          </Link>
          {post.kauch && (
            <Link
              href={`/kauch/${post.kauch.id}`}
              className="flex-1 text-center py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-colors"
            >
              View {kauchName}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
