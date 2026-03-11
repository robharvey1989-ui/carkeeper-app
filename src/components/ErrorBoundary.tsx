import React from "react";
type State = { hasError: boolean; message?: string; stack?: string };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: String(error?.message ?? error), stack: error?.stack };
  }
  componentDidCatch(error: any, info: any) {
    console.error("[App crashed]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#b91c1c" }}>
            {this.state.message}
            {"\n\n"}
            {this.state.stack}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
