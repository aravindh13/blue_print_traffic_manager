import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error, info) {
    // Update state so the next render shows the fallback UI.
    this.setState({ error, info });
    // Also log to console for the developer
    console.error('Uncaught error in React tree:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{padding:20,fontFamily:'system-ui',background:'#fff',color:'#111'}}>
          <h2 style={{color:'#b91c1c'}}>Something went wrong</h2>
          <p style={{whiteSpace:'pre-wrap',fontFamily:'monospace',fontSize:12}}>{String(this.state.error)}</p>
          {this.state.info && (
            <details style={{marginTop:10,whiteSpace:'pre-wrap'}}>
              {this.state.info.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
