'use client'

import { useRouter } from 'next/navigation';
import { logoutCustomer } from '@/lib/utils/customerLogout';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    router.prefetch('/login');
    await logoutCustomer('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-[24px] border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
    >
      Logout
    </button>
  );
}
