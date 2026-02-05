import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth";
import { inventoryApi, type UserInfo } from "../../api";

interface InventorySettingsModalProps {
  onClose: () => void;
}

export function InventorySettingsModal({ onClose }: InventorySettingsModalProps) {
  const { inventories, currentInventoryId, removeInventory } = useAuth();

  const [availableUsers, setAvailableUsers] = useState<UserInfo[]>([]);
  const [members, setMembers] = useState<UserInfo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentInventory = inventories.find((i) => i.id === currentInventoryId);
  const isOwner = currentInventory?.isOwner ?? false;
  const name = currentInventory?.name ?? "Inventory";

  const loadData = useCallback(async () => {
    if (!isOwner || !currentInventoryId) return;

    setLoading(true);
    try {
      const [membersRes, usersRes] = await Promise.all([
        inventoryApi.getMembers(currentInventoryId),
        inventoryApi.getPossibleMembers(currentInventoryId),
      ]);
      setMembers(membersRes.members);
      setAvailableUsers(usersRes.users);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [isOwner, currentInventoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddMember = async () => {
    if (!currentInventoryId || !selectedUserId) {
      setError("Please select a user");
      return;
    }

    try {
      await inventoryApi.addMember(currentInventoryId, selectedUserId);
      setSelectedUserId("");
      setError(null);
      setSuccess("Member added");
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
      setSuccess(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentInventoryId) return;

    try {
      await inventoryApi.removeMember(currentInventoryId, userId);
      setError(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleDelete = async () => {
    if (!currentInventoryId) return;

    try {
      await inventoryApi.delete(currentInventoryId);
      removeInventory(currentInventoryId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete inventory");
    }
  };

  const handleLeave = async () => {
    // For non-owners, "leaving" is implemented by the owner removing them
    // For now, we just close - in a real app we'd need an API endpoint for this
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Inventory Settings</h2>
          <button onClick={onClose} className="btn-close">
            ×
          </button>
        </div>

        <div className="inventory-settings-content">
          <div className="settings-section">
            <h3>{name}</h3>
            <p className="settings-meta">
              {isOwner ? "You own this inventory" : "Shared with you"}
            </p>
            <p className="settings-id">ID: {currentInventoryId}</p>
          </div>

          {isOwner && (
            <div className="settings-section">
              <h4>Members</h4>
              {members.length > 0 && (
                <ul className="members-list">
                  {members.map((member) => (
                    <li key={member.id} className="member-item">
                      <span className="member-name">{member.name}</span>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="btn-remove-member"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="add-member-form">
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    setError(null);
                  }}
                  className="share-select"
                  disabled={loading || availableUsers.length === 0}
                >
                  <option value="">
                    {loading ? "Loading..." : availableUsers.length === 0 ? "No users to add" : "Add a member..."}
                  </option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddMember}
                  className="btn-share"
                  disabled={loading || !selectedUserId}
                >
                  Add
                </button>
              </div>

              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}
            </div>
          )}

          <div className="settings-section settings-danger-zone">
            {isOwner ? (
              <>
                <h4>Danger zone</h4>
                {showDeleteConfirm ? (
                  <div className="delete-confirm">
                    <span>Delete this inventory and all its items?</span>
                    <button onClick={handleDelete} className="btn-delete-confirm">
                      Yes, Delete
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)} className="btn-cancel">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-delete"
                  >
                    Delete Inventory
                  </button>
                )}
              </>
            ) : (
              <>
                <h4>Leave inventory</h4>
                <p className="settings-help">
                  You'll no longer have access to this inventory.
                </p>
                <button onClick={handleLeave} className="btn-delete">
                  Leave Inventory
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
