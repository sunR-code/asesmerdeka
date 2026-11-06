import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AppErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kendala tak terduga saat memuat tampilan.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('AppErrorBoundary menangkap error runtime:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleSafeReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 16,
              padding: '28px 32px',
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Pemulihan Tampilan Otomatis
            </h2>
            <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
              Terjadi kendala teknis saat menampilkan komponen halaman ini. Seluruh data kelas, nilai, dan dokumen Bapak/Ibu tetap tersimpan dengan aman.
            </p>
            <div
              style={{
                background: '#f1f5f9',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                color: '#64748b',
                marginBottom: 20,
                wordBreak: 'break-word',
              }}
            >
              Detail: {this.state.errorMessage}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={this.handleSafeReset}
                className="btn btn-outline"
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

