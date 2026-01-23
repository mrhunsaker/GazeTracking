#!/usr/bin/env python3
"""
Analyze and visualize gaze heatmaps from 1-minute binned JSON data.

This script expects a JSON structure like:
{
  "userInitials": "SIM",
  "video": "/videos/Super%20Mario%20Odyssey%20-%20Full%20Game%20Walkthrough.mp4",
  "startedAt": 1733000000000,
  "bins": [
    {
      "startTimeMs": 0,
      "samples": [
        { "x": 822.5, "y": 560, "t": 5000 },
        ...
      ]
    },
    ...
  ]
}

Outputs a single figure with:
- Top: 2 rows x 5 columns of heatmaps (one per minute for 10 minutes).
- Bottom: a larger aggregate heatmap for the entire 10-minute session.

Usage:
  python scripts/analyze_gaze_heatmaps.py \
      --input GazeTracking/StudentFolders/Development_Student/simulated_data/simulated_video_gaze_10min.json \
      --output GazeTracking/StudentFolders/Development_Student/simulated_data/gaze_heatmaps.png \
      --bins 120 \
      --figwidth 16 \
      --dpi 150

Notes:
- Heatmaps are plotted with origin set to 'upper' so that (0,0) corresponds to top-left
  screen coordinates, matching the typical WebGazer coordinate system.
- Grid resolution can be adjusted with --bins (number of bins along the X dimension).
  The Y dimension bins are scaled to preserve the aspect ratio of the data.
"""

import argparse
import json
import math
import os
from typing import Any, Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.gridspec import GridSpec


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render 10 binned 1-minute gaze heatmaps (2x5) and overall 10-minute heatmap."
    )
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        required=True,
        help="Path to the input JSON file containing binned gaze data.",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default=None,
        help="Path to save the output figure (PNG). If omitted, will display interactively.",
    )
    parser.add_argument(
        "--bins",
        type=int,
        default=120,
        help="Number of histogram bins along the X axis (Y bins are scaled by aspect ratio). Default: 120",
    )
    parser.add_argument(
        "--figwidth",
        type=float,
        default=18.0,
        help="Figure width in inches. Height is derived to maintain readable layout. Default: 18.0",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=150,
        help="Figure DPI for saved output. Default: 150",
    )
    parser.add_argument(
        "--cmap",
        type=str,
        default="inferno",
        help="Matplotlib colormap to use for heatmaps. Default: inferno",
    )
    return parser.parse_args()


def load_gaze_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def collect_all_samples(bins: List[Dict[str, Any]]) -> List[Dict[str, float]]:
    """
    Flatten all bin samples into a single list, filtering invalid entries.
    """
    all_samples: List[Dict[str, float]] = []
    for b in bins:
        samples = b.get("samples", [])
        for s in samples:
            x = s.get("x")
            y = s.get("y")
            if x is None or y is None:
                continue
            if not (isinstance(x, (int, float)) and isinstance(y, (int, float))):
                continue
            if math.isfinite(x) and math.isfinite(y):
                all_samples.append({"x": float(x), "y": float(y)})
    return all_samples


def get_extent_from_samples(samples: List[Dict[str, float]]) -> Tuple[float, float]:
    """
    Infer screen extents from maximum x and y across samples.
    Returns (width, height). If insufficient data, returns (1920, 1080).
    """
    if not samples:
        return (1920.0, 1080.0)
    max_x = max((s["x"] for s in samples), default=0.0)
    max_y = max((s["y"] for s in samples), default=0.0)
    width = max(1.0, float(max_x))
    height = max(1.0, float(max_y))
    # Add a small margin so points at max values are included nicely
    return (width * 1.01, height * 1.01)


def compute_hist2d(
    samples: List[Dict[str, float]],
    width: float,
    height: float,
    bins_x: int,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute a 2D histogram (heatmap) using numpy for given samples and domain extents.
    bins_x determines number of x-bins; y-bins are scaled by the aspect ratio.
    Returns (H, x_edges, y_edges). Note: y_edges are in screen coordinates (top-left origin later handled by imshow origin='upper').
    """
    if width <= 0 or height <= 0:
        width, height = 1920.0, 1080.0

    # Determine number of bins on Y to preserve aspect ratio
    aspect = height / width if width > 0 else 1.0
    bins_y = max(1, int(round(bins_x * aspect)))

    if not samples:
        # Return empty histogram
        H = np.zeros((bins_y, bins_x), dtype=float)
        x_edges = np.linspace(0, width, bins_x + 1)
        y_edges = np.linspace(0, height, bins_y + 1)
        return H, x_edges, y_edges

    xs = np.array([s["x"] for s in samples], dtype=float)
    ys = np.array([s["y"] for s in samples], dtype=float)

    # Clamp to domain [0, width], [0, height] to avoid out-of-range issues
    xs = np.clip(xs, 0.0, width)
    ys = np.clip(ys, 0.0, height)

    H, x_edges, y_edges = np.histogram2d(
        ys,  # row dimension (first) corresponds to Y (so we pass Y first)
        xs,  # column dimension corresponds to X
        bins=[bins_y, bins_x],
        range=[[0.0, height], [0.0, width]],
        density=True,
    )

    # Optional: normalize to density or leave as counts.
    # For now we leave as counts to reflect absolute dwell frequency.
    return H, x_edges, y_edges


def plot_heatmap(
    ax: plt.Axes, H: np.ndarray, width: float, height: float, cmap: str, title: str = ""
) -> None:
    """
    Plot a single heatmap with origin at upper-left to match screen coords.
    """
    ax.imshow(
        H,
        cmap=cmap,
        origin="upper",  # top-left corresponds to (0,0)
        extent=[
            0,
            width,
            height,
            0,
        ],  # [x0, x1, y0, y1] with y reversed by origin='upper'
        interpolation="bilinear",
        aspect="equal",
    )
    ax.set_xlim(0, width)
    ax.set_ylim(height, 0)  # invert to keep top-left origin visually consistent
    ax.set_xticks([])
    ax.set_yticks([])
    if title:
        ax.set_title(title, fontsize=10)


def build_figure_layout(figwidth: float) -> Tuple[plt.Figure, GridSpec]:
    """
    Build a figure with gridspec: 3 rows x 5 columns.
    Top two rows: 10 minute-binned heatmaps (2x5).
    Bottom row: single large heatmap spanning all 5 columns.
    Height ratios set to give larger space to the bottom heatmap.
    """
    # Derive a reasonable height from width (widescreen style)
    figheight = figwidth * 0.75  # e.g., 18" wide -> 13.5" tall
    fig = plt.figure(figsize=(figwidth, figheight), constrained_layout=True)
    gs = GridSpec(3, 5, figure=fig, height_ratios=[1.0, 1.0, 3.0])
    return fig, gs


def main():
    args = parse_args()

    data = load_gaze_json(args.input)
    bins_data = data.get("bins", [])

    # Flatten all samples for overall extent
    all_samples = collect_all_samples(bins_data)
    width, height = get_extent_from_samples(all_samples)

    # Prepare figure layout
    fig, gs = build_figure_layout(args.figwidth)

    # Plot 1-minute heatmaps in 2 rows x 5 columns
    minute_axes: List[plt.Axes] = []
    for i in range(10):
        row = 0 if i < 5 else 1
        col = i % 5
        ax = fig.add_subplot(gs[row, col])
        minute_axes.append(ax)

        bin_data = bins_data[i] if i < len(bins_data) else {"samples": []}
        samples = []
        for s in bin_data.get("samples", []):
            x = s.get("x")
            y = s.get("y")
            if (
                isinstance(x, (int, float))
                and isinstance(y, (int, float))
                and math.isfinite(x)
                and math.isfinite(y)
            ):
                samples.append({"x": float(x), "y": float(y)})

        H, _, _ = compute_hist2d(samples, width, height, bins_x=args.bins)
        title = f"Minute {i + 1}"
        plot_heatmap(ax, H, width, height, cmap=args.cmap, title=title)

    # Bottom overall heatmap across all 10 minutes
    ax_overall = fig.add_subplot(gs[2, :])
    H_all, _, _ = compute_hist2d(all_samples, width, height, bins_x=args.bins)
    overall_title = f"Overall Heatmap (10 minutes)"
    plot_heatmap(ax_overall, H_all, width, height, cmap=args.cmap, title=overall_title)

    # Optional: add a single colorbar for overall heatmap counts
    # Create an invisible mappable to tie the colorbar to the overall heatmap scale
    im = ax_overall.images[0] if ax_overall.images else None
    if im is not None:
        cbar = fig.colorbar(im, ax=ax_overall, fraction=0.035, pad=0.02)
        cbar.set_label("Gaze density", rotation=90)

    suptitle_left = data.get("userInitials", "Unknown")
    suptitle_right = os.path.basename(data.get("video", "video"))
    fig.suptitle(f"Gaze Heatmaps — {suptitle_left} — {suptitle_right}", fontsize=14)

    # If no output specified, save to root experimentalData folder by default
    if not args.output:
        script_dir = os.path.dirname(__file__)
        root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
        out_dir = os.path.join(root_dir, "experimentalData")
        base = os.path.splitext(os.path.basename(args.input))[0] or "gaze_heatmaps"
        args.output = os.path.join(out_dir, f"{base}_gaze_heatmaps.png")
    else:
        out_dir = os.path.dirname(args.output) or ""

    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    fig.savefig(args.output, dpi=args.dpi)
    print(f"Saved heatmaps to: {args.output}")


if __name__ == "__main__":
    main()
