"use client";

import { ReactNode } from "react";
import { IconX } from "@tabler/icons-react";

export function Panel({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className={`panel-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`panel ${open ? "open" : ""}`}>
        <div className="panel-head">
          <div className="panel-title">{title}</div>
          <button className="panel-close" onClick={onClose} aria-label="Close panel">
            <IconX size={14} />
          </button>
        </div>
        <div className="panel-body">{open ? children : null}</div>
      </div>
    </>
  );
}
