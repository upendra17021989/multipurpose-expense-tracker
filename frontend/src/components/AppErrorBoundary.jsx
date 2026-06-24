import { Component } from 'react'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="page-shell">
          <section className="alert-panel error">
            Something went wrong while opening this page.
          </section>
          <pre className="error-details">{this.state.error.message}</pre>
        </main>
      )
    }

    return this.props.children
  }
}
