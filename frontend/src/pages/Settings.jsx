import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import { Save, ArrowLeft, User, Mail, MapPin, Globe, Twitter, Instagram } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:3001/api/v1';

export default function Settings() {
  const navigate = useNavigate();
  const { isConnected, accountId } = useContext(WalletConnectContext);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    twitter: '',
    instagram: ''
  });

  useEffect(() => {
    if (isConnected && accountId) {
      loadProfile();
    }
  }, [isConnected, accountId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = response.data.data.user;
      setProfile({
        displayName: user.profile?.displayName || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        website: user.profile?.website || '',
        twitter: user.profile?.social?.twitter || '',
        instagram: user.profile?.social?.instagram || ''
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE}/users/profile`,
        {
          displayName: profile.displayName,
          bio: profile.bio,
          location: profile.location,
          website: profile.website,
          twitter: profile.twitter,
          instagram: profile.instagram
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Profile updated successfully! 🎉');

      // Force profile page to reload when navigating back
      setTimeout(() => {
        navigate('/profile');
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">Wallet Not Connected</h1>
          <p className="text-gray-300 mb-6">Please connect your wallet to access settings</p>
          <Link
            to="/"
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition inline-block"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-bold mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Profile
          </Link>
          <h1 className="text-5xl font-black text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            EDIT PROFILE
          </h1>
          <p className="text-gray-300 mt-2">Customize your superhero identity</p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl shadow-2xl p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-pulse">⚡</div>
              <p className="text-white">Loading profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Display Name
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  placeholder="Your superhero name"
                  className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                  maxLength={50}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us your origin story..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">{profile.bio.length}/200 characters</p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="Your secret lair location"
                  className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                  maxLength={100}
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  placeholder="https://your-website.com"
                  className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                />
              </div>

              {/* Social Media */}
              <div className="border-t border-purple-500/30 pt-6">
                <h3 className="text-xl font-black text-purple-400 mb-4">SOCIAL LINKS</h3>

                {/* Twitter */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </label>
                  <div className="flex items-center">
                    <span className="px-4 py-3 bg-gray-900/50 border-2 border-r-0 border-purple-500/30 rounded-l-lg text-gray-400">
                      @
                    </span>
                    <input
                      type="text"
                      value={profile.twitter}
                      onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                      placeholder="username"
                      className="flex-1 px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-r-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Instagram */}
                <div>
                  <label className="block text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </label>
                  <div className="flex items-center">
                    <span className="px-4 py-3 bg-gray-900/50 border-2 border-r-0 border-purple-500/30 rounded-l-lg text-gray-400">
                      @
                    </span>
                    <input
                      type="text"
                      value={profile.instagram}
                      onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                      placeholder="username"
                      className="flex-1 px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-r-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                <Link
                  to="/profile"
                  className="flex-1 py-4 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
          <p><strong>💡 Pro Tip:</strong> Make your profile stand out! Add a catchy bio and social links to connect with fellow comic collectors.</p>
        </div>
      </div>
    </div>
  );
}
