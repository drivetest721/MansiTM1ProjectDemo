import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error UI (e.g. page name) */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * ErrorBoundary catches render errors from any child component tree and shows
 * a friendly fallback instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary label="Revenue Planning">
 *     <RevenuePlanning />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in the browser console so developers can still see the stack trace.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 max-w-md w-full">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 font-mono break-words">
            {this.state.message || 'An unexpected render error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition-colors"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </div>
    );
  }
}
