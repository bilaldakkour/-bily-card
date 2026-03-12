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
      className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
    >
      Logout
    </button>
  );
}