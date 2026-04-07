import "./Layout.css";

export default function Layout({ children }) {
    return (
        <div className="layout-root">
            {/* Clean gradient background */}
            <div className="layout-bg" />

            {/* Header */}
            <header className="layout-header">
                <div className="header-logo">
                    <div className="logo-mark">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="4" x2="12" y2="20" />
                            <line x1="4" y1="12" x2="20" y2="12" />
                        </svg>
                    </div>
                    <span className="logo-text">SymtoMap</span>
                </div>
                <div className="header-right">
                    <span className="header-tag">Multi-Organ Risk Analysis</span>
                </div>
            </header>

            {/* Main content */}
            <main className="layout-content">
                {children}
            </main>

            {/* Footer */}
            <footer className="layout-footer">
                <span>© 2026 SymtoMap</span>
                <span className="footer-sep">·</span>
                <span>Powered by Machine Learning</span>
            </footer>
        </div>
    );
}
