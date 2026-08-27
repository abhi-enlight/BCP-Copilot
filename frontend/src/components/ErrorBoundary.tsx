"use client";

import React, { Component, type ReactNode } from "react";
import { WarningCircle, ArrowsClockwise } from "@phosphor-icons/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 my-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarningCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>
              Something went wrong rendering this item. ({this.state.error?.message || "Render issue"})
            </span>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-semibold hover:bg-rose-100 transition-colors cursor-pointer text-[11px]"
          >
            <ArrowsClockwise size={12} />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
