import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Modal } from '@/components/common/Modal';
import { simpleAuth, User } from '@/services/auth/simpleAuth';
import { LogOut, Eye, Copy, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    mobile: '',
    password: '',
    username: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const isAdmin = simpleAuth.isCurrentUserAdmin();
    if (!isAdmin) {
      toast.error('Admin access required');
      navigate('/login');
      return;
    }

    loadUsers();
  }, [navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await simpleAuth.getAllUsers();
      setUsers(allUsers);
      if (allUsers.length === 0) {
        toast.error('No users found or failed to load users');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    simpleAuth.logout();
    navigate('/login');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleAddUser = async () => {
    if (!newUser.mobile || !newUser.password) {
      toast.error('Please enter mobile number and password');
      return;
    }

    if (newUser.password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    setCreating(true);
    const { error, user } = await simpleAuth.createUser(
      newUser.mobile,
      newUser.password,
      newUser.username || undefined
    );

    setCreating(false);

    if (!error && user) {
      setShowAddUser(false);
      setNewUser({ mobile: '', password: '', username: '' });
      loadUsers(); // Refresh the list
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    const { error, success } = await simpleAuth.deleteUser(userToDelete.id);

    if (!error && success) {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      loadUsers(); // Refresh the list
    }
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
              <div className="flex gap-2">
                <Button onClick={() => setShowAddUser(true)} size="sm" variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
                <Button onClick={loadUsers} size="sm" variant="outline">
                  Refresh
                </Button>
              </div>
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
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => copyToClipboard(`${user.mobile}\nPassword: ${user.password}`, 'User details')}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Copy Details
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
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

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUser}
        onClose={() => {
          setShowAddUser(false);
          setNewUser({ mobile: '', password: '', username: '' });
        }}
        title="Add New User"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newUser.mobile}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value) || value.length === 0) {
                  setNewUser({ ...newUser, mobile: value });
                }
              }}
              placeholder="Enter mobile number (10-15 digits)"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              maxLength={15}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Enter password (min 4 characters)"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !creating && newUser.mobile && newUser.password.length >= 4) {
                  handleAddUser();
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 4 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username (Optional)
            </label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              placeholder="Enter username (optional)"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !creating && newUser.mobile && newUser.password.length >= 4) {
                  handleAddUser();
                }
              }}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => {
                setShowAddUser(false);
                setNewUser({ mobile: '', password: '', username: '' });
              }}
              variant="outline"
              fullWidth
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              variant="primary"
              fullWidth
              size="lg"
              disabled={creating || !newUser.mobile || !newUser.password || newUser.password.length < 4}
            >
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete user with mobile number ${userToDelete?.mobile}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
}

