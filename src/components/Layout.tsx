import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Calendar, BarChart2, Settings, Clock } from 'lucide-react';
import { logout } from '../services/auth/AuthService';

export const Layout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">WorkTime</h1>
          </div>
          
          <nav className="flex gap-4">
            <Link to="/entry" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Add Work Day
            </Link>
            <Link to="/timesheet" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timesheet
            </Link>
            <Link to="/stats" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Stats
            </Link>
            <Link to="/settings" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>

          <button 
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-600 p-2 rounded-full"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
