import { useState } from "react";
import type { ItemAttribute, NewItem } from "../../domain";
import { AttributeEditor } from "./AttributeEditor";

interface AddItemModalProps {
  onSave: (item: NewItem) => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  quantity: string;
  notes: string;
  locationPath: string;
  attributes: ItemAttribute[];
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  quantity: "1",
  notes: "",
  locationPath: "",
  attributes: [],
};

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

export function AddItemModal({ onSave, onClose }: AddItemModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const newItem: NewItem = {
      name: form.name.trim(),
      quantity: parseInt(form.quantity, 10),
      notes: form.notes.trim() || null,
      locationPath: parseLocationPath(form.locationPath),
      attributes: form.attributes.filter((attr) => attr.key.trim()),
    };

    onSave(newItem);
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
          <h2>Add Item</h2>
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
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-save">
              Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
