import { useState } from "react";
import type { Item, ItemAttribute } from "../../domain";
import { AttributeEditor } from "./AttributeEditor";

interface EditItemModalProps {
  item: Item;
  onSave: (item: Item) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  quantity: string;
  notes: string;
  locationPath: string;
  attributes: ItemAttribute[];
}

function itemToFormState(item: Item): FormState {
  return {
    name: item.name,
    quantity: String(item.quantity),
    notes: item.notes ?? "",
    locationPath: item.locationPath.join(" / "),
    attributes: item.attributes,
  };
}

function parseLocationPath(input: string): string[] {
  if (!input.trim()) {
    return [];
  }
  return input
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function validateForm(form: FormState): string | null {
  if (!form.name.trim()) {
    return "Name is required";
  }
  const quantity = parseInt(form.quantity, 10);
  if (isNaN(quantity) || quantity < 1) {
    return "Quantity must be a positive number";
  }
  for (const attr of form.attributes) {
    if (!attr.key.trim()) {
      return "All attributes must have a key";
    }
  }
  return null;
}

export function EditItemModal({ item, onSave, onDelete, onClose }: EditItemModalProps) {
  const [form, setForm] = useState<FormState>(() => itemToFormState(item));
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const updatedItem: Item = {
      id: item.id,
      name: form.name.trim(),
      quantity: parseInt(form.quantity, 10),
      notes: form.notes.trim() || null,
      locationPath: parseLocationPath(form.locationPath),
      attributes: form.attributes.filter((attr) => attr.key.trim()),
    };

    onSave(updatedItem);
    onClose();
  };

  const handleDelete = () => {
    onDelete(item.id);
    onClose();
  };

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Item</h2>
          <button onClick={onClose} className="btn-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-item-form" noValidate>
          <div className="form-field">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-field">
            <label htmlFor="quantity">Quantity *</label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-field">
            <label htmlFor="location">Location Path</label>
            <input
              id="location"
              type="text"
              placeholder="Living Room / TV Stand / Drawer"
              value={form.locationPath}
              onChange={(e) => updateField("locationPath", e.target.value)}
            />
            <small>Slash-separated path segments</small>
          </div>

          <AttributeEditor
            attributes={form.attributes}
            onChange={(attrs) => updateField("attributes", attrs)}
          />

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            {showDeleteConfirm ? (
              <div className="delete-confirm">
                <span>Delete this item?</span>
                <button type="button" onClick={handleDelete} className="btn-delete-confirm">
                  Yes, Delete
                </button>
                <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn-delete">
                  Delete
                </button>
                <div className="form-actions-right">
                  <button type="button" onClick={onClose} className="btn-cancel">
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
