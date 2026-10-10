'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  Shuffle,
  Trash2,
  RefreshCw,
  LogOut,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  UserCheck,
  UserX,
  RotateCcw,
  LayoutGrid,
  List,
  Dices,
  Upload,
  FileText,
  Ticket,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  UserPlus,
  ShieldAlert,
  Shield,
  ShieldOff,
  Check,
  Flag,
  XCircle,
  Eye,
} from 'lucide-react';
import { Participant, PassHolder, CsvUploadSummary, Report, ReportStatus } from '@/lib/types';
import { ConfirmModal } from './ConfirmModal';
import { AddStudentModal } from './AddStudentModal';
import { ReportDetailsModal } from './ReportDetailsModal';
import { formatPhoneForDisplay, normalizePhone } from '@/lib/validation';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

export function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [deletingPassHolderId, setDeletingPassHolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'matched' | 'unmatched'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'teams' | 'passes' | 'reports'>('table');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Pass Holders State
  const [passHolders, setPassHolders] = useState<PassHolder[]>([]);
  const [passCounts, setPassCounts] = useState<{ total: number; active: number; noPass: number }>({
    total: 0,
    active: 0,
    noPass: 0,
  });
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'merge' | 'replace'>('merge');
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<CsvUploadSummary | null>(null);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [passSearchQuery, setPassSearchQuery] = useState('');
  const [passFilterStatus, setPassFilterStatus] = useState<'all' | 'active' | 'nopass'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reports State
  const [reports, setReports] = useState<Report[]>([]);
  const [reportCounts, setReportCounts] = useState<{ total: number; pending: number; resolved: number }>({
    total: 0,
    pending: 0,
    resolved: 0,
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportFilterStatus, setReportFilterStatus] = useState<'all' | 'pending' | 'investigating' | 'resolved' | 'dismissed'>('all');
  const [selectedReportForDetails, setSelectedReportForDetails] = useState<Report | null>(null);

  // Pass Check Toggle State
  const [passCheckEnabled, setPassCheckEnabled] = useState<boolean>(true);
  const [togglingPassCheck, setTogglingPassCheck] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeletePassHolder = async (holder: PassHolder) => {
    if (!window.confirm(`Are you sure you want to delete ${holder.name} (${holder.phone_normalized}) from pass holders?`)) {
      return;
    }
    const idOrPhone = holder.id || holder.phone_normalized;
    setDeletingPassHolderId(idOrPhone);
    try {
      const url = holder.id
        ? `/api/admin/pass-holders?id=${encodeURIComponent(holder.id)}`
        : `/api/admin/pass-holders?phone=${encodeURIComponent(holder.phone_normalized)}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-admin-token': token,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Deleted ${holder.name} from pass holders.`, 'success');
        await fetchPassHolders(true);
      } else {
        showToast(data.error || 'Failed to delete student.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error deleting student.', 'error');
    } finally {
      setDeletingPassHolderId(null);
    }
  };

  // Fetch participants with admin authorization
  const fetchParticipants = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/participants?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'x-admin-token': token,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (data.success && data.data?.participants) {
        setParticipants(data.data.participants);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, onLogout]);

  // Fetch pass holders and counts
  const fetchPassHolders = useCallback(async (silent = false) => {
    if (!silent) setLoadingPasses(true);
    try {
      const res = await fetch(`/api/admin/pass-holders?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'x-admin-token': token,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setPassHolders(data.passHolders || []);
        if (data.counts) {
          setPassCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load pass holders:', err);
    } finally {
      if (!silent) setLoadingPasses(false);
    }
  }, [token, onLogout]);

  // Handle CSV Upload
  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCsvFile) {
      showToast('Please select a CSV file first.', 'error');
      return;
    }

    if (selectedCsvFile.size > 2 * 1024 * 1024) {
      showToast('CSV file exceeds the 2 MB limit.', 'error');
      return;
    }

    setUploadingCsv(true);
    setUploadSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedCsvFile);
      formData.append('mode', uploadMode);

      const res = await fetch('/api/admin/pass-holders', {
        method: 'POST',
        headers: {
          'x-admin-token': token,
        },
        body: formData,
      });

      if (res.status === 401) {
        showToast('Admin session expired. Please log in again.', 'error');
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadSummary(data.summary);
        showToast(data.message || 'Pass CSV uploaded and processed successfully!', 'success');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setSelectedCsvFile(null);
        await fetchPassHolders(true);
      } else {
        showToast(data.error || 'Failed to process CSV file', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error uploading CSV', 'error');
    } finally {
      setUploadingCsv(false);
    }
  };

  // Fetch student reports and counts
  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) setLoadingReports(true);
    try {
      const res = await fetch(`/api/admin/reports?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'x-admin-token': token,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
        if (data.counts) {
          setReportCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      if (!silent) setLoadingReports(false);
    }
  }, [token, onLogout]);

  // Fetch current settings (pass check toggle)
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/settings?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'x-admin-token': token,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (data.success && data.settings) {
        setPassCheckEnabled(data.settings.passCheckEnabled);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, [token, onLogout]);

  // Toggle pass check on/off
  const handleTogglePassCheck = async () => {
    setTogglingPassCheck(true);
    try {
      const newValue = !passCheckEnabled;
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ passCheckEnabled: newValue }),
      });

      if (res.status === 401) {
        showToast('Admin session expired. Please re-enter passcode.', 'error');
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setPassCheckEnabled(data.settings.passCheckEnabled);
        showToast(data.message, data.settings.passCheckEnabled ? 'info' : 'success');
      } else {
        showToast(data.error || 'Failed to update setting.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error updating setting.', 'error');
    } finally {
      setTogglingPassCheck(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: ReportStatus) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ id: reportId, status }),
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Report marked as "${status}".`, 'success');
        await fetchReports(true);
      } else {
        showToast(data.error || 'Failed to update report status.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error updating report.', 'error');
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!window.confirm(`Are you sure you want to delete report for ${report.reported_phone}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/reports?id=${encodeURIComponent(report.id)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': token,
        },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Report deleted successfully.', 'success');
        await fetchReports(true);
      } else {
        showToast(data.error || 'Failed to delete report.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error deleting report.', 'error');
    }
  };

  // Initial load
  useEffect(() => {
    fetchParticipants();
    fetchPassHolders();
    fetchReports();
    fetchSettings();
  }, [fetchParticipants, fetchPassHolders, fetchReports, fetchSettings]);

  // Real-time channel or polling
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('public:participants:admin')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'participants' },
          () => {
            fetchParticipants(true);
          }
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    } else {
      // Auto-poll every 8s in dev/fallback mode (conservative to reduce server load with 1000+ students)
      const interval = setInterval(() => {
        fetchParticipants(true);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [fetchParticipants]);

  const matchingLockRef = useRef(false);
  const resettingLockRef = useRef(false);

  // Handle Match
  const handleRunMatch = async () => {
    if (matchingLockRef.current || matching) return;

    if (participants.length === 0) {
      showToast('No participants registered yet to match!', 'error');
      return;
    }

    matchingLockRef.current = true;
    setMatching(true);
    try {
      const res = await fetch('/api/admin/match', {
        method: 'POST',
        headers: {
          'x-admin-token': token,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        showToast('Admin session expired. Please re-enter passcode.', 'error');
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Paired teams with pure random assignment across the pool! 🎲`, 'success');
        if ((data.data?.pairs ?? 1) > 0) {
          setViewMode('teams');
        }
        await fetchParticipants();
      } else {
        showToast(data.error || 'Failed to execute matching', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error during matching', 'error');
    } finally {
      matchingLockRef.current = false;
      setMatching(false);
    }
  };

  // Handle Clear Data
  const handleClearData = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/admin/clear', {
        method: 'POST',
        headers: {
          'x-admin-token': token,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        showToast('Admin session expired. Please re-enter passcode.', 'error');
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setParticipants([]);
        showToast(data.message || 'Database wiped. All students reset!', 'success');
        setShowClearModal(false);
        await fetchParticipants(true);
      } else {
        showToast(data.error || 'Failed to clear database', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error during data clear', 'error');
    } finally {
      setClearing(false);
    }
  };

  // Handle Reset Matches back to queue
  const handleResetMatches = async () => {
    if (resettingLockRef.current || resetting) return;
    resettingLockRef.current = true;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-matches', {
        method: 'POST',
        headers: {
          'x-admin-token': token,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        showToast('Admin session expired. Please re-enter passcode.', 'error');
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Participants returned to queue!', 'success');
        setShowResetModal(false);
        await fetchParticipants();
      } else {
        showToast(data.error || 'Failed to reset matches', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error during reset', 'error');
    } finally {
      resettingLockRef.current = false;
      setResetting(false);
    }
  };

  // Calculate Metrics
  const totalCount = participants.length;
  const waitingCount = participants.filter((p) => p.status === 'waiting').length;
  const matchedCount = participants.filter((p) => p.status === 'matched').length;
  const unmatchedCount = participants.filter((p) => p.status === 'unmatched').length;
  const pairsCount = Math.floor(matchedCount / 2);

  // Map participants to easily find partner details
  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  // Compute distinct matched pairs (Teams)
  const matchedPairs = useMemo(() => {
    const seen = new Set<string>();
    const list: { teamNum: number; p1: Participant; p2: Participant }[] = [];
    let count = 1;

    for (const p of participants) {
      if (p.status === 'matched' && p.matched_with_id && !seen.has(p.id)) {
        const partner = participantMap.get(p.matched_with_id);
        if (partner) {
          seen.add(p.id);
          seen.add(partner.id);
          list.push({ teamNum: count++, p1: p, p2: partner });
        }
      }
    }
    return list;
  }, [participants, participantMap]);

  // Map participant ID to their assigned Team number
  const teamAssignmentMap = useMemo(() => {
    const map = new Map<string, number>();
    matchedPairs.forEach((pair) => {
      map.set(pair.p1.id, pair.teamNum);
      map.set(pair.p2.id, pair.teamNum);
    });
    return map;
  }, [matchedPairs]);

  // Map participant phone to Participant
  const participantByPhoneMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => {
      const norm = normalizePhone(p.phone);
      if (norm) map.set(norm, p);
      map.set(p.phone, p);
    });
    return map;
  }, [participants]);

  // Map pass holder phone to PassHolder
  const passHolderByPhoneMap = useMemo(() => {
    const map = new Map<string, PassHolder>();
    passHolders.forEach((h) => {
      if (h.phone_normalized) map.set(h.phone_normalized, h);
      if (h.phone) map.set(h.phone, h);
    });
    return map;
  }, [passHolders]);

  // Map phone to reports list for flagging across tables
  const reportsByPhoneMap = useMemo(() => {
    const map = new Map<string, Report[]>();
    reports.forEach((r) => {
      const p = r.reported_phone_normalized || normalizePhone(r.reported_phone);
      if (p) {
        const existing = map.get(p) || [];
        existing.push(r);
        map.set(p, existing);
      }
    });
    return map;
  }, [reports]);

  // Helper to retrieve all student details for a given phone
  const getStudentMatchDetails = useCallback((phone: string | undefined | null) => {
    if (!phone) return null;
    const norm = normalizePhone(phone);
    const participant = (norm ? participantByPhoneMap.get(norm) : null) || participantByPhoneMap.get(phone);
    const passHolder = (norm ? passHolderByPhoneMap.get(norm) : null) || passHolderByPhoneMap.get(phone);
    const partner = participant?.matched_with_id ? participantMap.get(participant.matched_with_id) : null;
    return { participant, passHolder, partner };
  }, [participantByPhoneMap, passHolderByPhoneMap, participantMap]);

  // Selected report full dossier details
  const selectedReportDossier = useMemo(() => {
    if (!selectedReportForDetails) return null;
    return {
      reported: getStudentMatchDetails(selectedReportForDetails.reported_phone_normalized || selectedReportForDetails.reported_phone),
      reporter: getStudentMatchDetails(selectedReportForDetails.reporter_phone),
    };
  }, [selectedReportForDetails, getStudentMatchDetails]);

  // Filtered & Searched list for Table view
  const filteredList = useMemo(() => {
    return participants.filter((p) => {
      // Filter tab
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesPhone = p.phone.toLowerCase().includes(query);
        return matchesName || matchesPhone;
      }

      return true;
    });
  }, [participants, filterStatus, searchQuery]);

  // Filtered pairs for Teams view
  const filteredPairs = useMemo(() => {
    if (!searchQuery.trim()) return matchedPairs;
    const q = searchQuery.toLowerCase();
    return matchedPairs.filter(
      (pair) =>
        pair.p1.name.toLowerCase().includes(q) ||
        pair.p1.phone.toLowerCase().includes(q) ||
        pair.p2.name.toLowerCase().includes(q) ||
        pair.p2.phone.toLowerCase().includes(q) ||
        `team ${pair.teamNum}`.includes(q)
    );
  }, [matchedPairs, searchQuery]);

  // Solo unmatched students (odd count leftover)
  const soloUnmatchedList = useMemo(() => {
    return participants.filter((p) => p.status === 'unmatched');
  }, [participants]);

  // Filtered & Searched Pass Holders
  const filteredPassHolders = useMemo(() => {
    return passHolders.filter((h) => {
      const isActive = Number(h.activity_passes) >= 1;
      if (passFilterStatus === 'active' && !isActive) return false;
      if (passFilterStatus === 'nopass' && isActive) return false;

      if (passSearchQuery.trim()) {
        const q = passSearchQuery.toLowerCase();
        const matchesName = (h.name || '').toLowerCase().includes(q);
        const matchesPhone =
          (h.phone || '').toLowerCase().includes(q) ||
          (h.phone_normalized || '').toLowerCase().includes(q);
        const matchesRegId = (h.registration_id || '').toLowerCase().includes(q);
        const matchesTeam = (h.team_name || '').toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesRegId || matchesTeam;
      }

      return true;
    });
  }, [passHolders, passFilterStatus, passSearchQuery]);

  // Filtered & Searched Reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (reportFilterStatus !== 'all' && r.status !== reportFilterStatus) return false;

      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase();
        const matchesPhone =
          (r.reported_phone || '').toLowerCase().includes(q) ||
          (r.reported_phone_normalized || '').toLowerCase().includes(q);
        const matchesReporter =
          (r.reporter_name || '').toLowerCase().includes(q) ||
          (r.reporter_phone || '').toLowerCase().includes(q);
        const matchesCategory = (r.category || '').toLowerCase().includes(q);
        const matchesDetails = (r.details || '').toLowerCase().includes(q);
        return matchesPhone || matchesReporter || matchesCategory || matchesDetails;
      }

      return true;
    });
  }, [reports, reportFilterStatus, reportSearchQuery]);

  return (
    <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '32px 20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 1000,
            background:
              toastMessage.type === 'success'
                ? '#059669'
                : toastMessage.type === 'error'
                ? '#dc2626'
                : '#0284c7',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '14px',
          }}
          className="animate-pop-in"
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Confirmation Modal for Clear Data */}
      <ConfirmModal
        isOpen={showClearModal}
        title="Wipe All Hackathon Records?"
        message="This action will permanently delete all registered participants from the database. Every student's screen will immediately reset back to the registration form in real-time."
        confirmText="Yes, Wipe Database"
        loading={clearing}
        onConfirm={handleClearData}
        onCancel={() => setShowClearModal(false)}
      />

      {/* Confirmation Modal for Reset Matches back to queue */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Return All Students to Queue?"
        message="This will unpair all current teams and reset everyone back to 'Waiting for match...'. Student registrations will NOT be deleted. You can click 'Match Again' whenever you are ready for the next round."
        confirmText="Reset to Queue"
        loading={resetting}
        onConfirm={handleResetMatches}
        onCancel={() => setShowResetModal(false)}
      />

      {/* Add Student to Pass Holders Modal */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        token={token}
        onSuccess={(_student, message) => {
          showToast(message, 'success');
          fetchPassHolders(true);
          fetchParticipants(true);
        }}
      />

      {/* Report Full Dossier Details Modal */}
      <ReportDetailsModal
        isOpen={Boolean(selectedReportForDetails)}
        onClose={() => setSelectedReportForDetails(null)}
        report={selectedReportForDetails}
        reportedDetails={selectedReportDossier?.reported ?? null}
        reporterDetails={selectedReportDossier?.reporter ?? null}
        onUpdateStatus={handleUpdateReportStatus}
        onDeleteReport={async (rep) => {
          await handleDeleteReport(rep);
          setSelectedReportForDetails(null);
        }}
      />

      {/* Admin Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              letterSpacing: '-0.5px',
            }}
          >
            Hackathon Admin Operations
          </h1>
          <p style={{ color: '#475569', fontSize: '14.5px', marginTop: '4px' }}>
            Control 1-to-1 matchmaking, multi-round pairing, and participant records.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              fetchParticipants();
              fetchPassHolders();
              fetchReports();
            }}
            className="btn-secondary"
            style={{ padding: '10px 16px' }}
            disabled={loading || loadingPasses || loadingReports}
            title="Refresh participant, pass holder, and report lists"
          >
            <RefreshCw size={15} className={loading || loadingPasses || loadingReports ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="btn-secondary"
            style={{ padding: '10px 16px', color: '#e11d48' }}
            title="Log out of admin session"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="glass-panel" style={{ padding: '20px 24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Registered
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="#4f46e5" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Active student pool
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Matched Pairs
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={16} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#059669' }}>
            {pairsCount} <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>({matchedCount} users)</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            1-to-1 pairings active
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Waiting In Queue
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#d97706' }}>
            {waitingCount}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Ready for matching run
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Odd Leftovers
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserX size={16} color="#e11d48" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: unmatchedCount > 0 ? '#e11d48' : '#94a3b8' }}>
            {unmatchedCount}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {totalCount % 2 !== 0 ? 'Odd pool: 1 unmatched' : 'Even pool: 0 leftovers'}
          </div>
        </div>

        {/* Reported Incidents Metric Card */}
        <div
          className="glass-panel"
          style={{
            padding: '20px 24px',
            background: reportCounts.pending > 0 ? '#fff1f2' : '#ffffff',
            border: reportCounts.pending > 0 ? '1.5px solid #fecdd3' : '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => setViewMode('reports')}
          title="Click to view all reported info and incident details"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: reportCounts.pending > 0 ? '#be123c' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Reported Incidents
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: reportCounts.pending > 0 ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={16} color={reportCounts.pending > 0 ? '#dc2626' : '#64748b'} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: reportCounts.pending > 0 ? '#dc2626' : '#0f172a' }}>
            {reportCounts.total}{' '}
            {reportCounts.pending > 0 && (
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#be123c', background: '#fee2e2', padding: '3px 8px', borderRadius: '999px', border: '1px solid #fecaca' }}>
                {reportCounts.pending} Pending
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: reportCounts.pending > 0 ? '#b91c1c' : '#64748b', marginTop: '4px', fontWeight: reportCounts.pending > 0 ? 600 : 400 }}>
            {reportCounts.total === 0 ? 'No reported incidents' : 'Click to inspect all info →'}
          </div>
        </div>
      </div>

      {/* Pending Reports Attention Alert Banner */}
      {reportCounts.pending > 0 && viewMode !== 'reports' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%)',
            border: '1.5px solid #fecdd3',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(225, 29, 72, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '6px', display: 'flex', color: '#dc2626' }}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <span style={{ fontWeight: 800, color: '#9f1239', fontSize: '14px' }}>
                {reportCounts.pending} Student Incident Report{reportCounts.pending > 1 ? 's' : ''} Pending Attention!
              </span>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#be123c' }}>
                Students reported issues with phone numbers, unresponsive partners, or attendance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('reports')}
            className="btn-danger"
            style={{ padding: '8px 18px', fontSize: '13px', background: '#dc2626', gap: '6px' }}
          >
            <ShieldAlert size={14} />
            <span>View All Reported Info ({reportCounts.total})</span>
          </button>
        </div>
      )}

      {/* Main Action Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          marginBottom: '28px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Match / Re-Match Button */}
          <button
            id="admin-match-btn"
            type="button"
            onClick={handleRunMatch}
            disabled={matching || totalCount < 2}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '14px 28px',
              fontSize: '15px',
              background: pairsCount > 0
                ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
                : 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            }}
          >
            <Shuffle size={18} className={matching ? 'animate-spin' : ''} />
            <span>
              {matching
                ? 'Re-Shuffling Pairs...'
                : pairsCount > 0
                ? 'Match Again (Next Round)'
                : 'Run 1-to-1 Matching'}
            </span>
          </button>

          {/* Reset to Queue Button */}
          {matchedCount > 0 && (
            <button
              id="admin-reset-matches-btn"
              type="button"
              onClick={() => setShowResetModal(true)}
              disabled={resetting || matching}
              className="btn-secondary"
              style={{ padding: '14px 20px', color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' }}
              title="Return students back to Waiting Queue without deleting records"
            >
              <RotateCcw size={16} className={resetting ? 'animate-spin' : ''} />
              <span>Reset to Queue</span>
            </button>
          )}

          {/* Add Student Button */}
          <button
            id="admin-add-student-btn"
            type="button"
            onClick={() => setShowAddStudentModal(true)}
            className="btn-secondary"
            style={{
              padding: '14px 22px',
              background: '#eef2ff',
              borderColor: '#c7d2fe',
              color: '#4f46e5',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            title="Add a new student to pass holders table"
          >
            <UserPlus size={16} />
            <span>Add Student</span>
          </button>

          {/* Clear Data Button */}
          <button
            id="admin-clear-data-btn"
            type="button"
            onClick={() => setShowClearModal(true)}
            disabled={clearing || totalCount === 0}
            className="btn-danger"
            style={{ padding: '14px 22px' }}
          >
            <Trash2 size={16} />
            <span>Clear All Data</span>
          </button>
        </div>

        <div style={{ fontSize: '13px', color: '#475569' }}>
          {totalCount >= 2 ? (
            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Sparkles size={14} /> Ready to pair {Math.floor(totalCount / 2)} teams {totalCount % 2 !== 0 ? '(+ 1 leftover)' : ''}
            </span>
          ) : (
            <span>Need at least 2 participants to run 1-to-1 pairing</span>
          )}
        </div>
      </div>

      {/* Pass Verification Toggle */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          marginBottom: '28px',
          background: passCheckEnabled ? '#f0fdf4' : '#fefce8',
          border: `1.5px solid ${passCheckEnabled ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: passCheckEnabled ? '#dcfce7' : '#fef9c3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}
          >
            {passCheckEnabled ? (
              <Shield size={20} color="#16a34a" />
            ) : (
              <ShieldOff size={20} color="#ca8a04" />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: passCheckEnabled ? '#166534' : '#854d0e',
                letterSpacing: '-0.2px',
              }}
            >
              Pass Verification: {passCheckEnabled ? 'ON' : 'OFF'}
            </div>
            <div
              style={{
                fontSize: '12.5px',
                color: passCheckEnabled ? '#15803d' : '#a16207',
                marginTop: '2px',
                lineHeight: '1.4',
              }}
            >
              {passCheckEnabled
                ? 'Only students with an active activity pass can register and join matching.'
                : 'Anyone can register and join matching — no pass required.'}
            </div>
          </div>
        </div>

        <button
          id="admin-pass-check-toggle"
          type="button"
          onClick={handleTogglePassCheck}
          disabled={togglingPassCheck}
          style={{
            position: 'relative',
            width: '56px',
            height: '30px',
            borderRadius: '999px',
            border: 'none',
            cursor: togglingPassCheck ? 'wait' : 'pointer',
            background: passCheckEnabled
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : '#d1d5db',
            transition: 'background 0.3s ease',
            flexShrink: 0,
            padding: 0,
            outline: 'none',
            boxShadow: passCheckEnabled
              ? '0 2px 8px rgba(34, 197, 94, 0.4)'
              : '0 1px 4px rgba(0,0,0,0.1)',
          }}
          title={passCheckEnabled ? 'Click to DISABLE pass verification' : 'Click to ENABLE pass verification'}
        >
          <div
            style={{
              position: 'absolute',
              top: '3px',
              left: passCheckEnabled ? '29px' : '3px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {togglingPassCheck ? (
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: '2px solid #d1d5db',
                  borderTopColor: '#6b7280',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            ) : passCheckEnabled ? (
              <Check size={12} color="#16a34a" strokeWidth={3} />
            ) : null}
          </div>
        </button>
      </div>

      {/* ============================================================== */}
      {/* PART 2: UPLOAD / UPDATE PASS CSV SECTION */}
      {/* ============================================================== */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          marginBottom: '28px',
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '-0.3px',
              }}
            >
              <Ticket size={20} color="#4f46e5" />
              <span>Upload / Update Pass CSV</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
              Import student activity passes to gate entry. Required headers:{' '}
              <strong style={{ color: '#334155' }}>Registration ID, Name, Phone, Activity Passes Added</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              id="csv-add-student-btn"
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="btn-secondary"
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                background: '#eef2ff',
                borderColor: '#c7d2fe',
                color: '#4f46e5',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Add a single student to pass holders"
            >
              <UserPlus size={14} />
              <span>Add Student</span>
            </button>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#059669',
                background: '#ecfdf5',
                padding: '5px 12px',
                borderRadius: '999px',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={13} /> Active Passes: {passCounts.active} / {passCounts.total}
            </span>
          </div>
        </div>

        <form onSubmit={handleCsvUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}>
            {/* Mode Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="csv-mode-select"
                style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}
              >
                Upload Mode
              </label>
              <select
                id="csv-mode-select"
                value={uploadMode}
                onChange={(e) => setUploadMode(e.target.value as any)}
                className="input-field"
                style={{ padding: '9px 14px', fontSize: '13.5px', minWidth: '220px', cursor: 'pointer' }}
                disabled={uploadingCsv}
              >
                <option value="merge">Update/merge (Default)</option>
                <option value="replace">Replace all (Wipe &amp; import)</option>
              </select>
            </div>

            {/* File Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '260px' }}>
              <label
                htmlFor="csv-file-input"
                style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}
              >
                Pass CSV File (.csv only, max 2 MB)
              </label>
              <input
                id="csv-file-input"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > 2 * 1024 * 1024) {
                    showToast('CSV file exceeds 2 MB limit.', 'error');
                    setSelectedCsvFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    return;
                  }
                  setSelectedCsvFile(file);
                }}
                disabled={uploadingCsv}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              />
            </div>

            {/* Upload Button */}
            <div>
              <button
                id="csv-upload-btn"
                type="submit"
                disabled={uploadingCsv || !selectedCsvFile}
                className="btn-primary"
                style={{
                  padding: '11px 24px',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  background: uploadMode === 'replace'
                    ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                }}
              >
                <Upload size={16} className={uploadingCsv ? 'animate-spin' : ''} />
                <span>{uploadingCsv ? 'Processing CSV...' : 'Upload'}</span>
              </button>
            </div>
          </div>

          {uploadMode === 'replace' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                color: '#be123c',
                fontSize: '12.5px',
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>
                <strong>Warning:</strong> &quot;Replace all&quot; will delete all existing pass holders in a single transaction and replace them with this file.
              </span>
            </div>
          )}
        </form>

        {/* Upload Summary Display */}
        {uploadSummary && (
          <div
            style={{
              marginTop: '20px',
              padding: '18px 20px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
            }}
            className="animate-pop-in"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  color: '#0f172a',
                  fontSize: '14.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={16} color="#059669" />
                Upload Summary ({uploadMode === 'replace' ? 'Replace All Mode' : 'Update/Merge Mode'})
              </span>
              <button
                type="button"
                onClick={() => setViewMode('passes')}
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#4f46e5',
                  background: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                View Pass Holders Table →
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total CSV Rows</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{uploadSummary.totalRows}</div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Inserted</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>{uploadSummary.inserted}</div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase' }}>Updated</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>{uploadSummary.updated}</div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 700, textTransform: 'uppercase' }}>Active Passes</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5' }}>{uploadSummary.activePassesCount}</div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>No Pass (0)</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#64748b' }}>{uploadSummary.noPassCount}</div>
              </div>
            </div>

            {/* Skipped Rows Reporting */}
            {uploadSummary.skipped.length > 0 && (
              <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#e11d48',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <AlertCircle size={14} />
                  <span>
                    {uploadSummary.skipped.length} Rows Skipped / Deduplicated (Click to {showSkippedDetails ? 'hide' : 'view'} details)
                  </span>
                  {showSkippedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showSkippedDetails && (
                  <div
                    style={{
                      marginTop: '8px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      background: '#ffffff',
                      border: '1px solid #fecdd3',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}
                  >
                    {uploadSummary.skipped.map((skip, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          padding: '4px 0',
                          borderBottom: sIdx < uploadSummary.skipped.length - 1 ? '1px solid #f1f5f9' : 'none',
                          color: '#475569',
                        }}
                      >
                        <strong style={{ color: '#be123c' }}>Row {skip.row}:</strong> {skip.reason}{' '}
                        {skip.phone && <span style={{ fontFamily: 'monospace', color: '#4f46e5' }}>({skip.phone})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and Filter Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
          <span
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
            }}
          >
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder={
              viewMode === 'reports'
                ? 'Search reported phone, reporter, reason...'
                : viewMode === 'passes'
                ? 'Search pass holder by name or phone...'
                : viewMode === 'teams'
                ? "Search team member or 'Team 1'..."
                : 'Search name or phone...'
            }
            value={
              viewMode === 'reports'
                ? reportSearchQuery
                : viewMode === 'passes'
                ? passSearchQuery
                : searchQuery
            }
            onChange={(e) => {
              if (viewMode === 'reports') {
                setReportSearchQuery(e.target.value);
              } else if (viewMode === 'passes') {
                setPassSearchQuery(e.target.value);
              } else {
                setSearchQuery(e.target.value);
              }
            }}
            className="input-field"
            style={{ paddingLeft: '40px', paddingBlock: '10px', fontSize: '14px' }}
          />
        </div>

        {/* View Mode Toggle and Filter Pills */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '999px',
              padding: '3px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={14} />
              <span>All Participants ({totalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('teams')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'teams' ? '#4f46e5' : 'transparent',
                color: viewMode === 'teams' ? '#ffffff' : '#64748b',
                boxShadow: viewMode === 'teams' ? '0 1px 3px rgba(79,70,229,0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={14} />
              <span>Matched Teams ({matchedPairs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('passes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'passes' ? '#4f46e5' : 'transparent',
                color: viewMode === 'passes' ? '#ffffff' : '#64748b',
                boxShadow: viewMode === 'passes' ? '0 1px 3px rgba(79,70,229,0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Ticket size={14} />
              <span>Pass Holders ({passCounts.total})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'reports' ? '#dc2626' : 'transparent',
                color: viewMode === 'reports' ? '#ffffff' : '#64748b',
                boxShadow: viewMode === 'reports' ? '0 1px 3px rgba(220,38,38,0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ShieldAlert size={14} />
              <span>Reports ({reportCounts.total})</span>
              {reportCounts.pending > 0 && (
                <span
                  style={{
                    marginLeft: '2px',
                    background: viewMode === 'reports' ? '#fee2e2' : '#dc2626',
                    color: viewMode === 'reports' ? '#dc2626' : '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}
                >
                  {reportCounts.pending}
                </span>
              )}
            </button>
          </div>

          {/* Filter Pills for Reports */}
          {viewMode === 'reports' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'all', label: `All (${reportCounts.total})` },
                  { id: 'pending', label: `Pending (${reportCounts.pending})` },
                  { id: 'investigating', label: 'Investigating' },
                  { id: 'resolved', label: `Resolved (${reportCounts.resolved})` },
                  { id: 'dismissed', label: 'Dismissed' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setReportFilterStatus(f.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.2s ease',
                    background: reportFilterStatus === f.id ? '#fee2e2' : '#ffffff',
                    borderColor: reportFilterStatus === f.id ? '#fca5a5' : '#e2e8f0',
                    color: reportFilterStatus === f.id ? '#dc2626' : '#64748b',
                    boxShadow: reportFilterStatus === f.id ? '0 1px 3px rgba(220, 38, 38, 0.15)' : 'none',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Filter Pills for Pass Holders */}
          {viewMode === 'passes' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'all', label: `All (${passCounts.total})` },
                  { id: 'active', label: `Active Pass: Yes (${passCounts.active})` },
                  { id: 'nopass', label: `No Pass: No (${passCounts.noPass})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPassFilterStatus(f.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.2s ease',
                    background: passFilterStatus === f.id ? '#eef2ff' : '#ffffff',
                    borderColor: passFilterStatus === f.id ? '#c7d2fe' : '#e2e8f0',
                    color: passFilterStatus === f.id ? '#4f46e5' : '#64748b',
                    boxShadow: passFilterStatus === f.id ? '0 1px 3px rgba(79, 70, 229, 0.15)' : 'none',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Filter Pills for Table view */}
          {viewMode === 'table' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['all', 'waiting', 'matched', 'unmatched'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s ease',
                    background:
                      filterStatus === status
                        ? '#eef2ff'
                        : '#ffffff',
                    borderColor:
                      filterStatus === status ? '#c7d2fe' : '#e2e8f0',
                    color: filterStatus === status ? '#4f46e5' : '#64748b',
                    boxShadow: filterStatus === status ? '0 1px 3px rgba(79, 70, 229, 0.15)' : 'none',
                  }}
                >
                  {status} ({status === 'all' ? totalCount : status === 'waiting' ? waitingCount : status === 'matched' ? matchedCount : unmatchedCount})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VIEW RENDERING */}
      {viewMode === 'passes' ? (
        /* VIEW MODE 3: PASS HOLDERS TABLE */
        <div className="glass-panel" style={{ overflow: 'hidden', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          {loadingPasses && passHolders.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid rgba(79, 70, 229, 0.2)',
                  borderTopColor: '#4f46e5',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px auto',
                }}
              />
              <p>Loading pass holders...</p>
            </div>
          ) : filteredPassHolders.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <Ticket size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                {passHolders.length === 0 ? 'No pass holders imported yet' : 'No matching pass holders found'}
              </p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                {passHolders.length === 0
                  ? 'Upload a CSV above or click "Add Student" to create individual records!'
                  : 'Try adjusting your search query or filter tab.'}
              </p>
              <button
                id="passes-empty-add-student-btn"
                type="button"
                onClick={() => setShowAddStudentModal(true)}
                className="btn-primary"
                style={{
                  width: 'auto',
                  margin: '18px auto 0 auto',
                  padding: '10px 22px',
                  fontSize: '13.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <UserPlus size={16} />
                <span>Add Student to Table</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Pass Holders Table Header Toolbar */}
              <div
                style={{
                  padding: '14px 20px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                  Showing {filteredPassHolders.length} of {passCounts.total} Pass Holders
                </span>
                <button
                  id="passes-table-toolbar-add-btn"
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '8px 18px',
                    fontSize: '13px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <UserPlus size={15} />
                  <span>Add Student</span>
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Pass Holder
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Phone (Normalized)
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Active Pass
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Activity Passes
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Food Tokens
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Registration ID
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Team / College / Branch
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPassHolders.map((h, hIdx) => {
                      const isActive = Number(h.activity_passes) >= 1;
                      const isDeleting = deletingPassHolderId === (h.id || h.phone_normalized);

                      return (
                        <tr
                          key={h.id || `pass-${hIdx}`}
                          style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                        >
                          {/* Name */}
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14.5px' }}>{h.name}</div>
                              {reportsByPhoneMap.get(h.phone_normalized) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportSearchQuery(h.phone_normalized);
                                    setViewMode('reports');
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 7px',
                                    borderRadius: '999px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    cursor: 'pointer',
                                  }}
                                  title="Student has reports filed. Click to view all reports."
                                >
                                  <ShieldAlert size={11} />
                                  <span>Reported ({reportsByPhoneMap.get(h.phone_normalized)!.length})</span>
                                </button>
                              )}
                            </div>
                            {h.email && <div style={{ fontSize: '12px', color: '#64748b' }}>{h.email}</div>}
                          </td>

                          {/* Phone */}
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontFamily: 'monospace', color: '#4f46e5', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Phone size={13} color="#94a3b8" />
                              <span>{h.phone_normalized}</span>
                            </div>
                            {h.phone && h.phone !== h.phone_normalized && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                raw: {h.phone}
                              </div>
                            )}
                          </td>

                          {/* Active Pass: Yes/No */}
                          <td style={{ padding: '16px 20px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: isActive ? '#ecfdf5' : '#f1f5f9',
                                color: isActive ? '#059669' : '#64748b',
                                border: `1px solid ${isActive ? '#a7f3d0' : '#e2e8f0'}`,
                              }}
                            >
                              {isActive ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                              {isActive ? 'Yes' : 'No'}
                            </span>
                          </td>

                          {/* Activity Passes Count */}
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: isActive ? '#059669' : '#64748b' }}>
                              {h.activity_passes}
                            </span>
                          </td>

                          {/* Food Tokens */}
                          <td style={{ padding: '16px 20px', fontSize: '14px', color: '#334155' }}>
                            {h.food_tokens ?? 0}
                          </td>

                          {/* Registration ID */}
                          <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: '13px', color: '#64748b' }}>
                            {h.registration_id || '—'}
                          </td>

                          {/* Team / College / Branch */}
                          <td style={{ padding: '16px 20px', fontSize: '13px', color: '#475569' }}>
                            <div>{h.team_name ? <strong>{h.team_name}</strong> : '—'}</div>
                            {h.role && (
                              <div style={{ fontSize: '11.5px', color: '#4f46e5', fontWeight: 600 }}>
                                {h.role}
                              </div>
                            )}
                            {(h.college || h.branch) && (
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                {[h.branch, h.college].filter(Boolean).join(' • ')}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleDeletePassHolder(h)}
                              disabled={isDeleting}
                              style={{
                                background: '#fff1f2',
                                border: '1px solid #fecdd3',
                                color: '#e11d48',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title={`Delete ${h.name} from pass holders`}
                            >
                              <Trash2 size={13} className={isDeleting ? 'animate-spin' : ''} />
                              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'teams' ? (
        <div>
          {/* Solo Reserve Banner if odd registration count */}
          {soloUnmatchedList.length > 0 && (
            <div
              style={{
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: '12px',
                padding: '14px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserX size={18} color="#e11d48" />
                <div>
                  <span style={{ fontWeight: 800, color: '#9f1239', fontSize: '13px' }}>
                    Solo Reserve Student (Odd Participant Count):
                  </span>
                  <span style={{ marginLeft: '8px', color: '#881337', fontWeight: 600, fontSize: '14px' }}>
                    {soloUnmatchedList[0].name} ({formatPhoneForDisplay(soloUnmatchedList[0].phone)})
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '12px', color: '#be123c', fontWeight: 600 }}>
                Will automatically be paired in Round 2 when more students join!
              </span>
            </div>
          )}

          {loading && participants.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', background: '#fff' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid rgba(79, 70, 229, 0.2)',
                  borderTopColor: '#4f46e5',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px auto',
                }}
              />
              <p>Loading teams...</p>
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', background: '#fff', border: '1px solid #e2e8f0' }}>
              <Users size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                {matchedPairs.length === 0 ? 'No matched teams yet' : 'No teams match your search'}
              </p>
              <p style={{ fontSize: '14px', marginTop: '6px' }}>
                {matchedPairs.length === 0
                  ? 'Click "Run 1-to-1 Matching" above to pair all waiting students randomly!'
                  : 'Try searching by a different name, phone, or "Team 1"'}
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                  Showing {filteredPairs.length} of {matchedPairs.length} Teams
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Dices size={13} /> 100% Cryptographic Random 1-to-1 Assignment
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '16px',
                }}
              >
                {filteredPairs.map((pair) => (
                  <div
                    key={`team-${pair.teamNum}`}
                    className="glass-panel"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e0e7ff',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <span
                        style={{
                          background: '#eef2ff',
                          color: '#4f46e5',
                          fontWeight: 800,
                          fontSize: '13px',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Users size={14} /> Team #{pair.teamNum}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {((reportsByPhoneMap.get(normalizePhone(pair.p1.phone))?.length ?? 0) > 0 ||
                          (reportsByPhoneMap.get(normalizePhone(pair.p2.phone))?.length ?? 0) > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              const ph =
                                (reportsByPhoneMap.get(normalizePhone(pair.p1.phone))?.length ?? 0) > 0
                                  ? pair.p1.phone
                                  : pair.p2.phone;
                              setReportSearchQuery(ph);
                              setViewMode('reports');
                            }}
                            style={{
                              fontSize: '11px',
                              color: '#dc2626',
                              fontWeight: 800,
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                            title="A partner in this team was reported. Click to view."
                          >
                            <ShieldAlert size={11} />
                            <span>Reported</span>
                          </button>
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#059669',
                            fontWeight: 700,
                            background: '#ecfdf5',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Dices size={12} /> Paired
                        </span>
                      </div>
                    </div>

                    {/* Member 1 & 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Member 1 */}
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{pair.p1.name}</div>
                          <div style={{ fontSize: '12px', color: '#4f46e5', fontFamily: 'monospace' }}>
                            {formatPhoneForDisplay(pair.p1.phone)}
                          </div>
                        </div>
                        <a
                          href={`tel:${pair.p1.phone}`}
                          style={{
                            color: '#059669',
                            background: '#ecfdf5',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Call student"
                        >
                          <Phone size={14} />
                        </a>
                      </div>

                      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
                        🤝 PAIRED WITH
                      </div>

                      {/* Member 2 */}
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{pair.p2.name}</div>
                          <div style={{ fontSize: '12px', color: '#4f46e5', fontFamily: 'monospace' }}>
                            {formatPhoneForDisplay(pair.p2.phone)}
                          </div>
                        </div>
                        <a
                          href={`tel:${pair.p2.phone}`}
                          style={{
                            color: '#059669',
                            background: '#ecfdf5',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Call student"
                        >
                          <Phone size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'reports' ? (
        /* VIEW MODE 4: REPORTS TABLE */
        <div className="glass-panel" style={{ overflow: 'hidden', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          {loadingReports && reports.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid rgba(220, 38, 38, 0.2)',
                  borderTopColor: '#dc2626',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px auto',
                }}
              />
              <p>Loading student reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <ShieldAlert size={40} style={{ margin: '0 auto 12px auto', opacity: 0.35, color: '#dc2626' }} />
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                {reports.length === 0 ? 'No reports submitted yet' : 'No matching reports found'}
              </p>
              <p style={{ fontSize: '13.5px', marginTop: '6px', color: '#64748b' }}>
                {reports.length === 0
                  ? 'When students submit reports about unreachable partners or issues via the student portal, they will appear here in real time.'
                  : 'Try selecting a different filter status or clearing your search term.'}
              </p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  background: '#fef2f2',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={16} color="#dc2626" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b' }}>
                    Showing {filteredReports.length} of {reports.length} Student Incident Reports
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c' }}>
                  {reportCounts.pending} Pending Attention • {reportCounts.resolved} Resolved
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Reported Student & Phone
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Category
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', minWidth: '220px' }}>
                        Details / Statement
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Reported By (Complainant)
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Status
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Submitted At
                      </th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((r) => {
                      const categoryLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
                        unresponsive: { label: 'Unresponsive Partner', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
                        wrong_number: { label: 'Wrong / Fake Number', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                        absent: { label: 'Absent / Left Event', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
                        inappropriate: { label: 'Inappropriate Behavior', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
                        other: { label: 'Other Incident', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
                      };

                      const catMeta = categoryLabels[r.category] || {
                        label: r.category,
                        bg: '#f1f5f9',
                        color: '#475569',
                        border: '#cbd5e1',
                      };

                      const reportedInfo = getStudentMatchDetails(r.reported_phone_normalized || r.reported_phone);
                      const reporterInfo = getStudentMatchDetails(r.reporter_phone);
                      const isTeammate = Boolean(
                        reportedInfo?.partner?.phone &&
                          r.reporter_phone &&
                          (reportedInfo.partner.phone === r.reporter_phone ||
                            normalizePhone(reportedInfo.partner.phone) === normalizePhone(r.reporter_phone))
                      );

                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#fcfdfe')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                        >
                          {/* Reported Student & Number */}
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14.5px' }}>
                                {reportedInfo?.participant?.name || reportedInfo?.passHolder?.name || 'Unknown Student'}
                              </div>
                              {reportedInfo?.passHolder?.team_name && (
                                <span style={{ fontSize: '11px', fontWeight: 700, background: '#eef2ff', color: '#4f46e5', padding: '1px 7px', borderRadius: '4px', border: '1px solid #c7d2fe' }}>
                                  {reportedInfo.passHolder.team_name}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#dc2626', fontSize: '13.5px' }}>
                                {formatPhoneForDisplay(r.reported_phone_normalized || r.reported_phone)}
                              </span>
                              <a
                                href={`tel:${r.reported_phone_normalized || r.reported_phone}`}
                                style={{
                                  color: '#059669',
                                  background: '#ecfdf5',
                                  padding: '3px 6px',
                                  borderRadius: '5px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  border: '1px solid #a7f3d0',
                                }}
                                title="Call reported phone to verify"
                              >
                                <Phone size={12} />
                              </a>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                              {reportedInfo?.passHolder?.registration_id && (
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                                  {reportedInfo.passHolder.registration_id}
                                </span>
                              )}
                              {reportedInfo?.participant?.status === 'matched' ? (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>
                                  🤝 Paired with {reportedInfo.partner?.name || 'Partner'}
                                </span>
                              ) : reportedInfo?.participant?.status === 'waiting' ? (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '1px 6px', borderRadius: '4px' }}>
                                  ⏳ In Waiting Queue
                                </span>
                              ) : null}
                              {Number(reportedInfo?.passHolder?.activity_passes) > 0 && (
                                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 5px', borderRadius: '4px' }}>
                                  Passes: {reportedInfo?.passHolder?.activity_passes}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td style={{ padding: '16px 20px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: catMeta.bg,
                                color: catMeta.color,
                                border: `1px solid ${catMeta.border}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {catMeta.label}
                            </span>
                          </td>

                          {/* Details / Statement */}
                          <td style={{ padding: '16px 20px', maxWidth: '300px' }}>
                            <div
                              style={{
                                fontSize: '13px',
                                color: '#1e293b',
                                lineHeight: '1.5',
                                background: '#f8fafc',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                wordBreak: 'break-word',
                              }}
                            >
                              {r.details || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No additional details provided</span>}
                            </div>
                          </td>

                          {/* Reported By (Complainant) */}
                          <td style={{ padding: '16px 20px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                                  {r.reporter_name || reporterInfo?.participant?.name || reporterInfo?.passHolder?.name || 'Anonymous Student'}
                                </div>
                                {isTeammate && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      background: '#fee2e2',
                                      color: '#be123c',
                                      border: '1px solid #fecaca',
                                      padding: '1px 6px',
                                      borderRadius: '999px',
                                    }}
                                    title="Reporter is the assigned partner of this student"
                                  >
                                    ⚡ Partner
                                  </span>
                                )}
                              </div>
                              {r.reporter_phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#4f46e5' }}>
                                    {formatPhoneForDisplay(r.reporter_phone)}
                                  </span>
                                  <a
                                    href={`tel:${r.reporter_phone}`}
                                    style={{
                                      color: '#059669',
                                      background: '#ecfdf5',
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      border: '1px solid #a7f3d0',
                                    }}
                                    title="Call reporter"
                                  >
                                    <Phone size={10} />
                                  </a>
                                </div>
                              )}
                              {reporterInfo?.passHolder?.team_name && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  Team: {reporterInfo.passHolder.team_name}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '16px 20px' }}>
                            {r.status === 'resolved' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  border: '1px solid #a7f3d0',
                                }}
                              >
                                <CheckCircle2 size={13} /> Resolved
                              </span>
                            ) : r.status === 'investigating' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                }}
                              >
                                <Search size={13} /> Investigating
                              </span>
                            ) : r.status === 'dismissed' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  border: '1px solid #cbd5e1',
                                }}
                              >
                                <XCircle size={13} /> Dismissed
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  background: '#fffbeb',
                                  color: '#d97706',
                                  border: '1px solid #fde68a',
                                }}
                              >
                                <Clock size={13} /> Pending
                              </span>
                            )}
                          </td>

                          {/* Created At */}
                          <td style={{ padding: '16px 20px', fontSize: '12.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {new Date(r.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                              {/* View All Info Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedReportForDetails(r)}
                                style={{
                                  background: '#eef2ff',
                                  border: '1px solid #c7d2fe',
                                  color: '#4f46e5',
                                  padding: '5px 11px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  transition: 'all 0.15s ease',
                                }}
                                title="View complete incident dossier and all student information"
                              >
                                <Eye size={13} />
                                <span>View All Info</span>
                              </button>

                              {r.status !== 'resolved' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReportStatus(r.id, 'resolved')}
                                  style={{
                                    background: '#ecfdf5',
                                    border: '1px solid #a7f3d0',
                                    color: '#059669',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Mark as resolved"
                                >
                                  <Check size={12} />
                                  <span>Resolve</span>
                                </button>
                              )}

                              {r.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReportStatus(r.id, 'investigating')}
                                  style={{
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#2563eb',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Mark as under investigation"
                                >
                                  <Search size={12} />
                                  <span>Investigate</span>
                                </button>
                              )}

                              {r.status !== 'dismissed' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReportStatus(r.id, 'dismissed')}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    color: '#64748b',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Dismiss report"
                                >
                                  <XCircle size={12} />
                                  <span>Dismiss</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteReport(r)}
                                style={{
                                  background: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  color: '#e11d48',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transition: 'all 0.15s ease',
                                }}
                                title="Permanently delete report"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: ALL PARTICIPANTS TABLE */
        <div className="glass-panel" style={{ overflow: 'hidden', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          {loading && participants.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid rgba(79, 70, 229, 0.2)',
                  borderTopColor: '#4f46e5',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px auto',
                }}
              />
              <p>Loading participants list...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <Users size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                {participants.length === 0 ? 'No participants registered yet' : 'No matching participants found'}
              </p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                {participants.length === 0
                  ? 'Send the landing page link to students to start collecting registrations!'
                  : 'Try adjusting your search query or filter tab.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Participant
                    </th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Phone Number
                    </th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Status
                    </th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Paired Partner
                    </th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Registered At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((p) => {
                    const partner = p.matched_with_id ? participantMap.get(p.matched_with_id) : null;
                    const teamNum = teamAssignmentMap.get(p.id);

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        {/* Name */}
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                              {p.name}
                            </div>
                            {teamNum && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  background: '#eef2ff',
                                  color: '#4f46e5',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  border: '1px solid #c7d2fe',
                                }}
                              >
                                Team #{teamNum}
                              </span>
                            )}
                            {reportsByPhoneMap.get(normalizePhone(p.phone)) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReportSearchQuery(p.phone);
                                  setViewMode('reports');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  cursor: 'pointer',
                                }}
                                title="This student has been reported. Click to view all reported info."
                              >
                                <ShieldAlert size={12} />
                                <span>Reported ({reportsByPhoneMap.get(normalizePhone(p.phone))!.length})</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Phone */}
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontFamily: 'monospace', color: '#4f46e5', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} color="#94a3b8" />
                            <span>{formatPhoneForDisplay(p.phone)}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            className={`badge ${
                              p.status === 'matched'
                                ? 'badge-matched'
                                : p.status === 'unmatched'
                                ? 'badge-unmatched'
                                : 'badge-waiting'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        {/* Paired Partner */}
                        <td style={{ padding: '16px 20px' }}>
                          {p.status === 'matched' && partner ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                                {partner.name}
                              </div>
                              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                                {formatPhoneForDisplay(partner.phone)}
                              </div>
                            </div>
                          ) : p.status === 'unmatched' ? (
                            <span style={{ fontSize: '13px', color: '#e11d48', fontWeight: 600 }}>
                              Solo Reserve (Odd Count)
                            </span>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                              Waiting for match run
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-dim)' }}>
                          {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
