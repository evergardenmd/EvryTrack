import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center select-none">
          <div className="max-w-md p-6 rounded-3xl border border-rose-500/40 bg-slate-900 space-y-4 shadow-2xl">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-extrabold text-rose-400">Display Recovery</h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              A temporary display glitch occurred: <code className="text-rose-300 font-mono text-[11px] block mt-1.5 bg-slate-950 p-2 rounded border border-rose-500/20">{String(this.state.error?.message || this.state.error)}</code>
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-500 text-black shadow-lg cursor-pointer hover:bg-emerald-400"
            >
              🔄 Refresh App & Restore View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
