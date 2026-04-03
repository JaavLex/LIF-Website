'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { VERSION_INFO } from '@/lib/version';

export function VersionInfo() {
  const [open, setOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const env = process.env.NEXT_PUBLIC_LIF_ENVIRONMENT === 'dev' ? 'dev' : 'prod';
  const envLabel = env === 'dev' ? 'DÉVELOPPEMENT' : 'PRODUCTION';

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="version-info-wrapper" ref={panelRef}>
      <button
        className="version-info-btn"
        onClick={() => setOpen(!open)}
        aria-label="Informations de version"
        title="Informations de version"
      >
        <HelpCircle size={18} />
      </button>

      {open && (
        <div className="version-info-panel">
          <div className="version-info-header">
            <span className="version-info-version">v{VERSION_INFO.version}</span>
            <span className={`version-info-env version-info-env--${env}`}>
              {envLabel}
            </span>
            <button className="version-info-close" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>

          <div className="version-info-creator">
            Créé par <strong>{VERSION_INFO.creator}</strong>
          </div>

          <button
            className="version-info-changelog-toggle"
            onClick={() => setChangelogOpen(!changelogOpen)}
          >
            {changelogOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Changelog
          </button>

          {changelogOpen && (
            <div className="version-info-changelog">
              {VERSION_INFO.changelog.map((entry) => (
                <div key={entry.version} className="version-info-changelog-entry">
                  <div className="version-info-changelog-header">
                    <span className="version-info-changelog-version">v{entry.version}</span>
                    <span className="version-info-changelog-date">{entry.date}</span>
                  </div>
                  <ul className="version-info-changelog-changes">
                    {entry.changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
