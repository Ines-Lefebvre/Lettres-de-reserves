import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary pour capturer les erreurs JavaScript dans le composant
 * et afficher une UI de fallback au lieu de planter toute l'application.
 *
 * @class ValidationErrorBoundary
 * @extends Component
 */
class ValidationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ValidationErrorBoundary] 🚨 Error caught:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    console.log('[ValidationErrorBoundary] 🔄 Resetting error boundary');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl border-2 border-red-300 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Une erreur est survenue
              </h1>

              <p className="text-gray-600 mb-6">
                L'application a rencontré une erreur inattendue.
                Nous nous excusons pour la gêne occasionnée.
              </p>

              {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Erreur :
                  </p>
                  <p className="text-sm text-red-700">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {this.state.error && (
                <details className="text-left bg-gray-50 rounded-lg mb-6 overflow-hidden">
                  <summary className="cursor-pointer font-semibold text-gray-700 p-4 hover:bg-gray-100">
                    Détails techniques
                  </summary>
                  <div className="p-4 border-t border-gray-200">
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Stack Trace :
                      </p>
                      <pre className="text-xs text-gray-700 overflow-auto bg-white p-3 rounded border border-gray-200 max-h-40">
                        {this.state.error.stack || 'Non disponible'}
                      </pre>
                    </div>

                    {this.state.errorInfo && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">
                          Component Stack :
                        </p>
                        <pre className="text-xs text-gray-700 overflow-auto bg-white p-3 rounded border border-gray-200 max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recharger l'application
                </button>

                <button
                  onClick={() => window.history.back()}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Retour
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                Si le problème persiste, contactez le support technique.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ValidationErrorBoundary;
