"use client";
import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Search, ArrowLeft, X, Users, Store as StoreIcon, Clock } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

const API = process.env.NEXT_PUBLIC_API_URL;
const TABS = ['Top', 'Products', 'Kauch', 'Vendors'] as const;
type Tab = typeof TABS[number];

interface Vendor { id: number; username: string; bio?: string; followers_count?: number; profile_picture?: string | null; total_products?: number; }
interface Kauch { id: number; name: string; description?: string; avatar_url?: string | null; followers_count?: number; }

function SearchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [tab, setTab] = useState<Tab>('Top');
    const [loading, setLoading] = useState(false);

    const [products, setProducts] = useState<any[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [kauches, setKauches] = useState<Kauch[]>([]);
    const [recent, setRecent] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const runSearch = useCallback(async (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) {
            setProducts([]); setVendors([]); setKauches([]);
            return;
        }
        setLoading(true);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (user?.access) headers['Authorization'] = `Bearer ${user.access}`;

        // Products + Vendors come from the suggestions endpoint.
        const suggestions = fetch(`${API}/usersearch/suggestions/?q=${encodeURIComponent(trimmed)}`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
                setProducts(d?.suggested_products || []);
                setVendors(d?.suggested_vendors || []);
                if (Array.isArray(d?.recent_searches)) {
                    setRecent(d.recent_searches.map((s: any) => s.query).filter(Boolean));
                }
            })
            .catch(() => { setProducts([]); setVendors([]); });

        // Kauch search (endpoint pending — degrade gracefully on failure).
        const kauchSearch = fetch(`${API}/kauch/search/?q=${encodeURIComponent(trimmed)}`, { headers })
            .then(r => (r.ok ? r.json() : []))
            .then(d => setKauches(Array.isArray(d) ? d : []))
            .catch(() => setKauches([]));

        await Promise.all([suggestions, kauchSearch]);
        setLoading(false);
    }, [user]);

    // Debounced live search as the user types.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(query), 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, runSearch]);

    const hasQuery = query.trim().length > 0;
    const counts = { Products: products.length, Kauch: kauches.length, Vendors: vendors.length };

    const goProduct = (p: any) => router.push(`/feed?type=product&id=${p.id || p._id}`);
    const goVendor = (v: Vendor) => router.push(`/vendor-profile?vendorId=${v.id}`);
    const goKauch = (k: Kauch) => router.push(`/kauch/${k.id}`);

    const VendorRow = ({ v }: { v: Vendor }) => (
        <button onClick={() => goVendor(v)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 shrink-0 flex items-center justify-center">
                {v.profile_picture ? <img src={v.profile_picture} alt={v.username} className="w-full h-full object-cover" /> : <StoreIcon size={20} className="text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{v.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{(v.followers_count ?? 0).toLocaleString()} followers · {v.total_products ?? 0} products</p>
            </div>
        </button>
    );

    const KauchRow = ({ k }: { k: Kauch }) => (
        <button onClick={() => goKauch(k)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 shrink-0 flex items-center justify-center">
                {k.avatar_url ? <img src={k.avatar_url} alt={k.name} className="w-full h-full object-cover" /> : <span className="font-bold text-gray-500">{k.name.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{k.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{(k.followers_count ?? 0).toLocaleString()} followers</p>
            </div>
        </button>
    );

    const ProductsGrid = ({ items }: { items: any[] }) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map(p => <ProductCard key={p.id || p._id} product={p} onClick={() => goProduct(p)} />)}
        </div>
    );

    const Section = ({ title, onSeeAll, children }: { title: string; onSeeAll: () => void; children: React.ReactNode }) => (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
                <button onClick={onSeeAll} className="text-xs font-semibold text-blue-600 hover:underline">See all</button>
            </div>
            {children}
        </div>
    );

    const empty = (label: string) => (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">{label}</p>
    );

    return (
        <div className="min-h-[calc(100vh-135px)] md:min-h-screen bg-white dark:bg-zinc-950">
            {/* Search header */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-gray-100 dark:border-zinc-800">
                <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-2">
                    <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search products, kauches, vendors..."
                            className="w-full h-11 pl-10 pr-9 rounded-full border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                {hasQuery && (
                    <div className="max-w-3xl mx-auto flex px-2">
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="max-w-3xl mx-auto px-3 py-4">
                {/* Empty query → recent searches */}
                {!hasQuery ? (
                    recent.length > 0 ? (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 px-1 flex items-center gap-1.5"><Clock size={15} /> Recent</h3>
                            {recent.map((r, i) => (
                                <button key={i} onClick={() => setQuery(r)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-sm text-gray-700 dark:text-gray-300">
                                    <Search size={16} className="text-gray-400" /> {r}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-sm text-gray-400 py-16">Search for products, kauches and vendors</p>
                    )
                ) : loading ? (
                    <div className="flex justify-center py-16">
                        <span className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* TOP: a mix */}
                        {tab === 'Top' && (
                            (products.length + vendors.length + kauches.length) === 0 ? empty('No results found.') : (
                                <>
                                    {vendors.length > 0 && (
                                        <Section title="Vendors" onSeeAll={() => setTab('Vendors')}>
                                            <div>{vendors.slice(0, 3).map(v => <VendorRow key={v.id} v={v} />)}</div>
                                        </Section>
                                    )}
                                    {kauches.length > 0 && (
                                        <Section title="Kauches" onSeeAll={() => setTab('Kauch')}>
                                            <div>{kauches.slice(0, 3).map(k => <KauchRow key={k.id} k={k} />)}</div>
                                        </Section>
                                    )}
                                    {products.length > 0 && (
                                        <Section title="Products" onSeeAll={() => setTab('Products')}>
                                            <ProductsGrid items={products.slice(0, 6)} />
                                        </Section>
                                    )}
                                </>
                            )
                        )}

                        {tab === 'Products' && (products.length ? <ProductsGrid items={products} /> : empty('No products found.'))}
                        {tab === 'Kauch' && (kauches.length ? <div>{kauches.map(k => <KauchRow key={k.id} k={k} />)}</div> : empty('No kauches found.'))}
                        {tab === 'Vendors' && (vendors.length ? <div>{vendors.map(v => <VendorRow key={v.id} v={v} />)}</div> : empty('No vendors found.'))}
                    </>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><span className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>}>
            <SearchContent />
        </Suspense>
    );
}
