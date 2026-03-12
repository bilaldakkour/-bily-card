import Link from 'next/link'
import { Truck, Shield, HeadphonesIcon, Clock, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Why Choose Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Truck className="h-5 w-5 text-green-400" />
                <span className="text-slate-300">Fast Delivery</span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-blue-400" />
                <span className="text-slate-300">100% Secure</span>
              </div>
              <div className="flex items-center space-x-3">
                <HeadphonesIcon className="h-5 w-5 text-purple-400" />
                <span className="text-slate-300">24/7 Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-yellow-400" />
                <span className="text-slate-300">Easy Refunds</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/products" className="block text-slate-300 hover:text-white transition-colors">
                All Products
              </Link>
              <Link href="/categories/pubg" className="block text-slate-300 hover:text-white transition-colors">
                PUBG UC
              </Link>
              <Link href="/categories/freefire" className="block text-slate-300 hover:text-white transition-colors">
                Free Fire Diamonds
              </Link>
              <Link href="/categories/steam" className="block text-slate-300 hover:text-white transition-colors">
                Steam Wallet
              </Link>
              <Link href="/contact" className="block text-slate-300 hover:text-white transition-colors">
                Contact Us
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Support</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href="mailto:support@bilycard.com" className="text-slate-300 hover:text-white transition-colors">
                  support@bilycard.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-slate-400" />
                <a href="tel:+96171985887" className="text-slate-300 hover:text-white transition-colors">
                  +961 71 985 887
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-slate-400" />
                <a
                  href="https://wa.me/96171985887"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  WhatsApp Support
                </a>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Stay Updated</h3>
            <p className="text-slate-400 text-sm">
              Get notified about new products and special offers.
            </p>
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <button className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white hover:from-blue-700 hover:to-purple-700 transition-all">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold text-white">Bily Card</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2024 Bily Card. All rights reserved. | Gaming top-ups made easy.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}