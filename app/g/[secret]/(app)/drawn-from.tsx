"use client";

import { useState } from "react";

import { drawnFromLine, type DrawnTicket } from "@/lib/cycle/doors";

import styles from "./reveal.module.css";

/**
 * "Drawn from 5 tickets" opens into the five Picks and who holds each.
 * The surprise is over, so the hat is a list rather than a sentence.
 */
export function DrawnFrom({
  tickets,
  rerolled,
}: {
  tickets: DrawnTicket[];
  rerolled: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (tickets.length === 0) return null;

  return (
    <div className={styles.hat}>
      <button
        type="button"
        className={styles.hatButton}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {drawnFromLine(tickets.length, rerolled)}
        <span className={styles.hatMark} aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <ul className={styles.hatList}>
          {tickets.map((ticket, index) => (
            <li key={`${ticket.name}\u0000${ticket.holder}\u0000${index}`}>
              <span>{ticket.name}</span>
              <span className={styles.holder}>{ticket.holder}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
