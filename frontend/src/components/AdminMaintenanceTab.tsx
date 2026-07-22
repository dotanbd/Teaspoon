import React, { useState } from 'react';

export const AdminMaintenanceTab: React.FC = () => {
  const [pruneSize, setPruneSize] = useState<number | string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const runAction = async (endpoint: string, message: string, payload?: any) => {
    if (!window.confirm(message)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/maintenance/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Uncomment if using auth
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Success: ${data.message}`);
      } else {
        alert(`Error: ${data.detail || 'Failed to execute maintenance task'}`);
      }
    } catch (error) {
      console.error('Maintenance API Error:', error);
      alert('Network error. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handlePruneSize = () => {
    const sizeMb = parseFloat(pruneSize.toString());
    if (isNaN(sizeMb) || sizeMb <= 0) {
      alert('Please enter a valid file size in MB.');
      return;
    }
    runAction(
      'prune-size',
      `Are you sure you want to delete all files larger than ${sizeMb}MB?`,
      { size_mb: sizeMb }
    );
  };

  return (
    <div className="maintenance-tab" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>Teaspoon Maintenance Dashboard</h2>
      <p>Manage system storage, audit records, and prepare for new semesters.</p>

      {/* 1. Audit Attachments */}
      <div style={cardStyle}>
        <h3>1. Audit Attachments</h3>
        <p>Run a two-way audit comparing DB attachments and MinIO files to find ghosts and orphans.</p>
        <button 
          style={btnStyle} 
          disabled={loading}
          onClick={() => runAction('audit-attachments', 'Run the non-destructive attachment audit?')}
        >
          Run Audit
        </button>
      </div>

      {/* 2. Prune Inactive Courses */}
      <div style={cardStyle}>
        <h3>2. Prune Inactive Courses</h3>
        <p><strong>DANGER:</strong> Deep clean inactive courses and all related data.</p>
        <button 
          style={dangerBtnStyle} 
          disabled={loading}
          onClick={() => runAction('prune-inactive', '⚠️ DANGER: Are you absolutely sure you want to permanently delete inactive courses and their data? This cannot be undone.')}
        >
          Prune Inactive Courses
        </button>
      </div>

      {/* 3. Prune Large Files */}
      <div style={cardStyle}>
        <h3>3. Prune Large Files</h3>
        <p>Delete attachments larger than a specific size from MinIO and the DB.</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="number" 
            placeholder="Size in MB (e.g., 50)" 
            value={pruneSize}
            onChange={(e) => setPruneSize(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button style={btnStyle} disabled={loading} onClick={handlePruneSize}>
            Prune Large Files
          </button>
        </div>
      </div>

      {/* 4. Reset Semester */}
      <div style={cardStyle}>
        <h3>4. Reset Semester</h3>
        <p><strong>DANGER:</strong> Full semester reset. Wipes MinIO, purges assignments, unenrolls users.</p>
        <button 
          style={dangerBtnStyle} 
          disabled={loading}
          onClick={() => runAction('reset-semester', '🚨 CRITICAL WARNING: You are about to wipe all semester data, including MinIO files and assignments. Do you want to proceed with the SEMESTER RESET?')}
        >
          Reset Semester
        </button>
      </div>
    </div>
  );
};

// Simple inline styles (replace with your App's CSS/Tailwind classes if preferred)
const cardStyle: React.CSSProperties = { border: '1px solid #e2e8f0', padding: '16px', marginBottom: '16px', borderRadius: '8px', backgroundColor: '#f8fafc' };
const btnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const dangerBtnStyle: React.CSSProperties = { ...btnStyle, backgroundColor: '#ef4444' };
