import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Modal } from '@/components/common/Modal';
import { simpleAuth, User } from '@/services/auth/simpleAuth';
import { useCloudDatabaseSync } from '@/services/database/cloudEnv';
import { LogOut, Copy, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    loginId: '',
    password: '',
    displayName: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
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
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
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
    toast.success(`${label} copied`);
  };

  const minPasswordLength = useCloudDatabaseSync() ? 6 : 3;

  const handleAddUser = async () => {
    if (!newUser.loginId.trim() || !newUser.password) {
      toast.error('Enter email or phone and password');
      return;
    }

    if (newUser.password.length < minPasswordLength) {
      toast.error(
        useCloudDatabaseSync()
          ? 'Password must be at least 6 characters (cloud)'
          : 'Password must be at least 3 characters'
      );
      return;
    }

    setCreating(true);
    const { error, user } = await simpleAuth.createUser(
      newUser.loginId.trim(),
      newUser.password,
      newUser.displayName.trim() || undefined
    );

    setCreating(false);

    if (!error && user) {
      setShowAddUser(false);
      setNewUser({ loginId: '', password: '', displayName: '' });
      loadUsers();
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
      loadUsers();
    }
  };

  const isBuiltInRow = (u: User) => u.id === 'builtin-admin' || u.id === 'builtin-issac';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto pt-16">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
            <p className="text-gray-600">Manage users — add sign-ins with email, phone, or legacy username</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Users</h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddUser(true)} size="sm" variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add user
                </Button>
                <Button onClick={loadUsers} size="sm" variant="outline">
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading…</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No users</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-base">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Sign-in (email / phone / username)</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Display name</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Password / auth</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Created</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 font-mono">{user.mobile}</td>
                        <td className="border border-gray-300 px-3 py-2">{user.username || '—'}</td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">
                              {user.password ||
                                (user.id.length > 20 ? 'Firebase Auth (not shown)' : '—')}
                            </span>
                            {user.password ? (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(user.password, 'Password')}
                                className="text-blue-600 hover:text-blue-800"
                                title="Copy password"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {isBuiltInRow(user)
                            ? 'Built-in'
                            : user.created_at
                              ? new Date(user.created_at).toLocaleString()
                              : '—'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex flex-wrap gap-2 items-center">
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  `Sign-in: ${user.mobile}\nPassword: ${user.password || '(Firebase — password not stored in app)'}`,
                                  'Credentials'
                                )
                              }
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Copy details
                            </button>
                            {!isBuiltInRow(user) ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(user)}
                                className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">Built-in</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Total:</strong> {users.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showAddUser}
        onClose={() => {
          setShowAddUser(false);
          setNewUser({ loginId: '', password: '', displayName: '' });
        }}
        title="Add user"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email, phone, or username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newUser.loginId}
              onChange={(e) => setNewUser({ ...newUser, loginId: e.target.value })}
              placeholder="e.g. user@company.com or +1 415 555 0100 or priya_sharma"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Phone: at least 10 digits, no letters. Username: 2–32 chars (not reserved admin/issac logins).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder={useCloudDatabaseSync() ? 'Min 6 characters (cloud)' : 'Min 3 characters'}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display name (optional)</label>
            <input
              type="text"
              value={newUser.displayName}
              onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
              placeholder="Shown in the app"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => {
                setShowAddUser(false);
                setNewUser({ loginId: '', password: '', displayName: '' });
              }}
              variant="outline"
              fullWidth
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleAddUser()}
              variant="primary"
              fullWidth
              size="lg"
              disabled={
                creating ||
                !newUser.loginId.trim() ||
                !newUser.password ||
                newUser.password.length < minPasswordLength
              }
            >
              {creating ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete user"
        message={`Delete user “${userToDelete?.mobile}”? They will not be able to sign in.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
}
