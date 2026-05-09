import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  LogOut, Zap, Activity, Users, MapPin, Clock, MessageCircle,
  Plus, X, Loader2, Trophy, CalendarPlus, Calendar, Pencil, Check, Bell, Sparkles
} from 'lucide-react';
import axios from 'axios';
import ChatRoom from '../components/ChatRoom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const RING_COLORS = ['#0085C7', '#F4C300', '#009F3D', '#DF0024', '#0085C7'];
const SKILL_COLORS = {
  Beginner: { bg: 'rgba(0,133,199,0.12)', text: '#0085C7' },
  Intermediate: { bg: 'rgba(244,195,0,0.15)', text: '#b38f00' },
  Advanced: { bg: 'rgba(0,159,61,0.12)', text: '#007a2f' },
  Pro: { bg: 'rgba(223,0,36,0.12)', text: '#DF0024' },
};

const inputStyle = {
  background: '#ffffff',
  border: '1.5px solid #e2e8f0',
  color: '#1e293b',
  borderRadius: '0.5rem',
};

export default function Dashboard() {
  const { user, logout, fetchUser } = useAuth();
  const socket = useSocket();
  const [availability, setAvailability] = useState(user?.availability?.isAvailableToday || false);
  const [matches, setMatches] = useState([]);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showAiPopup, setShowAiPopup] = useState(false);
  const [aiPopupData, setAiPopupData] = useState(null);
  const [allSports, setAllSports] = useState([]);
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const [showEventSportDropdown, setShowEventSportDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const fetchAllSports = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/users/sports', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllSports(res.data);
      } catch (err) { console.error('Failed to fetch sports', err); }
    };
    fetchAllSports();
  }, []);

  // Profile edit state
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedCity, setEditedCity] = useState(user?.city || '');
  const [editedCountry, setEditedCountry] = useState(user?.country || '');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  // Inline editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedBio, setEditedBio] = useState(user?.bio || '');
  const [showNavbarAvatarPopup, setShowNavbarAvatarPopup] = useState(false);
  const [showCardAvatarPopup, setShowCardAvatarPopup] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);

  // Add Sport form
  const [showSportForm, setShowSportForm] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [newSportSkill, setNewSportSkill] = useState('Intermediate');
  const [addingSport, setAddingSport] = useState(false);

  // Create Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    sport: '',
    location: '',
    date: '',
    time: '',
    maxPlayers: 2,
    description: '',
  });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventSuccess, setEventSuccess] = useState('');

  useEffect(() => { 
    fetchMatches(); 
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (socket && user) {
      socket.emit('joinUserRoom', user._id);

      socket.on('eventUpdated', (data) => {
        console.log('Dashboard: Event updated', data);
        fetchMatches();
        fetchNotifications();
        
        if (data.action === 'kick' && data.kickedUserId === user._id) {
          alert('You have been removed from the event');
        }
      });

      socket.on('newNotification', (data) => {
        console.log('Dashboard: New notification', data);
        fetchNotifications();
        
        if (data.eventId && data.joinCode) {
          setAiPopupData(data);
          setShowAiPopup(true);
        } else if (data.message) {
          // Show toast for other notifications
          setToastMessage(data.message);
          setTimeout(() => setToastMessage(null), 5000); // Hide after 5 seconds
        }
      });

      socket.on('eventDeleted', (data) => {
        console.log('Dashboard: Event deleted', data);
        fetchMatches();
      });

      socket.on('userUpdated', (data) => {
        console.log('Dashboard: User updated', data);
        fetchUser();
      });

      return () => {
        socket.off('eventUpdated');
        socket.off('newNotification');
        socket.off('eventDeleted');
        socket.off('userUpdated');
      };
    }
  }, [socket, user]);

  const fetchMatches = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/matches/all-events');
      setMatches(res.data);
      checkReminders(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/matches/notifications');
      setNotifications(res.data);
    } catch (err) { console.error(err); }
  };

  const checkReminders = (matchesList) => {
    const now = new Date();
    const myMatches = matchesList.filter(match => match.members.some(m => m._id === user?._id || m === user?._id));
    const upcoming = myMatches.filter(m => {
      const eventTime = new Date(m.time);
      const diff = eventTime - now;
      return diff > 0 && diff < 24 * 60 * 60 * 1000; // Next 24 hours
    });
    setReminders(upcoming);
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/matches/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const handleJoinByCode = async (codeArg) => {
    const code = typeof codeArg === 'string' ? codeArg : joinCodeInput;
    if (!code.trim()) return;
    try {
      const res = await axios.post('http://localhost:5000/api/matches/join-by-code', { code: code.toUpperCase() });
      setJoinCodeInput('');
      fetchMatches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join event');
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to leave this event?')) return;
    try {
      await axios.post(`http://localhost:5000/api/matches/${eventId}/leave`);
      fetchMatches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to leave event');
    }
  };

  const handleKickUser = async (eventId, userId) => {
    try {
      await axios.post(`http://localhost:5000/api/matches/${eventId}/kick`, { userId });
      fetchMatches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to kick user');
    }
  };

  const handleToggleAvailability = async (isAvailable) => {
    if (isAvailable && (!user?.city || !user?.country)) {
      alert("Please set your location in your profile before setting availability!");
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/users/availability', { isAvailable });
      setAvailability(isAvailable);
    } catch (err) { console.error('Failed to update availability', err); }
  };

  const handleSaveLocation = async () => {
    try {
      await axios.put('http://localhost:5000/api/users/profile', { city: editedCity, country: editedCountry });
      await fetchUser();
      setIsEditingLocation(false);
    } catch (err) { console.error('Failed to update location', err); }
  };

  const renderMatchCard = (match, idx) => {
    const accent = RING_COLORS[idx % RING_COLORS.length];
    const isActiveChat = activeChat?._id === match._id;
    const isMember = match.members.some(m => m._id === user?._id || m === user?._id);
    const isPending = match.pendingMembers?.some(m => m._id === user?._id || m === user?._id);
    const isCaptain = match.captain?._id === user?._id;
    return (
      <Card key={match._id} className="glass border-0 shadow-md animate-fade-in overflow-hidden"
        style={{ borderRadius: '1rem', animationDelay: `${idx * 0.08}s` }}>
        <div className="h-1" style={{ background: accent }} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg capitalize" style={{ fontFamily: 'Outfit, sans-serif', color: accent }}>
                {match.sport?.name || match.sport}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Match Event</p>
            </div>
            <Badge style={{
              background: match.status === 'Planned' ? '#dcfce7' : `${accent}15`,
              color: match.status === 'Planned' ? '#15803d' : accent,
              border: `1px solid ${match.status === 'Planned' ? '#bbf7d0' : `${accent}30`}`
            }}>
              {match.status}
            </Badge>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
              <MapPin size={14} style={{ color: accent }} />
              <span>{match.location?.name || 'Location TBD'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
              <Clock size={14} style={{ color: accent }} />
              <span>{new Date(match.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
              <Users size={14} style={{ color: accent }} />
              <span>
                <strong style={{ color: '#1e293b' }}>{match.members.length}</strong> players
                {' · Captain: '}
                <strong style={{ color: '#1e293b' }}>{match.captain?.name}</strong>
                {match.captain?._id === user?._id && (
                  <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: `${accent}15`, color: accent }}>You</span>
                )}
              </span>
            </div>
            {isCaptain && match.joinCode && (
              <div className="text-sm mt-2 p-1.5 bg-gray-50 rounded-md border border-dashed border-gray-300">
                <span className="font-semibold text-gray-600">Join Code:</span> <span className="font-mono text-black font-bold">{match.joinCode}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {isMember && (
              <>
                <Button
                  onClick={() => setActiveChat(isActiveChat ? null : match)}
                  className="w-full gap-2 font-semibold text-sm h-9 transition-all cursor-pointer"
                  style={{
                    background: isActiveChat ? `${accent}15` : `linear-gradient(135deg, ${accent}CC, ${accent})`,
                    color: isActiveChat ? accent : 'white',
                    border: isActiveChat ? `1px solid ${accent}40` : 'none',
                    borderRadius: '0.5rem',
                  }}
                >
                  <MessageCircle size={15} />
                  {isActiveChat ? 'Close Chat' : 'Open Group Chat'}
                </Button>
                
                <Button
                  onClick={() => handleLeaveEvent(match._id)}
                  className="w-full gap-2 font-semibold text-sm h-9 transition-all cursor-pointer mt-2"
                  style={{
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '0.5rem',
                  }}
                >
                  Leave Event
                </Button>
              </>
            )}

            {!isMember && !isPending && match.status !== 'Planned' && (
              <Button
                onClick={() => handleApplyToEvent(match._id)}
                className="w-full gap-2 font-semibold text-sm h-9 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${accent}CC, ${accent})`,
                  color: 'white',
                  borderRadius: '0.5rem',
                }}
              >
                Apply to Join
              </Button>
            )}

            {isPending && (
              <Button
                disabled
                className="w-full gap-2 font-semibold text-sm h-9 transition-all"
                style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  borderRadius: '0.5rem',
                }}
              >
                Pending Approval
              </Button>
            )}

            {isCaptain && match.status !== 'Planned' && (
              <Button
                onClick={() => handleMarkPlanned(match._id)}
                className="w-full gap-2 font-semibold text-sm h-9 transition-all"
                style={{
                  background: '#22c55e',
                  color: 'white',
                  borderRadius: '0.5rem',
                }}
              >
                Mark as Planned
              </Button>
            )}

            {isCaptain && match.members?.length > 1 && (
              <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold mb-2 text-slate-600">Event Members:</p>
                <div className="space-y-2">
                  {match.members.map(member => {
                    if (member._id === user._id || member === user._id) return null;
                    return (
                      <div key={member._id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            {member.avatar && <AvatarImage src={`http://localhost:5000${member.avatar}`} />}
                            <AvatarFallback className="text-[10px]">{member.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleKickUser(match._id, member._id)}>
                          Kick
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isCaptain && match.pendingMembers?.length > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold mb-2 text-slate-600">Pending Applicants:</p>
                <div className="space-y-2">
                  {match.pendingMembers.map(applicant => (
                    <div key={applicant._id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          {applicant.avatar && <AvatarImage src={`http://localhost:5000${applicant.avatar}`} />}
                          <AvatarFallback className="text-[10px]">{applicant.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{applicant.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleAcceptApplicant(match._id, applicant._id)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleRejectApplicant(match._id, applicant._id)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isActiveChat && (
            <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${accent}30` }}>
              <ChatRoom match={match} onClose={() => setActiveChat(null)} accentColor={accent} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleRefreshMatches = async () => {
    setLoadingMatch(true);
    try {
      await fetchMatches();
    } catch (err) { console.error(err); }
    finally { setLoadingMatch(false); }
  };

  const handleAddSport = async (e) => {
    e.preventDefault();
    if (!newSportName.trim()) return;
    setAddingSport(true);
    try {
      await axios.post('http://localhost:5000/api/users/sports', { name: newSportName, skillLevel: newSportSkill });
      await fetchUser();
      setNewSportName('');
      setShowSportForm(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add sport');
    } finally { setAddingSport(false); }
  };

  const handleRemoveSport = async (sportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/sports/${sportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchUser();
    } catch (err) {
      console.error('Failed to remove sport', err);
      alert('Failed to remove sport');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreatingEvent(true);
    setEventSuccess('');
    try {
      const payload = {
        sport: eventForm.sport,
        location: eventForm.location,
        time: new Date(`${eventForm.date}T${eventForm.time}`).toISOString(),
        maxPlayers: Number(eventForm.maxPlayers),
        description: eventForm.description,
      };
      await axios.post('http://localhost:5000/api/matches/create-event', payload);
      setEventSuccess('🎉 Event created successfully!');
      setEventForm({ sport: '', location: '', date: '', time: '', maxPlayers: 2, description: '' });
      await fetchMatches();
      setTimeout(() => { setShowEventForm(false); setEventSuccess(''); }, 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create event');
    } finally { setCreatingEvent(false); }
  };

  const handleApplyToEvent = async (eventId) => {
    try {
      await axios.post(`http://localhost:5000/api/matches/${eventId}/apply`);
      await fetchMatches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply');
    }
  };

  const handleAcceptApplicant = async (eventId, userId) => {
    try {
      await axios.post(`http://localhost:5000/api/matches/${eventId}/accept`, { userId });
      await fetchMatches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept applicant');
    }
  };

  const handleRejectApplicant = async (eventId, userId) => {
    try {
      await axios.post(`http://localhost:5000/api/matches/${eventId}/reject`, { userId });
      await fetchMatches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject applicant');
    }
  };

  const handleMarkPlanned = async (eventId) => {
    try {
      await axios.post(`http://localhost:5000/api/matches/${eventId}/plan`);
      await fetchMatches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as planned');
    }
  };

  const handleSelectAvatarFile = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setAvatarFile(f);
      setAvatarPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleSaveName = async () => {
    try {
      await axios.put('http://localhost:5000/api/users/profile', { name: editedName });
      await fetchUser();
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to save name', err);
      alert(err.response?.data?.message || 'Failed to save name');
    }
  };

  const handleSaveBio = async () => {
    try {
      await axios.put('http://localhost:5000/api/users/profile', { bio: editedBio });
      await fetchUser();
      setIsEditingBio(false);
    } catch (err) {
      console.error('Failed to save bio', err);
      alert(err.response?.data?.message || 'Failed to save bio');
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile) return;
    setUploadingProfile(true);
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      await axios.post('http://localhost:5000/api/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchUser();
      setShowNavbarAvatarPopup(false);
      setShowCardAvatarPopup(false);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
    } catch (err) {
      console.error('Failed to upload avatar', err);
      alert(err.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploadingProfile(false);
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="min-h-screen">
      {/* ─── NAVBAR ─── */}
      <nav className="sticky top-0 z-50 glass border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg flex items-center justify-center">
              <img src="Logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
              ShowUp<span style={{ color: '#0085C7' }}>2</span>Move
            </span>
          </div>


          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefreshMatches}
              disabled={loadingMatch}
              variant="outline"
              size="sm"
              className="gap-2 font-semibold"
              style={{ borderColor: '#0085C7', color: '#0085C7', background: 'rgba(0,133,199,0.06)' }}
            >
              {loadingMatch ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {loadingMatch ? 'Refreshing...' : 'Refresh Matches'}
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2 text-gray-600 hover:text-gray-900"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border p-4 z-50 max-h-96 overflow-y-auto">
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500">No notifications</p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map(n => (
                        <div key={n._id} className={`p-2 rounded-lg text-sm ${n.read ? 'bg-gray-50' : 'bg-blue-50'}`}>
                          <p>{n.message}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                            {!n.read && (
                              <Button size="sm" variant="ghost" onClick={() => handleMarkRead(n._id)} className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto">
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <Avatar
                className="w-9 h-9 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0085C7, #009F3D)' }}
                onClick={() => setShowNavbarAvatarPopup(!showNavbarAvatarPopup)}
              >
                {user?.avatar && <AvatarImage src={`http://localhost:5000${user.avatar}`} alt={user.name} />}
                <AvatarFallback className="text-sm font-bold text-white" style={{ background: 'transparent' }}>
                  {initials}
                </AvatarFallback>
              </Avatar>

              {showNavbarAvatarPopup && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border p-4 z-50">
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>Update Avatar</h3>
                  <div className="mb-2">
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleSelectAvatarFile} className="hidden" />
                        Choose Image
                      </label>
                    </Button>
                  </div>
                  {avatarPreviewUrl && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Preview:</p>
                      <img src={avatarPreviewUrl} alt="preview" className="w-16 h-16 rounded-full object-cover" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAvatar} disabled={uploadingProfile || !avatarFile} style={{ background: 'linear-gradient(135deg, #0085C7, #009F3D)', color: 'white' }}>
                      {uploadingProfile ? 'Uploading...' : 'Save'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNavbarAvatarPopup(false); setAvatarFile(null); setAvatarPreviewUrl(null); }} style={{ color: '#64748b' }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={logout} variant="ghost" size="sm" className="gap-2 text-sm"
              style={{ color: '#64748b' }}>
              <LogOut size={15} /> Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-7xl mx-auto px-6 py-10">

        {reminders.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={18} />
              <h3 className="font-semibold">Upcoming Reminders</h3>
            </div>
            <ul className="list-disc list-inside text-sm space-y-1">
              {reminders.map(r => (
                <li key={r._id}>
                  <strong>{r.sport?.name || r.sport}</strong> at {r.location?.name || 'Location TBD'} is coming up on {new Date(r.time).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}!
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── TOP SECTION: Welcome + Availability + Sports ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

          {/* Welcome Card */}
          <Card className="glass border-0 shadow-md animate-fade-in" style={{ borderRadius: '1rem' }}>
            <div className="olympic-border" />
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Avatar
                    className="w-14 h-14 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #0085C7 0%, #009F3D 100%)' }}
                    onClick={() => setShowCardAvatarPopup(!showCardAvatarPopup)}
                  >
                    {user?.avatar && <AvatarImage src={`http://localhost:5000${user.avatar}`} alt={user.name} />}
                    <AvatarFallback className="text-lg font-bold text-white" style={{ background: 'transparent' }}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {showCardAvatarPopup && (
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border p-4 z-50">
                      <h3 className="text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>Update Avatar</h3>
                      <div className="mb-2">
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" onChange={handleSelectAvatarFile} className="hidden" />
                            Choose Image
                          </label>
                        </Button>
                      </div>
                      {avatarPreviewUrl && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">Preview:</p>
                          <img src={avatarPreviewUrl} alt="preview" className="w-16 h-16 rounded-full object-cover" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveAvatar} disabled={uploadingProfile || !avatarFile} style={{ background: 'linear-gradient(135deg, #0085C7, #009F3D)', color: 'white' }}>
                          {uploadingProfile ? 'Uploading...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowCardAvatarPopup(false); setAvatarFile(null); setAvatarPreviewUrl(null); }} style={{ color: '#64748b' }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="h-8 text-lg font-bold"
                          style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveName} className="p-1 h-8 w-8">
                          <Check size={16} style={{ color: '#009F3D' }} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingName(false); setEditedName(user?.name || ''); }} className="p-1 h-8 w-8">
                          <X size={16} style={{ color: '#DF0024' }} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                          {user?.name}
                        </h2>
                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingName(true); setEditedName(user?.name || ''); }} className="p-1 h-6 w-6 text-gray-400 hover:text-gray-600">
                          <Pencil size={12} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* XP Bar Prototype */}
                  <div className="mt-2 mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-600">Level 5</span>
                      <span className="text-slate-500">450 / 1000 XP</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-green-500" style={{ width: '45%' }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {isEditingBio ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          value={editedBio}
                          onChange={(e) => setEditedBio(e.target.value)}
                          className="h-8 text-sm"
                          style={{ color: '#64748b' }}
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveBio} className="p-1 h-8 w-8">
                          <Check size={16} style={{ color: '#009F3D' }} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingBio(false); setEditedBio(user?.bio || ''); }} className="p-1 h-8 w-8">
                          <X size={16} style={{ color: '#DF0024' }} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm" style={{ color: '#64748b' }}>
                          {user?.bio || 'Ready to get moving?'}
                        </p>
                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingBio(true); setEditedBio(user?.bio || ''); }} className="p-1 h-6 w-6 text-gray-400 hover:text-gray-600">
                          <Pencil size={12} />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {isEditingLocation ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          value={editedCity}
                          onChange={(e) => setEditedCity(e.target.value)}
                          placeholder="City"
                          className="h-8 text-sm"
                          style={{ color: '#64748b' }}
                        />
                        <Input
                          value={editedCountry}
                          onChange={(e) => setEditedCountry(e.target.value)}
                          placeholder="Country"
                          className="h-8 text-sm"
                          style={{ color: '#64748b' }}
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveLocation} className="p-1 h-8 w-8">
                          <Check size={16} style={{ color: '#009F3D' }} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingLocation(false); setEditedCity(user?.city || ''); setEditedCountry(user?.country || ''); }} className="p-1 h-8 w-8">
                          <X size={16} style={{ color: '#DF0024' }} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm" style={{ color: '#64748b' }}>
                          <MapPin size={14} className="inline mr-1" />
                          {user?.city && user?.country ? `${user.city}, ${user.country}` : 'Set your location'}
                        </p>
                        <Button size="sm" variant="ghost" onClick={() => { setIsEditingLocation(true); setEditedCity(user?.city || ''); setEditedCountry(user?.country || ''); }} className="p-1 h-6 w-6 text-gray-400 hover:text-gray-600">
                          <Pencil size={12} />
                        </Button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              <Separator className="mb-5" style={{ background: 'rgba(0,0,0,0.08)' }} />

              <div>
                <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                  🏆 Are you available today?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleToggleAvailability(true)}
                    className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
                    style={{
                      background: availability ? '#009F3D' : 'rgba(0,159,61,0.08)',
                      color: availability ? 'white' : '#007a2f',
                      border: `2px solid ${availability ? '#009F3D' : 'rgba(0,159,61,0.3)'}`,
                      boxShadow: availability ? '0 4px 12px rgba(0,159,61,0.25)' : 'none',
                    }}
                  >
                    ✓ I'm In!
                  </button>
                  <button
                    onClick={() => handleToggleAvailability(false)}
                    className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
                    style={{
                      background: !availability ? '#DF0024' : 'rgba(223,0,36,0.08)',
                      color: !availability ? 'white' : '#DF0024',
                      border: `2px solid ${!availability ? '#DF0024' : 'rgba(223,0,36,0.3)'}`,
                      boxShadow: !availability ? '0 4px 12px rgba(223,0,36,0.25)' : 'none',
                    }}
                  >
                    ✗ Not Today
                  </button>
                </div>
                {availability && (
                  <p className="mt-3 text-xs text-center font-medium pulse-green py-2 rounded-lg"
                    style={{ color: '#007a2f', background: 'rgba(0,159,61,0.08)' }}>
                    🟢 You're in the matching pool!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sports Card */}
          <Card className="glass border-0 shadow-md animate-fade-in animate-delay-1 lg:col-span-2" style={{ borderRadius: '1rem' }}>
            <div className="olympic-border" />
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="flex items-center justify-between" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                <span className="flex items-center gap-2 text-lg">
                  <Zap size={20} style={{ color: '#b38f00' }} />
                  Your Sports
                </span>
                {!showSportForm && (
                  <Button onClick={() => setShowSportForm(true)} size="sm" className="gap-1.5 font-semibold cursor-pointer"
                    style={{ background: 'rgba(0,133,199,0.08)', color: '#0085C7', border: '1px solid rgba(0,133,199,0.25)' }}>
                    <Plus size={14} /> Add Sport
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {user?.sports?.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {user.sports.map((s, idx) => {
                    const skill = s.skillLevel || 'Beginner';
                    const colors = SKILL_COLORS[skill] || SKILL_COLORS.Beginner;
                    const ring = RING_COLORS[idx % RING_COLORS.length];
                    return (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                        style={{ background: `${ring}10`, borderColor: `${ring}30` }}>
                        <span className="font-medium text-sm capitalize" style={{ color: '#1e293b' }}>
                          {s.sport?.name || s.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: colors.bg, color: colors.text }}>
                          {skill}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="p-0.5 h-5 w-5 ml-1 text-gray-400 hover:text-red-500 rounded-full cursor-pointer"
                          onClick={() => handleRemoveSport(s.sport?._id || s._id)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !showSportForm && (
                  <p className="text-sm mb-4" style={{ color: '#64748b' }}>
                    No sports added yet. Add some sports to get matched with others!
                  </p>
                )
              )}

              {showSportForm && (
                <form onSubmit={handleAddSport} className="mt-2 p-4 rounded-xl"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
                  <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                    Add a New Sport
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1.5 relative">
                      <Label className="text-xs" style={{ color: '#64748b' }}>Sport Name</Label>
                      <Input 
                        placeholder="Search sports..." 
                        value={newSportName}
                        onChange={(e) => {
                          setNewSportName(e.target.value);
                          setShowSportDropdown(true);
                        }} 
                        required 
                        style={inputStyle} 
                        onFocus={() => setShowSportDropdown(true)}
                      />
                      {showSportDropdown && newSportName && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {allSports
                            .filter(sport => sport.name.toLowerCase().includes(newSportName.toLowerCase()))
                            .map((sport) => (
                              <div
                                key={sport._id}
                                className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer capitalize"
                                onMouseDown={() => {
                                  setNewSportName(sport.name);
                                  setShowSportDropdown(false);
                                }}
                              >
                                {sport.name}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs" style={{ color: '#64748b' }}>Skill Level</Label>
                      <select className="w-full h-9 px-3 rounded-md text-sm" style={inputStyle}
                        value={newSportSkill} onChange={(e) => setNewSportSkill(e.target.value)}>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Pro">Pro</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={addingSport || !allSports.some(sport => sport.name.toLowerCase() === newSportName.toLowerCase())} 
                      size="sm" 
                      className="font-semibold cursor-pointer"
                      style={{ 
                        background: (addingSport || !allSports.some(sport => sport.name.toLowerCase() === newSportName.toLowerCase())) 
                          ? '#cbd5e1' 
                          : 'linear-gradient(135deg, #0085C7, #009F3D)', 
                        color: (addingSport || !allSports.some(sport => sport.name.toLowerCase() === newSportName.toLowerCase())) 
                          ? '#64748b' 
                          : 'white', 
                        border: 'none' 
                      }}
                    >
                      {addingSport ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Sport'}
                    </Button>
                    <Button type="button" onClick={() => setShowSportForm(false)} size="sm" variant="ghost" className="cursor-pointer"
                      style={{ color: '#64748b' }}>
                      <X size={14} /> Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── CREATE EVENT SECTION ─── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,133,199,0.1)' }}>
                <CalendarPlus size={18} style={{ color: '#0085C7' }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                Create an Event
              </h2>
            </div>
            {!showEventForm && (
              <Button onClick={() => setShowEventForm(true)} className="gap-2 font-semibold cursor-pointer"
                style={{ background: 'black', color: 'white', border: 'none' }}>
                <Plus size={16} /> New Event
              </Button>
            )}
          </div>

          {showEventForm && (
            <Card className="glass border-0 shadow-md animate-fade-in" style={{ borderRadius: '1rem' }}>
              <div className="olympic-border" />
              <CardHeader className="pb-2 pt-6 px-6">
                <CardTitle className="flex items-center justify-between" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                  <span className="flex items-center gap-2 text-lg">
                    <Calendar size={20} style={{ color: '#0085C7' }} />
                    New Sports Event
                  </span>
                  <Button type="button" onClick={() => setShowEventForm(false)} size="sm" variant="ghost" className='cursor-pointer'
                    style={{ color: '#64748b' }}>
                    <X size={16} /> Close
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {eventSuccess && (
                  <div className="mb-4 p-3 rounded-lg text-sm font-medium"
                    style={{ background: 'rgba(0,159,61,0.1)', border: '1px solid rgba(0,159,61,0.3)', color: '#007a2f' }}>
                    {eventSuccess}
                  </div>
                )}
                <form onSubmit={handleCreateEvent} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 relative">
                      <Label className="text-sm font-medium" style={{ color: '#1e293b' }}>Sport *</Label>
                      <Input 
                        placeholder="Search sports..." 
                        value={eventForm.sport}
                        onChange={(e) => {
                          setEventForm({ ...eventForm, sport: e.target.value });
                          setShowEventSportDropdown(true);
                        }} 
                        required 
                        style={inputStyle} 
                        onFocus={() => setShowEventSportDropdown(true)}
                      />
                      {showEventSportDropdown && eventForm.sport && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {allSports
                            .filter(sport => sport.name.toLowerCase().includes(eventForm.sport.toLowerCase()))
                            .map((sport) => (
                              <div
                                key={sport._id}
                                className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer capitalize"
                                onMouseDown={() => {
                                  setEventForm({ ...eventForm, sport: sport.name });
                                  setShowEventSportDropdown(false);
                                }}
                              >
                                {sport.name}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" style={{ color: '#1e293b' }}>Location *</Label>
                      <Input placeholder="e.g. Central Park, City Stadium"
                        value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        required style={inputStyle} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" style={{ color: '#1e293b' }}>Date *</Label>
                      <Input type="date" value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        required style={inputStyle} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" style={{ color: '#1e293b' }}>Time *</Label>
                      <Input type="time" value={eventForm.time}
                        onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                        required style={inputStyle} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" style={{ color: '#1e293b' }}>Max Players</Label>
                      <Input type="number" min={2} max={50} value={eventForm.maxPlayers}
                        onChange={(e) => setEventForm({ ...eventForm, maxPlayers: e.target.value })}
                        style={inputStyle} />
                    </div>
                    <div className="space-y-1.5 md:col-span-1">
                      <Label className="text-sm font-medium" style={{ color: '#1e293b' }}>Description <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span></Label>
                      <Input placeholder="Any extra details..."
                        value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        style={inputStyle} />
                    </div>
                  </div>

                  <Separator style={{ background: 'rgba(0,0,0,0.06)' }} />

                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={creatingEvent || !allSports.some(sport => sport.name.toLowerCase() === eventForm.sport.toLowerCase())} 
                      className="font-semibold gap-2"
                      style={{ 
                        background: (creatingEvent || !allSports.some(sport => sport.name.toLowerCase() === eventForm.sport.toLowerCase())) 
                          ? '#cbd5e1' 
                          : 'linear-gradient(135deg, #0085C7, #009F3D)', 
                        color: (creatingEvent || !allSports.some(sport => sport.name.toLowerCase() === eventForm.sport.toLowerCase())) 
                          ? '#64748b' 
                          : 'white', 
                        border: 'none' 
                      }}
                    >
                      {creatingEvent
                        ? <><Loader2 size={15} className="animate-spin" /> Creating...</>
                        : <><CalendarPlus size={15} /> Create Event</>}
                    </Button>
                    <Button type="button" onClick={() => setShowEventForm(false)} variant="outline" className="font-semibold"
                      style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── MATCHES SECTION ─── */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(244,195,0,0.12)' }}>
              <Trophy size={18} style={{ color: '#b38f00' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
              Your Matches
            </h2>
            {matches.length > 0 && (
              <Badge style={{ background: 'rgba(0,133,199,0.1)', color: '#0085C7', border: '1px solid rgba(0,133,199,0.25)' }}>
                {matches.length}
              </Badge>
            )}
          </div>

          <div className="mb-6 flex gap-3 max-w-md">
            <Input 
              placeholder="Enter 6-char event code" 
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              style={inputStyle}
            />
            <Button onClick={handleJoinByCode} className="cursor-pointer" style={{ background: 'black', color: 'white' }}>
              Join by Code
            </Button>
          </div>

          {matches.length > 0 ? (
            <>
              {/* My Events Section */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                  Events I'm In
                </h3>
                {matches.filter(match => match.members.some(m => m._id === user?._id || m === user?._id)).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {matches
                      .filter(match => match.members.some(m => m._id === user?._id || m === user?._id))
                      .map((match, idx) => renderMatchCard(match, idx))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">You haven't joined any events yet.</p>
                )}
              </div>

              {/* Available Events Section */}
              <div>
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                  Events I Can Join
                </h3>
                {matches.filter(match => !match.members.some(m => m._id === user?._id || m === user?._id)).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {matches
                      .filter(match => !match.members.some(m => m._id === user?._id || m === user?._id))
                      .map((match, idx) => renderMatchCard(match, idx))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No available events to join right now.</p>
                )}
              </div>
            </>
          ) : (
            <Card className="glass border-0 shadow-md" style={{ borderRadius: '1rem' }}>
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(0,133,199,0.08)' }}>
                  <Users size={28} style={{ color: '#0085C7' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
                  No Matches Yet
                </h3>
                <p className="text-sm max-w-xs mx-auto" style={{ color: '#64748b' }}>
                  Set your availability to <strong style={{ color: '#007a2f' }}>I'm In!</strong> and click{' '}
                  <strong style={{ color: '#0085C7' }}>Find Match</strong> to get paired with athletes near you.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      {showAiPopup && aiPopupData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">AI Event Generated!</h3>
            </div>
            
            <p className="text-slate-600 mb-6">{aiPopupData.message}</p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowAiPopup(false)}
                className="px-4 py-2 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Refuse
              </Button>
              <Button 
                onClick={() => {
                  handleJoinByCode(aiPopupData.joinCode);
                  setShowAiPopup(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                Accept to Join
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-white border-l-4 border-[#0085C7] shadow-xl rounded flex items-center gap-3 px-4 py-3 min-w-[300px]">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#0085C7]">
              <Bell size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">{toastMessage}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
