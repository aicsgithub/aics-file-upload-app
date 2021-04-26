import React from "react";

export function createEnterKeyHandler(handler: Function) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handler();
    }
  };
}
