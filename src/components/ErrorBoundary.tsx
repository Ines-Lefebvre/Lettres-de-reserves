import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <h1 className="text-xl font-bold text-red-800">Erreur de chargement</h1>
            </div>
            <p className="text-red-700 mb-4">
              Une erreur s'est produite lors du chargement de la page.
            </p>
            <details className="text-sm text-red-600">
              <summary className="cursor-pointer font-medium">Détails techniques</summary>
              <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                {this.state.error?.message}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}