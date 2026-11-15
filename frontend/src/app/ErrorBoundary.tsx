import { Component, type ErrorInfo, type ReactNode } from 'react';
import s from './App.module.css';

// Una vista que falla no tumba la app: el resto de la navegación sigue funcionando.
export class ErrorBoundary extends Component<{ children: ReactNode; label: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[${this.props.label}]`, error, info.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className={s.notice}>
          <h2>The {this.props.label} view hit a problem</h2>
          <p>{this.state.error.message}. Switch to another view or reload the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
