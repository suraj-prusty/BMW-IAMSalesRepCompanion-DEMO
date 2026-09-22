import { useRef, useState } from 'react';
import { FileText, Upload, Paperclip } from 'lucide-react';
import { api } from '../services/api';
import { formatShort } from '../utils/dateUtils';
import { MOCK_TEAM_DOCUMENTS } from '../data/teamDocuments';

function formatSize(sizeKb) {
  if (sizeKb == null) return '';
  return sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(1)} MB`;
}

// Shared team-level document list. There is no document/storage backend yet —
// files picked here are kept in memory only and are lost on refresh.
export default function TeamDocuments() {
  const manager = api.getUser();
  const [documents, setDocuments] = useState(MOCK_TEAM_DOCUMENTS);
  const fileInputRef = useRef(null);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newDocs = files.map((file, i) => ({
      id: `local-${Date.now()}-${i}`,
      name: file.name,
      uploadedBy: manager?.name || 'You',
      uploadedAt: new Date(),
      sizeKb: Math.round(file.size / 1024),
      isLocalOnly: true,
    }));

    setDocuments((prev) => [...newDocs, ...prev]);
    e.target.value = ''; // allow re-selecting the same file
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={14} color="var(--text-secondary)" />
          <span style={{
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            letterSpacing: '0.07em', color: 'var(--text-secondary)',
          }}>
            Team Documents
          </span>
        </div>

        <div>
          <input ref={fileInputRef} type="file" multiple onChange={handleFilesSelected} style={{ display: 'none' }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 14px' }}
          >
            <Upload size={13} /> Upload Document
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          No team documents yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', flexWrap: 'wrap' }}
            >
              <Paperclip size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)',
                  overflowWrap: 'break-word', wordBreak: 'break-word',
                }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {doc.uploadedBy} · {formatShort(doc.uploadedAt instanceof Date ? doc.uploadedAt : new Date(doc.uploadedAt))} · {formatSize(doc.sizeKb)}
                </div>
              </div>
              {doc.isLocalOnly && (
                <span style={{
                  fontSize: '10px', fontWeight: '600', color: '#F59E0B',
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
                  borderRadius: '20px', padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  Local only — not saved
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
