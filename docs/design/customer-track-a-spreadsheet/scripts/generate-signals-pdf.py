#!/usr/bin/env python3
"""Generate Pre-channel Opportunity Signals PDF from the signals CSV."""

import csv
from pathlib import Path

from fpdf import FPDF

CSV_PATH = Path(__file__).resolve().parent.parent / "Pre-channel-opportunity-signals.csv"
OUT = Path(__file__).resolve().parent.parent / "Pre-channel-opportunity-signals.pdf"

ROLE_LABELS = {
    "hunt": "HUNT - trapped stock clue",
    "exclude": "EXCLUDE - do not pursue",
    "calibrate": "CALIBRATE - learn from customer wins",
}


def ascii_safe(text: str) -> str:
    if not text:
        return ""
    return (
        text.replace("\u2014", " - ")
        .replace("\u2013", " - ")
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2022", "-")
        .replace("\u2192", "->")
    )


GLOSSARY = """Key terms

- Trapped stock - Inventory stuck with an owner under pressure (closing, returns pile, overstock, cash stress) before a liquidator or marketplace gets it.

- Pre-channel - Same as trapped stock before Hilco, PFP, B-Stock, ReturnPro, or auction.

- TL - Truckload (roughly one semi-trailer of goods).

- DC - Distribution center (regional warehouse).

- GOB - Going out of business (store-closing sale).

- Ch7 / Ch11 - Chapter 7 or Chapter 11 U.S. bankruptcy.

- 3PL - Third-party logistics provider (stores/ships for another company).

- B-Stock - B2B (business-to-business) liquidation auction marketplace.

- ReturnPro / goTRG / Inmar - Large reverse-logistics processors.

- Hilco / PFP / Gordon Brothers / SB360 - Professional liquidation and GOB operators.

- PACER - Public Access to Court Electronic Records (federal courts).

- WARN - Worker Adjustment and Retraining Notification Act (U.S. mass layoff notice law).

- UCC - Uniform Commercial Code filing (lender claim on inventory).

- NAICS - North American Industry Classification System.

Customer hard rules (May 2026):
- S27: Bankruptcy in press or PR = too late - exclude.
- S26: Do not target companies IN the liquidation business.
- S28-S29: Tax liens and collection/vendor suits = early stress (Phase 1)."""


class SignalsPDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, ascii_safe(f"Band It - Pre-channel signals  |  Page {self.page_no()}"), align="C")


def body(pdf: FPDF, text: str) -> None:
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 5.5, ascii_safe(text))
    pdf.ln(1)


def section_title(pdf: FPDF, text: str) -> None:
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(0, 6, ascii_safe(text))
    pdf.ln(1)


def label_value(pdf: FPDF, label: str, value: str) -> None:
    if not value:
        return
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(36, 5.5, ascii_safe(label))
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 5.5, ascii_safe(value))
    pdf.ln(0.5)


def load_signals() -> list[dict]:
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def main() -> None:
    signals = load_signals()
    pdf = SignalsPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 18)
    pdf.multi_cell(0, 10, ascii_safe("Pre-Channel Opportunity Signals"))
    pdf.ln(2)
    body(
        pdf,
        "Plain-English guide for trapped-stock discovery (closings + returns). "
        "30 signals from Pre-channel-opportunity-signals.csv. "
        "Abbreviations explained in parentheses on first use in each section.",
    )
    body(pdf, "Band It - Customer approved for Phase 1 build  |  May 2026")

    section_title(pdf, "Glossary and customer rules")
    body(pdf, GLOSSARY)

    pdf.add_page()
    section_title(pdf, "How to use")
    body(
        pdf,
        "1. Monitor hunt signals (signal_role = hunt).\n"
        "2. Apply exclude gates: S26 liquidation industry, S27 bankruptcy PR, S15 channel assigned.\n"
        "3. Stack multiple hunt signals on one entity for priority.\n"
        "4. Verify custody and call.\n\n"
        "trap_types on each signal: closing | returns | overstock | financial.",
    )

    by_role = {"hunt": [], "exclude": [], "calibrate": []}
    for row in signals:
        role = row.get("signal_role", "hunt")
        by_role.setdefault(role, []).append(row)

    for role in ("exclude", "calibrate", "hunt"):
        pdf.add_page()
        section_title(pdf, f"{ROLE_LABELS.get(role, role).upper()}")
        for row in by_role.get(role, []):
            if pdf.get_y() > 250:
                pdf.add_page()
            sid = row["signal_id"]
            name = row["signal_name"].replace("_", " ")
            traps = row.get("trap_types", "").replace(";", ", ")
            section_title(pdf, f"{sid} - {name}")
            label_value(pdf, "Role:", ROLE_LABELS.get(role, role))
            if traps and traps != "exclude":
                label_value(pdf, "Trap types:", traps)
            label_value(pdf, "What it means:", row.get("what_it_indicates", ""))
            label_value(pdf, "Why it matters:", row.get("why_pre_channel_gem", ""))
            label_value(pdf, "Where to watch:", row.get("primary_sources", ""))
            label_value(pdf, "Stop if you see:", row.get("already_has_channel_exclude_if", ""))
            pdf.ln(2)

    pdf.output(str(OUT))
    print(f"Wrote {OUT} ({len(signals)} signals)")


if __name__ == "__main__":
    main()
