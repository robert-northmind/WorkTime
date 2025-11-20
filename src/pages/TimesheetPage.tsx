import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth/AuthService';
import { getEntries } from '../services/firestore/FirestoreService';
import type { FirestoreDailyEntry } from '../types/firestore';

export const TimesheetPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<FirestoreDailyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) return;
    fetchEntries();
  }, [user, selectedYear]);

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;
      const data = await getEntries(user.uid, startOfYear, endOfYear);
      // Sort descending by date
      setEntries(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (date: string) => {
    navigate(`/entry?date=${date}`);
  };

  // Generate year options (current year +/- 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  if (!user) return <div>Please log in</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Timesheet</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="year" className="text-sm font-medium text-gray-700">Year:</label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extra</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No entries found for {selectedYear}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr 
                    key={entry.date} 
                    onClick={() => handleRowClick(entry.date)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${entry.status === 'work' ? 'bg-green-100 text-green-800' : 
                          entry.status === 'vacation' ? 'bg-blue-100 text-blue-800' :
                          entry.status === 'sick' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.status === 'work' ? `${entry.startTime} - ${entry.endTime}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.extraHours ? `+${entry.extraHours}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
