'use client'

import { useEffect, useMemo, useState } from 'react'

export type LanguageCode = 'ar' | 'en' | 'fr'

type TranslationKey =
  | 'nav.home'
  | 'nav.products'
  | 'nav.topUp'
  | 'nav.myOrders'
  | 'nav.wallet'
  | 'nav.contact'
  | 'nav.profile'
  | 'nav.logout'
  | 'nav.signIn'
  | 'home.hero.badge'
  | 'home.hero.title1'
  | 'home.hero.title2'
  | 'home.hero.subtitle'
  | 'home.hero.cta'
  | 'home.quick.title'
  | 'home.quick.bestSelling'
  | 'home.quick.cards'
  | 'home.quick.apps'
  | 'home.quick.games'
  | 'home.quick.wallets'
  | 'home.quick.balance'
  | 'home.popular.title'
  | 'home.popular.viewAll'
  | 'home.popular.buyNow'
  | 'home.popular.from'
  | 'home.features.instant.title'
  | 'home.features.instant.subtitle'
  | 'home.features.secure.title'
  | 'home.features.secure.subtitle'
  | 'home.features.support.title'
  | 'home.features.support.subtitle'
  | 'home.features.support.whatsapp'
  | 'home.left.highlights'
  | 'home.left.dailyDeals'
  | 'home.left.dailyDealsValue'
  | 'home.left.fastestDelivery'
  | 'home.left.fastestDeliveryValue'
  | 'home.left.protectedOrders'
  | 'home.left.protectedOrdersValue'
  | 'home.right.walletBalance'
  | 'home.right.addFunds'
  | 'home.right.withdraw'
  | 'home.right.orders'
  | 'home.right.pending'
  | 'home.right.completed'
  | 'home.right.notifications'
  | 'sidebar.level'
  | 'sidebar.progress'
  | 'sidebar.availableBalance'
  | 'sidebar.addBalance'
  | 'sidebar.needHelp'
  | 'sidebar.contactSupport'
  | 'sidebar.home'
  | 'sidebar.products'
  | 'sidebar.wallet'
  | 'sidebar.purchaseHistory'
  | 'sidebar.orders'
  | 'sidebar.account'
  | 'sidebar.contact'
  | 'sidebar.settings'
  | 'sidebar.purchaseSummary'
  | 'sidebar.pendingOrders'
  | 'sidebar.completedOrders'
  | 'sidebar.cancelledOrders'
  | 'sidebar.accountReport'
  | 'sidebar.currentBalance'
  | 'sidebar.currentDebt'
  | 'sidebar.totalTransactions'
  | 'sidebar.totalDeposits'
  | 'sidebar.totalOrdersAmount'
  | 'sidebar.totalOrdersCount'
  | 'sidebar.apiOrders'
  | 'lang.ar'
  | 'lang.en'
  | 'lang.fr'
  | 'login.title'
  | 'login.email'
  | 'login.password'
  | 'login.emailPlaceholder'
  | 'login.passwordPlaceholder'
  | 'login.loggingIn'
  | 'login.login'
  | 'login.noAccount'
  | 'login.register'
  | 'login.failed'
  | 'login.error'
  | 'wallet.loading'
  | 'wallet.title'
  | 'wallet.subtitle'
  | 'wallet.balanceUsd'
  | 'wallet.balanceLbp'
  | 'wallet.addBalance'
  | 'wallet.amount'
  | 'wallet.currency'
  | 'wallet.enterAmount'
  | 'wallet.requestDeposit'
  | 'wallet.submitting'
  | 'wallet.depositSuccess'
  | 'wallet.depositFailed'
  | 'wallet.loadError'
  | 'wallet.genericError'
  | 'wallet.txHistory'
  | 'wallet.noTx'
  | 'wallet.balanceAfter'
  | 'orders.loading'
  | 'orders.title'
  | 'orders.backToAccount'
  | 'orders.noOrders'
  | 'orders.browseProducts'
  | 'orders.orderId'
  | 'orders.product'
  | 'orders.price'
  | 'orders.status'
  | 'orders.playerId'
  | 'orders.date'
  | 'orders.failedFetch'
  | 'account.loading'
  | 'account.title'
  | 'account.subtitle'
  | 'account.name'
  | 'account.email'
  | 'account.walletUsd'
  | 'account.walletLbp'
  | 'account.topUpWallet'
  | 'account.secondaryCurrency'
  | 'account.recentOrders'
  | 'account.viewAll'
  | 'account.noOrders'
  | 'account.browseProducts'
  | 'account.continueShopping'

const dictionary: Record<LanguageCode, Record<TranslationKey, string>> = {
  ar: {
    'nav.home': 'الرئيسية',
    'nav.products': 'المنتجات',
    'nav.topUp': 'شحن الرصيد',
    'nav.myOrders': 'طلباتي',
    'nav.wallet': 'المحفظة',
    'nav.contact': 'اتصل بنا',
    'nav.profile': 'الملف الشخصي',
    'nav.logout': 'تسجيل الخروج',
    'nav.signIn': 'تسجيل الدخول',
    'home.hero.badge': 'تسليم فوري',
    'home.hero.title1': 'اشحن ألعابك المفضلة',
    'home.hero.title2': 'بسرعة وأمان',
    'home.hero.subtitle': 'اشترِ Diamonds وUC وبطاقات Steam خلال ثوانٍ.',
    'home.hero.cta': 'تصفح المنتجات',
    'home.quick.title': 'التصنيفات السريعة',
    'home.quick.bestSelling': 'الأكثر مبيعًا',
    'home.quick.cards': 'البطاقات',
    'home.quick.apps': 'التطبيقات',
    'home.quick.games': 'الألعاب',
    'home.quick.wallets': 'المحافظ',
    'home.quick.balance': 'الرصيد',
    'home.popular.title': 'المنتجات الشائعة',
    'home.popular.viewAll': 'عرض الكل',
    'home.popular.buyNow': 'اشتر الآن',
    'home.popular.from': 'ابتداءً من',
    'home.features.instant.title': 'تسليم فوري',
    'home.features.instant.subtitle': 'سريع وتلقائي',
    'home.features.secure.title': 'آمن 100%',
    'home.features.secure.subtitle': 'دفع آمن',
    'home.features.support.title': 'دعم 24/7',
    'home.features.support.subtitle': 'متواجدون دائمًا',
    'home.features.support.whatsapp': 'واتساب',
    'home.left.highlights': 'مميزات',
    'home.left.dailyDeals': 'عروض اليوم',
    'home.left.dailyDealsValue': 'خصومات حتى 20%',
    'home.left.fastestDelivery': 'أسرع تسليم',
    'home.left.fastestDeliveryValue': 'غالبًا أقل من 60 ثانية',
    'home.left.protectedOrders': 'طلبات محمية',
    'home.left.protectedOrdersValue': 'دفع آمن مضمون',
    'home.right.walletBalance': 'رصيد المحفظة',
    'home.right.addFunds': 'إضافة رصيد',
    'home.right.withdraw': 'سحب',
    'home.right.orders': 'الطلبات',
    'home.right.pending': 'قيد الانتظار',
    'home.right.completed': 'مكتمل',
    'home.right.notifications': 'الإشعارات',
    'sidebar.level': 'المستوى 3',
    'sidebar.progress': '60% نحو المستوى 4',
    'sidebar.availableBalance': 'الرصيد المتاح',
    'sidebar.addBalance': 'إضافة رصيد',
    'sidebar.needHelp': 'تحتاج مساعدة؟',
    'sidebar.contactSupport': 'اتصل بالدعم',
    'sidebar.home': 'الصفحة الرئيسية',
    'sidebar.products': 'المنتجات',
    'sidebar.wallet': 'رصيدي',
    'sidebar.purchaseHistory': 'سجل المشتريات',
    'sidebar.orders': 'الطلبات',
    'sidebar.account': 'الحساب',
    'sidebar.contact': 'اتصل بنا',
    'sidebar.settings': 'الإعدادات',
    'sidebar.purchaseSummary': 'ملخص سجل المشتريات',
    'sidebar.pendingOrders': 'منتظر',
    'sidebar.completedOrders': 'مكتمل',
    'sidebar.cancelledOrders': 'ملغى',
    'sidebar.accountReport': 'تقرير حسابي',
    'sidebar.currentBalance': 'الرصيد الحالي',
    'sidebar.currentDebt': 'الدين الحالي',
    'sidebar.totalTransactions': 'إجمالي المعاملات',
    'sidebar.totalDeposits': 'إجمالي الإيداعات',
    'sidebar.totalOrdersAmount': 'إجمالي الطلبيات',
    'sidebar.totalOrdersCount': 'عدد الطلبيات',
    'sidebar.apiOrders': 'طلبات API',
    'lang.ar': 'العربية',
    'lang.en': 'English',
    'lang.fr': 'Francais',
    'login.title': 'تسجيل الدخول',
    'login.email': 'البريد الإلكتروني',
    'login.password': 'كلمة المرور',
    'login.emailPlaceholder': 'أدخل بريدك الإلكتروني',
    'login.passwordPlaceholder': 'أدخل كلمة المرور',
    'login.loggingIn': 'جاري تسجيل الدخول...',
    'login.login': 'تسجيل الدخول',
    'login.noAccount': 'ليس لديك حساب؟',
    'login.register': 'إنشاء حساب',
    'login.failed': 'فشل تسجيل الدخول',
    'login.error': 'حدث خطأ. حاول مرة أخرى.',
    'wallet.loading': 'جاري تحميل المحفظة...',
    'wallet.title': 'محفظتي',
    'wallet.subtitle': 'إدارة رصيد محفظة Bily Card',
    'wallet.balanceUsd': 'الرصيد (USD)',
    'wallet.balanceLbp': 'الرصيد (LBP)',
    'wallet.addBalance': 'إضافة رصيد',
    'wallet.amount': 'المبلغ',
    'wallet.currency': 'العملة',
    'wallet.enterAmount': 'أدخل المبلغ',
    'wallet.requestDeposit': 'طلب إيداع',
    'wallet.submitting': 'جاري الإرسال...',
    'wallet.depositSuccess': 'تم إرسال طلب الإيداع بنجاح. بانتظار موافقة الأدمن.',
    'wallet.depositFailed': 'فشل إرسال طلب الإيداع.',
    'wallet.loadError': 'تعذّر تحميل بيانات المحفظة الآن. حاول مرة أخرى.',
    'wallet.genericError': 'حدث خطأ. حاول مرة أخرى.',
    'wallet.txHistory': 'سجل العمليات',
    'wallet.noTx': 'لا توجد عمليات بعد',
    'wallet.balanceAfter': 'الرصيد بعد العملية',
    'orders.loading': 'جاري تحميل الطلبات...',
    'orders.title': 'طلباتي',
    'orders.backToAccount': 'العودة إلى الحساب',
    'orders.noOrders': 'لا توجد طلبات بعد',
    'orders.browseProducts': 'تصفح المنتجات',
    'orders.orderId': 'رقم الطلب',
    'orders.product': 'المنتج',
    'orders.price': 'السعر',
    'orders.status': 'الحالة',
    'orders.playerId': 'Player ID',
    'orders.date': 'التاريخ',
    'orders.failedFetch': 'فشل تحميل الطلبات',
    'account.loading': 'جاري تحميل الحساب...',
    'account.title': 'حسابي',
    'account.subtitle': 'إدارة حسابك في Bily Card',
    'account.name': 'الاسم',
    'account.email': 'البريد الإلكتروني',
    'account.walletUsd': 'رصيد المحفظة (USD)',
    'account.walletLbp': 'رصيد المحفظة (LBP)',
    'account.topUpWallet': 'تعبئة المحفظة',
    'account.secondaryCurrency': 'عملة ثانوية',
    'account.recentOrders': 'آخر الطلبات',
    'account.viewAll': 'عرض الكل',
    'account.noOrders': 'لا توجد طلبات بعد',
    'account.browseProducts': 'تصفح المنتجات',
    'account.continueShopping': 'متابعة التسوق',
  },
  en: {
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.topUp': 'Top Up',
    'nav.myOrders': 'My Orders',
    'nav.wallet': 'Wallet',
    'nav.contact': 'Contact',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'nav.signIn': 'Sign In',
    'home.hero.badge': 'INSTANT DELIVERY',
    'home.hero.title1': 'Top Up Your Favorite Games',
    'home.hero.title2': 'Instantly & Securely',
    'home.hero.subtitle': 'Buy Diamonds, UC, Steam Cards and more in seconds.',
    'home.hero.cta': 'Browse Products',
    'home.quick.title': 'Quick Categories',
    'home.quick.bestSelling': 'Best Selling',
    'home.quick.cards': 'Cards',
    'home.quick.apps': 'Apps',
    'home.quick.games': 'Games',
    'home.quick.wallets': 'Wallets',
    'home.quick.balance': 'Balance',
    'home.popular.title': 'Popular Products',
    'home.popular.viewAll': 'View All',
    'home.popular.buyNow': 'Buy Now',
    'home.popular.from': 'From',
    'home.features.instant.title': 'Instant Delivery',
    'home.features.instant.subtitle': 'Fast and automatic',
    'home.features.secure.title': '100% Secure',
    'home.features.secure.subtitle': 'Safe payments',
    'home.features.support.title': '24/7 Support',
    'home.features.support.subtitle': 'Always online',
    'home.features.support.whatsapp': 'WhatsApp',
    'home.left.highlights': 'Highlights',
    'home.left.dailyDeals': 'Daily Deals',
    'home.left.dailyDealsValue': 'Up to 20% Off',
    'home.left.fastestDelivery': 'Fastest Delivery',
    'home.left.fastestDeliveryValue': 'Usually under 60 seconds',
    'home.left.protectedOrders': 'Protected Orders',
    'home.left.protectedOrdersValue': 'Secure checkout guaranteed',
    'home.right.walletBalance': 'Wallet Balance',
    'home.right.addFunds': 'Add Funds',
    'home.right.withdraw': 'Withdraw',
    'home.right.orders': 'Orders',
    'home.right.pending': 'Pending',
    'home.right.completed': 'Completed',
    'home.right.notifications': 'Notifications',
    'sidebar.level': 'Level 3',
    'sidebar.progress': '60% to level 4',
    'sidebar.availableBalance': 'Available Balance',
    'sidebar.addBalance': 'Add Balance',
    'sidebar.needHelp': 'Need help?',
    'sidebar.contactSupport': 'Contact Support',
    'sidebar.home': 'Home',
    'sidebar.products': 'Products',
    'sidebar.wallet': 'Wallet',
    'sidebar.purchaseHistory': 'Purchase History',
    'sidebar.orders': 'Orders',
    'sidebar.account': 'Account',
    'sidebar.contact': 'Contact',
    'sidebar.settings': 'Settings',
    'sidebar.purchaseSummary': 'Purchase Summary',
    'sidebar.pendingOrders': 'Pending',
    'sidebar.completedOrders': 'Completed',
    'sidebar.cancelledOrders': 'Cancelled',
    'sidebar.accountReport': 'Account Report',
    'sidebar.currentBalance': 'Current Balance',
    'sidebar.currentDebt': 'Current Debt',
    'sidebar.totalTransactions': 'Total Transactions',
    'sidebar.totalDeposits': 'Total Deposits',
    'sidebar.totalOrdersAmount': 'Total Orders Amount',
    'sidebar.totalOrdersCount': 'Total Orders',
    'sidebar.apiOrders': 'API Orders',
    'lang.ar': 'Arabic',
    'lang.en': 'English',
    'lang.fr': 'Francais',
    'login.title': 'Login',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.emailPlaceholder': 'Enter your email',
    'login.passwordPlaceholder': 'Enter your password',
    'login.loggingIn': 'Logging in...',
    'login.login': 'Login',
    'login.noAccount': "Don't have an account?",
    'login.register': 'Register',
    'login.failed': 'Login failed',
    'login.error': 'An error occurred. Please try again.',
    'wallet.loading': 'Loading wallet...',
    'wallet.title': 'My Wallet',
    'wallet.subtitle': 'Manage your Bily Card wallet balance',
    'wallet.balanceUsd': 'Balance (USD)',
    'wallet.balanceLbp': 'Balance (LBP)',
    'wallet.addBalance': 'Add Balance',
    'wallet.amount': 'Amount',
    'wallet.currency': 'Currency',
    'wallet.enterAmount': 'Enter amount',
    'wallet.requestDeposit': 'Request Deposit',
    'wallet.submitting': 'Submitting...',
    'wallet.depositSuccess': 'Deposit request submitted successfully. Awaiting admin approval.',
    'wallet.depositFailed': 'Failed to submit deposit request.',
    'wallet.loadError': 'Unable to load wallet data right now. Please try again.',
    'wallet.genericError': 'An error occurred. Please try again.',
    'wallet.txHistory': 'Transaction History',
    'wallet.noTx': 'No transactions yet',
    'wallet.balanceAfter': 'Balance',
    'orders.loading': 'Loading orders...',
    'orders.title': 'My Orders',
    'orders.backToAccount': 'Back to Account',
    'orders.noOrders': 'No orders yet',
    'orders.browseProducts': 'Browse Products',
    'orders.orderId': 'Order ID',
    'orders.product': 'Product',
    'orders.price': 'Price',
    'orders.status': 'Status',
    'orders.playerId': 'Player ID',
    'orders.date': 'Date',
    'orders.failedFetch': 'Failed to fetch orders',
    'account.loading': 'Loading account...',
    'account.title': 'My Account',
    'account.subtitle': 'Manage your Bily Card account',
    'account.name': 'Name',
    'account.email': 'Email',
    'account.walletUsd': 'Wallet Balance (USD)',
    'account.walletLbp': 'Wallet Balance (LBP)',
    'account.topUpWallet': 'Top Up Wallet',
    'account.secondaryCurrency': 'Secondary currency',
    'account.recentOrders': 'Recent Orders',
    'account.viewAll': 'View All',
    'account.noOrders': 'No orders yet',
    'account.browseProducts': 'Browse Products',
    'account.continueShopping': 'Continue Shopping',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.products': 'Produits',
    'nav.topUp': 'Recharger',
    'nav.myOrders': 'Mes commandes',
    'nav.wallet': 'Portefeuille',
    'nav.contact': 'Contact',
    'nav.profile': 'Profil',
    'nav.logout': 'Deconnexion',
    'nav.signIn': 'Connexion',
    'home.hero.badge': 'LIVRAISON INSTANTANEE',
    'home.hero.title1': 'Rechargez Vos Jeux Preferes',
    'home.hero.title2': 'Instantanement et en securite',
    'home.hero.subtitle': 'Achetez Diamonds, UC, cartes Steam et plus en quelques secondes.',
    'home.hero.cta': 'Voir les produits',
    'home.quick.title': 'Categories rapides',
    'home.quick.bestSelling': 'Meilleures ventes',
    'home.quick.cards': 'Cartes',
    'home.quick.apps': 'Applications',
    'home.quick.games': 'Jeux',
    'home.quick.wallets': 'Portefeuilles',
    'home.quick.balance': 'Solde',
    'home.popular.title': 'Produits populaires',
    'home.popular.viewAll': 'Voir tout',
    'home.popular.buyNow': 'Acheter',
    'home.popular.from': 'A partir de',
    'home.features.instant.title': 'Livraison instantanee',
    'home.features.instant.subtitle': 'Rapide et automatique',
    'home.features.secure.title': '100% securise',
    'home.features.secure.subtitle': 'Paiements securises',
    'home.features.support.title': 'Support 24/7',
    'home.features.support.subtitle': 'Toujours en ligne',
    'home.features.support.whatsapp': 'WhatsApp',
    'home.left.highlights': 'Points forts',
    'home.left.dailyDeals': 'Offres du jour',
    'home.left.dailyDealsValue': 'Jusqu a 20% de reduction',
    'home.left.fastestDelivery': 'Livraison la plus rapide',
    'home.left.fastestDeliveryValue': 'Souvent en moins de 60 secondes',
    'home.left.protectedOrders': 'Commandes protegees',
    'home.left.protectedOrdersValue': 'Paiement securise garanti',
    'home.right.walletBalance': 'Solde du portefeuille',
    'home.right.addFunds': 'Ajouter des fonds',
    'home.right.withdraw': 'Retirer',
    'home.right.orders': 'Commandes',
    'home.right.pending': 'En attente',
    'home.right.completed': 'Terminee',
    'home.right.notifications': 'Notifications',
    'sidebar.level': 'Niveau 3',
    'sidebar.progress': '60% vers le niveau 4',
    'sidebar.availableBalance': 'Solde disponible',
    'sidebar.addBalance': 'Ajouter du solde',
    'sidebar.needHelp': 'Besoin d aide ?',
    'sidebar.contactSupport': 'Contacter le support',
    'sidebar.home': 'Accueil',
    'sidebar.products': 'Produits',
    'sidebar.wallet': 'Portefeuille',
    'sidebar.purchaseHistory': 'Historique des achats',
    'sidebar.orders': 'Commandes',
    'sidebar.account': 'Compte',
    'sidebar.contact': 'Contact',
    'sidebar.settings': 'Parametres',
    'sidebar.purchaseSummary': 'Resume des achats',
    'sidebar.pendingOrders': 'En attente',
    'sidebar.completedOrders': 'Terminees',
    'sidebar.cancelledOrders': 'Annulees',
    'sidebar.accountReport': 'Rapport du compte',
    'sidebar.currentBalance': 'Solde actuel',
    'sidebar.currentDebt': 'Dette actuelle',
    'sidebar.totalTransactions': 'Total des transactions',
    'sidebar.totalDeposits': 'Total des depots',
    'sidebar.totalOrdersAmount': 'Montant total des commandes',
    'sidebar.totalOrdersCount': 'Nombre de commandes',
    'sidebar.apiOrders': 'Commandes API',
    'lang.ar': 'Arabe',
    'lang.en': 'English',
    'lang.fr': 'Francais',
    'login.title': 'Connexion',
    'login.email': 'Email',
    'login.password': 'Mot de passe',
    'login.emailPlaceholder': 'Entrez votre email',
    'login.passwordPlaceholder': 'Entrez votre mot de passe',
    'login.loggingIn': 'Connexion en cours...',
    'login.login': 'Connexion',
    'login.noAccount': 'Pas de compte ?',
    'login.register': 'Inscription',
    'login.failed': 'Echec de connexion',
    'login.error': 'Une erreur est survenue. Reessayez.',
    'wallet.loading': 'Chargement du portefeuille...',
    'wallet.title': 'Mon Portefeuille',
    'wallet.subtitle': 'Gerez le solde de votre portefeuille Bily Card',
    'wallet.balanceUsd': 'Solde (USD)',
    'wallet.balanceLbp': 'Solde (LBP)',
    'wallet.addBalance': 'Ajouter du solde',
    'wallet.amount': 'Montant',
    'wallet.currency': 'Devise',
    'wallet.enterAmount': 'Entrez le montant',
    'wallet.requestDeposit': 'Demander un depot',
    'wallet.submitting': 'Envoi...',
    'wallet.depositSuccess': 'Demande de depot envoyee avec succes. En attente de validation admin.',
    'wallet.depositFailed': 'Echec de la demande de depot.',
    'wallet.loadError': 'Impossible de charger les donnees du portefeuille maintenant. Reessayez.',
    'wallet.genericError': 'Une erreur est survenue. Reessayez.',
    'wallet.txHistory': 'Historique des transactions',
    'wallet.noTx': 'Aucune transaction pour le moment',
    'wallet.balanceAfter': 'Solde',
    'orders.loading': 'Chargement des commandes...',
    'orders.title': 'Mes commandes',
    'orders.backToAccount': 'Retour au compte',
    'orders.noOrders': 'Aucune commande pour le moment',
    'orders.browseProducts': 'Voir les produits',
    'orders.orderId': 'ID commande',
    'orders.product': 'Produit',
    'orders.price': 'Prix',
    'orders.status': 'Statut',
    'orders.playerId': 'ID joueur',
    'orders.date': 'Date',
    'orders.failedFetch': 'Echec du chargement des commandes',
    'account.loading': 'Chargement du compte...',
    'account.title': 'Mon Compte',
    'account.subtitle': 'Gerez votre compte Bily Card',
    'account.name': 'Nom',
    'account.email': 'Email',
    'account.walletUsd': 'Solde portefeuille (USD)',
    'account.walletLbp': 'Solde portefeuille (LBP)',
    'account.topUpWallet': 'Recharger le portefeuille',
    'account.secondaryCurrency': 'Devise secondaire',
    'account.recentOrders': 'Commandes recentes',
    'account.viewAll': 'Voir tout',
    'account.noOrders': 'Aucune commande pour le moment',
    'account.browseProducts': 'Voir les produits',
    'account.continueShopping': 'Continuer les achats',
  },
}

const getDir = (language: LanguageCode): 'rtl' | 'ltr' =>
  language === 'ar' ? 'rtl' : 'ltr'

const applyLanguageToDocument = (language: LanguageCode) => {
  document.documentElement.lang = language
  document.documentElement.dir = getDir(language)
}

export function useLanguage() {
  const [language, setLanguage] = useState<LanguageCode>('ar')

  useEffect(() => {
    const saved = localStorage.getItem('bilycard_language') as LanguageCode | null
    const initial: LanguageCode = saved && dictionary[saved] ? saved : 'ar'
    setLanguage(initial)
    applyLanguageToDocument(initial)

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'bilycard_language') {
        const latest = (localStorage.getItem('bilycard_language') as LanguageCode | null) || 'ar'
        const next: LanguageCode = dictionary[latest] ? latest : 'ar'
        setLanguage(next)
        applyLanguageToDocument(next)
      }
    }

    const onLanguageChanged = () => {
      const latest = (localStorage.getItem('bilycard_language') as LanguageCode | null) || 'ar'
      const next: LanguageCode = dictionary[latest] ? latest : 'ar'
      setLanguage(next)
      applyLanguageToDocument(next)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('bilycard-language-changed', onLanguageChanged)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('bilycard-language-changed', onLanguageChanged)
    }
  }, [])

  const setAppLanguage = (nextLanguage: LanguageCode) => {
    if (!dictionary[nextLanguage]) return
    localStorage.setItem('bilycard_language', nextLanguage)
    setLanguage(nextLanguage)
    applyLanguageToDocument(nextLanguage)
    window.dispatchEvent(new Event('bilycard-language-changed'))
  }

  const t = useMemo(() => {
    return (key: TranslationKey) => dictionary[language][key] || dictionary.en[key] || key
  }, [language])

  return {
    language,
    isRTL: language === 'ar',
    t,
    setAppLanguage,
  }
}
