import { useState } from "react";
import { useAuth } from "../../auth";
import { authApi } from "../../auth/api";

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, updateUser } = useAuth();

  const [editedName, setEditedName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = editedName.trim() !== user?.name;

  const handleSave = async () => {
    if (!editedName.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const result = await authApi.updateMe({ name: editedName.trim() });
      updateUser({ name: result.user.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Profile</h2>
          <button onClick={onClose} className="btn-close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              disabled={saving}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <p className="profile-id">ID: {user?.id}</p>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-save"
            disabled={saving || !hasChanges || !editedName.trim()}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
