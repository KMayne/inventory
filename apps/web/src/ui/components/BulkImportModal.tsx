import { importItemsSchema } from "@inventory/shared";
import { useState } from "react";
import { z } from "zod/v4";
import type { NewItem } from "../../domain";

interface BulkImportModalProps {
  onImport: (items: NewItem[]) => void;
  onClose: () => void;
}

function parseItems(data: unknown): { items: NewItem[]; errors: string[] } {
  const result = importItemsSchema.safeParse(data);
  if (!result.success) {
    return { items: [], errors: [z.prettifyError(result.error)] };
  }
  return {
    items: result.data.map((item) => ({
      name: item.name.trim(),
      quantity: item.quantity,
      notes: item.notes?.trim() || null,
      locationPath: item.locationPath
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
      attributes: item.attributes.map((attr) => ({
        id: crypto.randomUUID(),
        key: attr.key.trim(),
        type: attr.type,
        value: attr.value,
      })),
    })),
    errors: [],
  };
}

const EXAMPLE_JSON = `[
  {
    "name": "HDMI Cable",
    "quantity": 3,
    "notes": "2m length",
    "locationPath": ["Office", "Desk", "Drawer"],
    "attributes": [
      { "key": "Color", "type": "text", "value": "Black" }
    ]
  }
]`;

export function BulkImportModal({ onImport, onClose }: BulkImportModalProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [parseResult, setParseResult] = useState<{
    items: NewItem[];
    errors: string[];
  } | null>(null);

  const handleValidate = () => {
    try {
      const data = JSON.parse(jsonInput);
      setParseResult(parseItems(data));
    } catch {
      setParseResult({ items: [], errors: ["Invalid JSON syntax"] });
    }
  };

  const handleImport = () => {
    if (
      parseResult &&
      parseResult.items.length > 0 &&
      parseResult.errors.length === 0
    ) {
      onImport(parseResult.items);
      onClose();
    }
  };

  const canImport =
    parseResult &&
    parseResult.items.length > 0 &&
    parseResult.errors.length === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bulk Import</h2>
          <button onClick={onClose} className="btn-close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label htmlFor="json-input">JSON Data</label>
            <textarea
              id="json-input"
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setParseResult(null);
              }}
              rows={12}
              placeholder={EXAMPLE_JSON}
              className="bulk-import-textarea"
            />
            <small>Paste an array of items in JSON format</small>
          </div>

          {parseResult && (
            <div className="bulk-import-result">
              {parseResult.errors.length > 0 ? (
                <div className="bulk-import-errors">
                  <strong>Validation errors:</strong>
                  <pre>{parseResult.errors[0]}</pre>
                </div>
              ) : (
                <div className="bulk-import-success">
                  Ready to import {parseResult.items.length} item
                  {parseResult.items.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          {!parseResult ? (
            <button
              onClick={handleValidate}
              className="btn-save"
              disabled={!jsonInput.trim()}
            >
              Validate
            </button>
          ) : (
            <button
              onClick={handleImport}
              className="btn-save"
              disabled={!canImport}
            >
              Import {canImport ? `(${parseResult.items.length})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
