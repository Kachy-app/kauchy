"use client";
export default function Footer(): JSX.Element {
    return (
        <footer className="bg-white dark:bg-zinc-900 pt-10 md:pt-16 pb-6 border-t border-gray-200 dark:border-zinc-800 mt-10 md:mt-20">
            <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-10 px-5 mb-10">
                <div className="flex flex-col gap-3 md:gap-4">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">About</h4>
                    <a href="#about" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">About Upstart</a>
                    <a href="#careers" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Careers</a>
                    <a href="#blog" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Blog</a>
                </div>
                <div className="flex flex-col gap-3 md:gap-4">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Support</h4>
                    <a href="#contact" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Contact Us</a>
                    <a href="#faq" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">FAQ</a>
                    <a href="#help" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Help Center</a>
                </div>
                <div className="flex flex-col gap-3 md:gap-4">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Legal</h4>
                    <a href="#terms" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Terms of Service</a>
                    <a href="#privacy" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Privacy Policy</a>
                    <a href="#cookies" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Cookies</a>
                </div>
                <div className="flex flex-col gap-3 md:gap-4">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Follow Us</h4>
                    <a href="#facebook" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Facebook</a>
                    <a href="#twitter" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Twitter</a>
                    <a href="#instagram" className="text-sm text-gray-600 dark:text-gray-400 no-underline transition-colors duration-200 hover:text-blue-600">Instagram</a>
                </div>
            </div>
            <div className="max-w-[1400px] mx-auto pt-6 border-t border-gray-200 dark:border-zinc-800 text-center text-sm text-gray-600 dark:text-gray-400 px-5">
                <p>&copy; 2025 Upstart Marketplace. All rights reserved.</p>
            </div>
        </footer>
    );
}
