import React from 'react';
import { X, BookOpen, Layers, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PUSTAKAM_URL = 'https://pustakam.tanmaysk.in';

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="lib-info-backdrop" onClick={onClose}>
      <div className="lib-info-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="lib-info-modal-header">
          <div className="lib-info-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="lib-info-eyebrow">OPEN-ACCESS KNOWLEDGE REPOSITORY</span>
              <span className="lib-info-badge">395+ VOLUMES</span>
            </div>
            <h2>About Free Library</h2>
          </div>
          <button
            className="lib-info-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body — High Density Information */}
        <div className="lib-info-modal-body">
          {/* Mission & Purpose */}
          <div className="lib-info-section">
            <div className="lib-info-section-title">
              <BookOpen size={14} className="section-icon" />
              <h3>Mission & Architecture</h3>
            </div>
            <p>
              <strong>Free Library</strong> is an open-access digital library containing over 395+ structured, chapter-by-chapter learning roadmaps across Computer Science, Artificial Intelligence, Quantitative Finance, Hardware Engineering, and Business Strategy.
            </p>
            <p>
              Every curriculum is designed as a self-contained textbook—featuring foundational principles, step-by-step technical modules, real-world case studies, architectural diagrams, and self-assessment quizzes.
            </p>
          </div>

          {/* Edition Breakdown Grid */}
          <div className="lib-info-section">
            <div className="lib-info-section-title">
              <Layers size={14} className="section-icon" />
              <h3>Curriculum Edition System</h3>
            </div>
            <div className="lib-info-grid">
              <div className="lib-info-grid-card">
                <span className="edition-tag stellar">✨ Stellar Edition</span>
                <p>In-depth, academic and industry-grade technical roadmaps built for deep conceptual mastery and architectural rigor.</p>
              </div>
              <div className="lib-info-grid-card">
                <span className="edition-tag street">🔥 Street Edition</span>
                <p>Fast-paced, pragmatic execution guides focused on real-world implementation, trade-offs, and rapid building.</p>
              </div>
              <div className="lib-info-grid-card">
                <span className="edition-tag desi">🇮🇳 Desi Edition</span>
                <p>Contextualized case studies, analogies, and operational frameworks tailored for regional and emerging market dynamics.</p>
              </div>
            </div>
          </div>

          {/* Generator Integration */}
          <div className="lib-info-section highlight-box">
            <div className="lib-info-section-title">
              <Sparkles size={14} className="section-icon accent" />
              <h3>Custom Roadmap Synthesis</h3>
            </div>
            <p>
              Built in tandem with <a href={PUSTAKAM_URL} target="_blank" rel="noopener noreferrer" className="lib-info-link">Pustakam ↗</a>, an autonomous curriculum synthesis engine. Need a custom textbook on an exact niche topic? Generate your own structured curriculum with Pustakam.
            </p>
          </div>

          {/* Status & Contact Notice */}
          <div className="lib-info-section" style={{ background: 'rgba(224, 90, 53, 0.07)', border: '1px solid rgba(224, 90, 53, 0.25)', borderRadius: '6px', padding: '14px' }}>
            <div className="lib-info-section-title">
              <Sparkles size={14} className="section-icon accent" />
              <h3>Status: Automated Synthesis Concluded</h3>
            </div>
            <p style={{ margin: 0, color: 'var(--ink)' }}>
              The automated book generation workflow has been stopped. The entire archive of 1,000+ books remains <strong>open-access, free to read, and free to download as PDF</strong> for anyone who wants to study or learn.
            </p>
            <p style={{ marginTop: '10px', marginBottom: 0, color: 'var(--ink-2)' }}>
              Want to connect, collaborate, or share feedback? Reach out directly via:
              <br />
              📫 <a href="mailto:kalbandetanmay@gmail.com" className="lib-info-link">kalbandetanmay@gmail.com</a>
              {' · '}
              💼 <a href="https://linkedin.com/in/tanmay-kalbande" target="_blank" rel="noopener noreferrer" className="lib-info-link">LinkedIn</a>
              {' · '}
              🐙 <a href="https://github.com/tanmay-kalbande" target="_blank" rel="noopener noreferrer" className="lib-info-link">GitHub</a>
            </p>
          </div>

          {/* Disclaimer & Usage Terms */}
          <div className="lib-info-section disclaimer-box">
            <div className="lib-info-section-title">
              <ShieldAlert size={14} className="section-icon warning" />
              <h3>Disclaimer & Usage Guidelines</h3>
            </div>
            <ul className="disclaimer-list">
              <li>
                <strong>Educational Purpose Only:</strong> All books, code examples, mathematical formulas, and business strategies published in Free Library are provided solely for educational self-study and academic research.
              </li>
              <li>
                <strong>No Professional Advice:</strong> Contents do not constitute official financial advice, legal counsel, or production safety certification. Independently audit and verify code, formulas, and regulations prior to production or commercial deployment.
              </li>
              <li>
                <strong>Open Access & Attribution:</strong> Free Library guides are free to read, study, and export for personal use. Commercial repackaging or un-attributed mirror hosting is strictly prohibited.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="lib-info-modal-footer">
          <span className="lib-info-author">Curated & Engineered by <strong>Tanmay Kalbande</strong></span>
          <button className="btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
