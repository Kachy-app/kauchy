/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
                poppins: ['var(--font-poppins)', 'sans-serif'],
            },
            boxShadow: {
                'legacy-card': '0 2px 8px rgba(0, 0, 0, 0.08)',
                'legacy-hover': '0 12px 24px rgba(0, 0, 0, 0.12)',
                'legacy-nav': '0 2px 8px rgba(0, 0, 0, 0.08)',
                'legacy-modal': '0 20px 60px rgba(0, 0, 0, 0.3)',
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideInUp: {
                    "0%": { opacity: "0", transform: "translateY(40px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                scanLine: {
                    "0%": { top: "0%" },
                    "50%": { top: "100%" },
                    "100%": { top: "0%" },
                },
                cornerPulse: {
                    "0%, 100%": { opacity: "0.7" },
                    "50%": { opacity: "1" },
                },
                scannerFadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                scanSuccess: {
                    "0%": { transform: "scale(1)", opacity: "0" },
                    "50%": { transform: "scale(1.05)", opacity: "1" },
                    "100%": { transform: "scale(1)", opacity: "0" },
                },
                viewfinderIn: {
                    "0%": { transform: "scale(1.2)", opacity: "0" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
            },
            animation: {
                fadeIn: "fadeIn 0.35s ease-out forwards",
                slideInUp: "slideInUp 0.3s ease",
                scanLine: "scanLine 3s ease-in-out infinite",
                cornerPulse: "cornerPulse 2s ease-in-out infinite",
                scannerFadeIn: "scannerFadeIn 0.3s ease-out forwards",
                scanSuccess: "scanSuccess 0.6s ease-out forwards",
                viewfinderIn: "viewfinderIn 0.4s ease-out forwards",
            },
        },
    },
    plugins: [],
};
