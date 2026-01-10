import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { simpleAuth, User } from '@/services/auth/simpleAuth';
import { LogOut, Eye, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (!simpleAuth.isCurrentUserAdmin()) {
      navigate('/login');
      return;
    }

    loadUsers();
  }, [navigate]);

  const loadUsers = async () => {
    setLoading(true);
    const allUsers = await simpleAuth.getAllUsers();
    setUsers(allUsers);
    setLoading(false);
  };

  const handleLogout = () => {
    simpleAuth.logout();
    navigate('/login');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto pt-16">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
            <p className="text-gray-600">View all users and their passwords</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">All Users</h2>
              <Button onClick={loadUsers} size="sm" variant="outline">
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">ID</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Mobile</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Username</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Password</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Created At</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3">{user.id.substring(0, 8)}...</td>
                        <td className="border border-gray-300 px-4 py-3 font-mono">{user.mobile}</td>
                        <td className="border border-gray-300 px-4 py-3">{user.username || '-'}</td>
                        <td className="border border-gray-300 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{user.password}</span>
                            <button
                              onClick={() => copyToClipboard(user.password, 'Password')}
                              className="text-blue-600 hover:text-blue-800"
                              title="Copy password"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <button
                            onClick={() => copyToClipboard(`${user.mobile}\nPassword: ${user.password}`, 'User details')}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Copy Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Total Users:</strong> {users.length}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

