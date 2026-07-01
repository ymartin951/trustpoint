import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { reportUser } from '../services/safetyService';
import { blockUser } from '../services/safetyService';

interface ReportModalProps {
  userId: string;
  userName: string;
  currentUserId: string;
  onClose: () => void;
}

export const ReportModal = ({ userId, userName, currentUserId, onClose }: ReportModalProps) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    setLoading(true);
    const { error } = await reportUser(currentUserId, userId, reason);
    setLoading(false);

    if (error) {
      alert('Failed to submit report');
    } else {
      alert('Report submitted successfully');
      onClose();
    }
  };

  const handleBlock = async () => {
    if (!confirm(`Block ${userName}?`)) return;

    setLoading(true);
    const { error } = await blockUser(currentUserId, userId);
    setLoading(false);

    if (error) {
      alert('Failed to block user');
    } else {
      alert('User blocked successfully');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flag className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Report User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Report {userName} for inappropriate behavior
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            rows={4}
            placeholder="Please describe the issue..."
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={handleReport}
            disabled={loading || !reason.trim()}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Report
          </button>
          <button
            onClick={handleBlock}
            disabled={loading}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Block User
          </button>
          <button
            onClick={onClose}
            className="w-full bg-white text-gray-700 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
