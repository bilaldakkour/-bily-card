'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function CheckoutPage({ params }: { params: { productId: string } }) {
  const router = useRouter();
  const { language, isRTL } = useLanguage();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    playerId: '',
    quantity: 1,
  });

  const copy = {
    ar: {
      loadingProduct: 'جاري تحميل المنتج...',
      productNotFound: 'المنتج غير موجود',
      backToProducts: 'العودة إلى المنتجات',
      shop: 'المتجر',
      wallet: 'المحفظة',
      orders: 'الطلبات',
      logout: 'تسجيل الخروج',
      pricePerUnit: 'سعر الوحدة',
      availability: 'التوفر',
      inStock: 'متوفر',
      outOfStock: 'غير متوفر',
      completeOrder: 'إتمام الطلب',
      orderSuccess: 'تم إنشاء الطلب بنجاح! يتم التحويل...',
      playerIdRequired: 'معرّف اللاعب مطلوب',
      playerIdLabel: 'Player ID / Account Name',
      playerIdPlaceholder: 'أدخل Player ID داخل اللعبة',
      playerIdHint: 'سيتم تسليم الشحن لهذا المعرف',
      quantity: 'الكمية',
      subtotal: 'المجموع الفرعي',
      totalAmount: 'الإجمالي',
      processing: 'جاري المعالجة...',
      buyFor: 'شراء مقابل',
      continueShopping: 'متابعة التسوق',
      noteLabel: 'ملاحظة:',
      noteText: 'سيتم خصم قيمة الشراء من رصيد محفظتك. تأكد من توفر رصيد كافٍ قبل تأكيد الطلب.',
      productNotFoundErr: 'المنتج غير موجود',
      orderCreationFailed: 'فشل إنشاء الطلب',
      loadingPage: 'جاري تحميل المنتج...',
    },
    en: {
      loadingProduct: 'Loading product...',
      productNotFound: 'Product not found',
      backToProducts: 'Back to Products',
      shop: 'Shop',
      wallet: 'Wallet',
      orders: 'Orders',
      logout: 'Logout',
      pricePerUnit: 'Price Per Unit',
      availability: 'Availability',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      completeOrder: 'Complete Your Order',
      orderSuccess: 'Order created successfully! Redirecting...',
      playerIdRequired: 'Player ID is required',
      playerIdLabel: 'Player ID / Account Name',
      playerIdPlaceholder: 'Enter your in-game player ID',
      playerIdHint: 'This is where the gift will be delivered',
      quantity: 'Quantity',
      subtotal: 'Subtotal',
      totalAmount: 'Total Amount',
      processing: 'Processing...',
      buyFor: 'Buy for',
      continueShopping: 'Continue Shopping',
      noteLabel: 'Note:',
      noteText: 'Your purchase will be deducted from your wallet balance. Make sure you have sufficient funds before confirming your order.',
      productNotFoundErr: 'Product not found',
      orderCreationFailed: 'Order creation failed',
      loadingPage: 'Loading product...',
    },
    fr: {
      loadingProduct: 'Chargement du produit...',
      productNotFound: 'Produit introuvable',
      backToProducts: 'Retour aux produits',
      shop: 'Boutique',
      wallet: 'Portefeuille',
      orders: 'Commandes',
      logout: 'Déconnexion',
      pricePerUnit: 'Prix unitaire',
      availability: 'Disponibilité',
      inStock: 'En stock',
      outOfStock: 'Rupture de stock',
      completeOrder: 'Finaliser votre commande',
      orderSuccess: 'Commande créée avec succès ! Redirection...',
      playerIdRequired: 'L’ID joueur est requis',
      playerIdLabel: 'Player ID / Nom du compte',
      playerIdPlaceholder: 'Entrez votre ID joueur',
      playerIdHint: 'La commande sera livrée à cet identifiant',
      quantity: 'Quantité',
      subtotal: 'Sous-total',
      totalAmount: 'Montant total',
      processing: 'Traitement...',
      buyFor: 'Acheter pour',
      continueShopping: 'Continuer les achats',
      noteLabel: 'Remarque :',
      noteText: 'Votre achat sera déduit du solde du portefeuille. Assurez-vous d’avoir un solde suffisant avant de confirmer.',
      productNotFoundErr: 'Produit introuvable',
      orderCreationFailed: 'Échec de création de commande',
      loadingPage: 'Chargement du produit...',
    },
  }[language];

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/customer/login');
      return;
    }
    setToken(storedToken);

    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products?productId=${params.productId}`);
        if (!res.ok) throw new Error(copy.productNotFoundErr);
        const data = await res.json();
        const prod = data.products?.[0];
        if (!prod) throw new Error(copy.productNotFoundErr);
        setProduct(prod);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    void fetchProduct();
  }, [copy.productNotFoundErr, params.productId, router]);

  const totalPrice = product ? product.price * formData.quantity : 0;
  const availableQuantity = Math.max(
    0,
    Number(product?.stockQuantity ?? (product?.status === 'active' ? 1 : 0))
  );
  const inStock = availableQuantity > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerId.trim()) {
      setError(copy.playerIdRequired);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-BilyCard-Language': language,
        },
        body: JSON.stringify({
          productId: params.productId,
          playerId: formData.playerId,
          quantity: formData.quantity,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || copy.orderCreationFailed);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/customer/orders');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">{copy.loadingPage}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{copy.productNotFound}</p>
          <Link href="/customer/products" className="text-purple-400 hover:text-purple-300">
            {copy.backToProducts}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900" dir={isRTL ? 'rtl' : 'ltr'}>
      <nav className="bg-slate-900/50 border-b border-purple-500/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-purple-400">
            Bily Card
          </Link>
          <div className="flex gap-4">
            <Link href="/customer/products" className="text-gray-300 hover:text-purple-400">
              {copy.shop}
            </Link>
            <Link href="/customer/wallet" className="text-gray-300 hover:text-purple-400">
              {copy.wallet}
            </Link>
            <Link href="/customer/orders" className="text-gray-300 hover:text-purple-400">
              {copy.orders}
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                router.push('/');
              }}
              className="text-gray-300 hover:text-red-400"
            >
              {copy.logout}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
              <p className="text-gray-400">{product.gameName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded p-4">
              <p className="text-gray-400 text-sm">{copy.pricePerUnit}</p>
              <p className="text-2xl font-bold text-green-400">${product.price}</p>
            </div>
            <div className="bg-slate-700/50 rounded p-4">
              <p className="text-gray-400 text-sm">{copy.availability}</p>
              <p className="text-lg font-semibold text-white">
                {inStock ? (
                  <span className="text-green-400">{copy.inStock}</span>
                ) : (
                  <span className="text-red-400">{copy.outOfStock}</span>
                )}
              </p>
            </div>
          </div>

          {product.description && <p className="text-gray-300">{product.description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">{copy.completeOrder}</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded p-4 mb-6 text-red-400">{error}</div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded p-4 mb-6 text-green-400">
              {copy.orderSuccess}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">{copy.playerIdLabel}</label>
            <input
              type="text"
              value={formData.playerId}
              onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
              placeholder={copy.playerIdPlaceholder}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              required
              disabled={submitting}
            />
            <p className="text-gray-400 text-sm mt-1">{copy.playerIdHint}</p>
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">{copy.quantity}</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    quantity: Math.max(1, formData.quantity - 1),
                  })
                }
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
                disabled={submitting}
              >
                -
              </button>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="w-16 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white text-center"
                min="1"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    quantity: formData.quantity + 1,
                  })
                }
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
                disabled={submitting}
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded p-4 mb-6 border border-slate-600">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">{copy.subtotal}</span>
              <span className="text-white">${product.price * formData.quantity}</span>
            </div>
            <div className="border-t border-slate-600 pt-2">
              <div className="flex justify-between mb-2">
                <span className="text-white font-semibold">{copy.totalAmount}</span>
                <span className="text-2xl font-bold text-green-400">${totalPrice}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !inStock}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
          >
            {submitting ? copy.processing : inStock ? `${copy.buyFor} $${totalPrice}` : copy.outOfStock}
          </button>

          <Link href="/customer/products" className="block text-center text-gray-400 hover:text-gray-300 mt-4">
            {copy.continueShopping}
          </Link>
        </form>

        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-6 mt-8 text-blue-300">
          <p className="text-sm">
            <strong>{copy.noteLabel}</strong> {copy.noteText}
          </p>
        </div>
      </div>
    </div>
  );
}
