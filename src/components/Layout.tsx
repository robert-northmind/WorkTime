import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Calendar, BarChart2, Settings } from 'lucide-react';
import { logout, subscribeToAuthChanges } from '../services/auth/AuthService';
import type { User } from 'firebase/auth';

const getInitials = (displayName: string | null, email: string | null): string => {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return subscribeToAuthChanges(setUser);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = getInitials(user?.displayName ?? null, user?.email ?? null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <img
              src="/worktime-icon.svg"
              alt="WorkTime"
              className="h-6 w-6 sm:h-7 sm:w-7"
            />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">WorkTime</h1>
          </div>

          <nav className="flex gap-1 sm:gap-4">
            <Link to="/timesheet" className="text-gray-600 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 sm:gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Timesheet</span>
            </Link>
            <Link to="/stats" className="text-gray-600 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 sm:gap-2">
              <BarChart2 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </Link>
            <Link to="/settings" className="text-gray-600 hover:text-blue-600 px-2 sm:px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 sm:gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <Link
              to="/profile"
              title={user?.displayName || user?.email || 'Profile'}
              className="flex items-center justify-center h-9 w-9 rounded-full hover:ring-2 hover:ring-blue-400 transition-all overflow-hidden"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-9 w-9 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold select-none">
                  {initials}
                </div>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 p-2 rounded-full"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
