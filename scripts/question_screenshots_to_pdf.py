#!/usr/bin/env python3
"""
questions_to_pdf.py

Combine a folder of question screenshots into a single PDF you can hand to an
LLM (Claude, etc.) to answer in bulk.

Behavior:
- Reads every image in an input folder (default extensions: .png .jpg .jpeg .webp).
- Sorts them by filename (so q01, q02, q03... appear in order).
- Numbers each question with a small "Question N" label above the image.
- Packs as many questions per page as fit, with a thin separator between them.
  (You don't get one-per-page unless an image is taller than the page area.)
- Writes a single output PDF.

Usage:
    python questions_to_pdf.py <input_folder> [-o output.pdf]
                               [--page-size letter|a4]
                               [--margin-pt 36]
                               [--gap-pt 18]
                               [--label-pt 11]
                               [--exts .png,.jpg,.jpeg,.webp]
                               [--no-labels]

Examples:
    python questions_to_pdf.py ./screenshots
    python questions_to_pdf.py ./screenshots -o ccat-batch1.pdf --page-size a4
    python questions_to_pdf.py ./screenshots --gap-pt 24 --margin-pt 48

Requirements (install once):
    pip install pillow reportlab
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image
from reportlab.lib.pagesizes import LETTER, A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


PAGE_SIZES = {"letter": LETTER, "a4": A4}
DEFAULT_EXTS = ".png,.jpg,.jpeg,.webp"


def collect_images(folder: Path, exts: tuple[str, ...]) -> list[Path]:
    """Return all image files in `folder` matching `exts`, sorted by filename."""
    files: list[Path] = []
    for entry in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
        if entry.is_file() and entry.suffix.lower() in exts:
            files.append(entry)
    return files


def fit_image_dims(
    img_w: int,
    img_h: int,
    max_w: float,
    max_h: float,
) -> tuple[float, float]:
    """
    Scale (img_w, img_h) so it fits inside (max_w, max_h) while preserving
    aspect ratio. Return (draw_w, draw_h) in points.

    If the image is already smaller than the box, it is NOT upscaled — better to
    keep screenshots crisp at their native resolution than to blur them.
    """
    scale = min(max_w / img_w, max_h / img_h, 1.0)
    return img_w * scale, img_h * scale


def render_pdf(
    images: list[Path],
    output_path: Path,
    page_size: tuple[float, float],
    margin_pt: float,
    gap_pt: float,
    label_pt: float,
    show_labels: bool,
) -> int:
    """
    Render `images` into a single PDF at `output_path`.

    Returns the page count produced.

    Layout: top-down packing within a single column. Each question consists of
    an optional "Question N" label followed by the image. If the next question
    won't fit on the current page, start a new page. If a single question is
    taller than the available page height, the image is downscaled to fit (so
    every question lands on a single page; we never split a question across
    pages).
    """
    page_w, page_h = page_size
    usable_w = page_w - 2 * margin_pt
    usable_h = page_h - 2 * margin_pt

    c = canvas.Canvas(str(output_path), pagesize=page_size)
    # Cursor tracks the y-position of the next item's TOP edge, in PDF coords
    # (origin at bottom-left). Start one margin from the top.
    cursor_y = page_h - margin_pt
    items_on_current_page = 0
    page_count = 1

    for index, image_path in enumerate(images, start=1):
        # Open image once to get pixel dimensions (lazy — Pillow doesn't decode
        # the full bitmap until we ask for it).
        with Image.open(image_path) as im:
            img_w_px, img_h_px = im.size

        label_text = f"Question {index}" if show_labels else None
        # Reserve vertical space for the label (font height + a couple points
        # of breathing room).
        label_block_h = (label_pt + 4) if show_labels else 0

        # Provisional draw size at full available width.
        draw_w, draw_h = fit_image_dims(
            img_w_px, img_h_px, usable_w, usable_h - label_block_h
        )

        block_h = label_block_h + draw_h

        # If this question doesn't fit in the remaining space on the current
        # page (and the page already has at least one item), start a new page.
        space_remaining = cursor_y - margin_pt
        if items_on_current_page > 0 and block_h > space_remaining:
            c.showPage()
            page_count += 1
            cursor_y = page_h - margin_pt
            items_on_current_page = 0
            # Recompute draw size against a fresh page (in case the question
            # was originally constrained by a partial-page remainder).
            draw_w, draw_h = fit_image_dims(
                img_w_px, img_h_px, usable_w, usable_h - label_block_h
            )
            block_h = label_block_h + draw_h

        # Draw the label.
        if show_labels:
            c.setFont("Helvetica-Bold", label_pt)
            c.drawString(margin_pt, cursor_y - label_pt, label_text)
            cursor_y -= label_block_h

        # Draw the image, centered horizontally within usable_w. Center keeps
        # things visually anchored when screenshots have varying aspect ratios.
        img_x = margin_pt + (usable_w - draw_w) / 2
        img_y = cursor_y - draw_h
        c.drawImage(
            str(image_path),
            img_x,
            img_y,
            width=draw_w,
            height=draw_h,
            preserveAspectRatio=True,
            mask="auto",
        )
        cursor_y = img_y

        # Add a thin separator gap below the image (only if more questions
        # follow; the very last one doesn't need it).
        is_last = index == len(images)
        if not is_last:
            cursor_y -= gap_pt
            # Draw a faint hairline so the visual break is obvious to a reader
            # (and to an LLM reading via vision).
            c.setStrokeColorRGB(0.85, 0.85, 0.85)
            c.setLineWidth(0.5)
            line_y = cursor_y + (gap_pt / 2)
            c.line(margin_pt, line_y, page_w - margin_pt, line_y)

        items_on_current_page += 1

    c.save()
    return page_count


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Combine question screenshots into a single PDF.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "input_folder",
        type=Path,
        help="Folder containing question screenshots.",
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        default=None,
        help="Output PDF path. Default: <input_folder>/questions.pdf",
    )
    parser.add_argument(
        "--page-size",
        choices=PAGE_SIZES.keys(),
        default="letter",
        help="Page size. Default: letter.",
    )
    parser.add_argument(
        "--margin-pt",
        type=float,
        default=36.0,
        help="Page margin in PDF points (1 inch = 72 pt). Default: 36.",
    )
    parser.add_argument(
        "--gap-pt",
        type=float,
        default=18.0,
        help="Vertical gap between questions in points. Default: 18.",
    )
    parser.add_argument(
        "--label-pt",
        type=float,
        default=11.0,
        help='"Question N" label font size in points. Default: 11.',
    )
    parser.add_argument(
        "--exts",
        default=DEFAULT_EXTS,
        help=f"Comma-separated image extensions to include. Default: {DEFAULT_EXTS}",
    )
    parser.add_argument(
        "--no-labels",
        action="store_true",
        help='Omit the "Question N" label above each image.',
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    folder: Path = args.input_folder
    if not folder.is_dir():
        print(f"error: {folder} is not a directory", file=sys.stderr)
        return 2

    exts = tuple(
        e.strip().lower() if e.strip().startswith(".") else f".{e.strip().lower()}"
        for e in args.exts.split(",")
        if e.strip()
    )

    images = collect_images(folder, exts)
    if not images:
        print(
            f"error: no images with extensions {exts} found in {folder}",
            file=sys.stderr,
        )
        return 1

    output_path: Path = args.output or (folder / "questions.pdf")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    page_size = PAGE_SIZES[args.page_size]

    pages = render_pdf(
        images=images,
        output_path=output_path,
        page_size=page_size,
        margin_pt=args.margin_pt,
        gap_pt=args.gap_pt,
        label_pt=args.label_pt,
        show_labels=not args.no_labels,
    )

    print(
        f"wrote {output_path} — {len(images)} questions across {pages} page(s)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
