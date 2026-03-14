'use client'

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('bilycard_token');
    router.push('/login');
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
