"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';


interface KpiData { }
export default function AnalyticsPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [stats, setStats] = useState<any>({
        total_sales_quantity: 0,
        total_revenue: 0,
        total_views: 0,
        rating: 0,
        active_products_count: 0
    });
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Canvas refs for charts
    const salesChartRef = useRef<HTMLCanvasElement>(null);
    const categoryChartRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (user) {
            if (user.user.role !== 'vendor') {
                showToast("Only vendors can access analytics", "error");
                router.push('/');
                return;
            }
            loadAnalytics();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Re-draw charts when stats change
    useEffect(() => {
        if (!loading) drawCharts();
    }, [loading, stats]);

    const loadAnalytics = async () => {
        try {
            const res = await fetch('https://kachy-production.up.railway.app/analytics/overview/', {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data || {});
                console.log(data)
            }

            // Top Products
            const resTop = await fetch('https://kachy-production.up.railway.app/analytics/top-products-vendor/', {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            if (resTop.ok) {
                setTopProducts(await resTop.json());
            }

            // Mock Recent Orders (legacy behavior)
            const mockOrders = [];
            for (let i = 0; i < 5; i++) {
                mockOrders.push({
                    id: `ORD-${1001 + i}`,
                    customerName: `Customer ${i + 1}`,
                    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
                    amount: (Math.random() * 5000 + 1000).toFixed(2),
                    status: ["Completed", "Pending", "Processing"][Math.floor(Math.random() * 3)],
                });
            }

            // const mockOrders = fetch('')
            setRecentOrders(mockOrders);

        } catch (e) {
            console.error(e);
            showToast("Failed to load analytics data", "error");
        } finally {
            setLoading(false);
        }
    };

    const drawCharts = () => {
        if (salesChartRef.current) {
            const ctx = salesChartRef.current.getContext("2d");
            if (!ctx) return;
            // Simple bar chart logic matching legacy
            const data = [12, 19, 3, 5, 2];
            const labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
            const w = salesChartRef.current.width;
            const h = salesChartRef.current.height;
            const barW = (w - 40) / data.length;
            const maxVal = Math.max(...data);

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#f4f6fa'; // bg
            ctx.fillRect(0, 0, w, h);

            data.forEach((val, i) => {
                const barH = (val / maxVal) * (h * 0.7);
                ctx.fillStyle = '#1c6ef2';
                ctx.fillRect(20 + i * barW + 10, h - barH - 20, barW - 20, barH);

                // Label
                ctx.fillStyle = '#666';
                ctx.font = '12px Sans';
                ctx.fillText(labels[i], 20 + i * barW + 15, h - 5);
            });
        }

        if (categoryChartRef.current) {
            const ctx = categoryChartRef.current.getContext("2d");
            if (!ctx) return;
            // Simple Pie Chart
            const data = [300, 50, 100];
            const colors = ["#1c6ef2", "#28a745", "#ffc107"];

            const total = data.reduce((a, b) => a + b, 0);
            let startAngle = 0;
            const w = categoryChartRef.current.width;
            const h = categoryChartRef.current.height;
            const cx = w / 2;
            const cy = h / 2;
            const r = Math.min(cx, cy) - 20;

            data.forEach((val, i) => {
                const sliceAngle = (val / total) * 2 * Math.PI;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
                ctx.fillStyle = colors[i];
                ctx.fill();
                startAngle += sliceAngle;
            });
        }
    };

    if (!user) return null; // or loading spinner

    return (
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Analytics Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                    <h3 className="text-gray-500 font-medium">Total Revenue</h3>
                    <p className="text-3xl font-bold text-blue-600">${stats.total_revenue}</p>
                    <span className="text-green-500 text-sm">↑ 12% from last month</span>
                </div>
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                    <h3 className="text-gray-500 font-medium">Items Sold</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats.total_sales_quantity}</p>
                    <span className="text-green-500 text-sm">↑ 5% from last month</span>
                </div>
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                    <h3 className="text-gray-500 font-medium">Profile Views</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats.total_views}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                    <h3 className="text-gray-500 font-medium">Rating</h3>
                    <p className="text-3xl font-bold text-yellow-500">★ {stats.rating ? parseFloat(stats.rating).toFixed(1) : "N/A"}</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4 text-gray-700">Sales Overview</h3>
                    <div className="flex justify-center">
                        <canvas ref={salesChartRef} width={400} height={250} className="w-full h-auto"></canvas>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4 text-gray-700">Category Dist.</h3>
                    <div className="flex justify-center">
                        <canvas ref={categoryChartRef} width={400} height={250} className="w-full h-auto"></canvas>
                    </div>
                </div>
            </div>

            {/* Lists Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4 text-gray-700">Top Products</h3>
                    <div className="overflow-auto max-h-60">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 font-medium text-gray-600">
                                <tr>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Sold</th>
                                    <th className="p-2 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((p: any, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-2 truncate max-w-[150px]">{p.name || p.product_name}</td>
                                        <td className="p-2">{p.total_sold}</td>
                                        <td className="p-2 text-right">${p.total_revenue}</td>
                                    </tr>
                                ))}
                                {topProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-4 text-center text-gray-500">No data found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4 text-gray-700">Recent Orders</h3>
                    <div className="overflow-auto max-h-60">
                        {recentOrders.map((order, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                                <div>
                                    <p className="font-medium text-gray-800">{order.customerName}</p>
                                    <p className="text-xs text-gray-500">{order.date} • {order.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800">${order.amount}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                        order.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>{order.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
