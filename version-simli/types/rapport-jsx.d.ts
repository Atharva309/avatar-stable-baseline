import type * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "rapport-scene": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "project-token"?: string;
      };
    }
  }
}

export {};
