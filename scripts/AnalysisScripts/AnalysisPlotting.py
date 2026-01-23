#!/usr/bin/env python3
"""
Eye Gaze Analysis Tool.

Copyright 2025 Michael Ryan Hunsaker, M.Ed., Ph.D.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License:
https://www.apache.org/licenses/LICENSE-2.0

Overview
--------
Loads experimental eye-gaze JSON data, computes target vs non-target percentage viewing times, and generates:
  - scatter_plots.png: Raw gaze point cloud with KDE-derived concentration ellipse
  - trajectory_plots.png: Sequential gaze vectors color-coded by cardinal/intercardinal direction
  - trial_percentage_plots.png: Per-trial percentage dwelling time (Left/Center/Right) with target highlight
  - trial_count_plots.png: Per-trial sample counts (Left/Center/Right) with target highlight
  - trial_time_plots.png: Per-trial percentage of total temporal gaze allocation (Left/Center/Right) with target highlight
  - violin_plot.png: Distribution of target vs non-target percentage times
  - <name>.md: Comprehensive Markdown report (descriptive + inferential stats + figures)

Usage
-----
    python AnalysisPlotting.py path/to/data.json

JSON Schema (simplified)
------------------------
{
  "trialData": [
    {
      "type": "1" | "2",
      "trialNumber": int,
      "gazeData": [{ "x": float, "y": float, "time": float }, ...],
      "positions": [{ "position": "left" | "center" | "right", "isTarget": bool }, ...]
    },
    ...
  ]
}
"""

# coding=utf-8

import argparse
import json
import os
import shutil

from typing import Any
from typing import Dict
from typing import List
from typing import Tuple

import matplotlib


# Use non-interactive backend for headless environments
matplotlib.use("Agg")

# Helper utilities for color assignment, target annotation, and aggregation.
# Dynamic grid reinstated for per-trial plots to scale figure size to number of trials.


def create_dynamic_grid(
    n_items: int,
    cols: int = 5,
    base_width: float = 10.5,
    base_height: float = 8.0,
    dpi: int = 100,
):
    """
    Create a dynamic matplotlib subplot grid sized to the number of items.

    Parameters
    ----------
    n_items : int
        Number of panels (e.g., trials) to plot.
    cols : int
        Number of columns in the subplot grid.
    base_width : float
        Base figure width (inches) used for original fixed grid.
    base_height : float
        Base figure height (inches) for an 8-row reference.
    dpi : int
        Figure DPI.

    Returns
    -------
    fig : matplotlib.figure.Figure
        Created figure object.
    axes : list[matplotlib.axes.Axes]
        Flattened list of axes sized to contain n_items (excess axes hidden).
    rows : int
        Number of rows computed.
    cols : int
        Number of columns (echo of input for convenience).
    """
    import math

    rows = max(1, math.ceil(n_items / cols))
    height_scale = rows / 8.0
    fig, ax_grid = plt.subplots(
        rows, cols, figsize=(base_width, base_height * height_scale), dpi=dpi
    )
    axes = ax_grid.flatten() if isinstance(ax_grid, np.ndarray) else [ax_grid]
    # Hide unused axes
    for i in range(rows * cols):
        if i >= n_items:
            axes[i].set_visible(False)
    return fig, axes, rows, cols


def build_position_legend(fig: "matplotlib.figure.Figure") -> None:
    """
    Attach a standardized legend (target + positional foil colors) to the provided figure.

    Parameters
    ----------
    fig : matplotlib.figure.Figure
        Target figure for legend placement.
    """
    legend_elements = [
        Line2D([0], [0], color=TARGET_BAR_COLOR, lw=6, label="Target (Blue)"),
        Line2D([0], [0], color=POSITION_COLOR_MAP["left"], lw=6, label="Foil Left"),
        Line2D([0], [0], color=POSITION_COLOR_MAP["center"], lw=6, label="Foil Center"),
        Line2D([0], [0], color=POSITION_COLOR_MAP["right"], lw=6, label="Foil Right"),
    ]
    legend = fig.legend(
        handles=legend_elements,
        loc="lower center",
        ncol=4,
        frameon=True,
        facecolor="black",
        edgecolor="white",
        fontsize=8,
    )
    for text in legend.get_texts():
        text.set_color("white")


POSITION_COLOR_MAP = {
    "left": (1, 0.5, 0, 0.7),
    "center": (0.7, 0.7, 0.7, 0.7),
    "right": (0, 1, 0, 0.7),
}
TARGET_BAR_COLOR = (0, 0, 1, 0.85)  # Blue highlight for target bar


# Position legend helper removed (legend creation now in-place where needed).


# Removed aggregate_position_times (no longer used after position summary removal).


def get_trial_target_position(trial: Dict[str, Any]) -> str | None:
    """
    Return target spatial position for a trial if present.

    Parameters
    ----------
    trial : dict
        Trial dictionary containing a 'positions' list of objects with
        keys 'position' (left|center|right) and 'isTarget' (bool).

    Returns
    -------
    str | None
        'left', 'center', or 'right' if a target exists; otherwise None.
    """
    positions = trial.get("positions", [])
    for entry in positions:
        if entry.get("isTarget"):
            return entry.get("position")
    return None


import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


def safe_kde(x_coords: List[float], y_coords: List[float]):
    """
    Safely compute a gaussian KDE. Returns None if KDE cannot be computed.
    Falls back to using simple min/max and mean-based center if insufficient data.
    """
    try:
        if len(x_coords) < 5:
            raise ValueError("Insufficient points (<5) for KDE")
        return gaussian_kde([x_coords, y_coords])
    except Exception as e:
        print(f"[WARN] safe_kde fallback engaged: {e}")
        return None


from matplotlib.legend_handler import HandlerTuple
from matplotlib.lines import Line2D
from matplotlib.patches import Ellipse
from matplotlib.patches import Rectangle
from scipy.stats import f_oneway
from scipy.stats import gaussian_kde
from scipy.stats import levene
from scipy.stats import shapiro
from scipy.stats import ttest_ind
from scipy.stats import wilcoxon


def generate_table(headers: List[str], data: List[List[Any]]) -> str:
    """
    Generate a Markdown table from headers and data.

    Args:
        headers: List of column headers for the table
        data: List of rows, where each row is a list of values

    Returns:
        str: Formatted Markdown table string
    """
    column_widths = [
        max(len(str(item)) for item in col) for col in zip(*([headers] + data))
    ]
    table = (
        "| "
        + " | ".join(
            [header.ljust(width) for header, width in zip(headers, column_widths)]
        )
        + " |\n"
    )
    separator = "| " + " | ".join(["-" * width for width in column_widths]) + " |\n"
    table += separator
    for row in data:
        table += (
            "| "
            + " | ".join(
                [f"{str(cell).ljust(width)}" for cell, width in zip(row, column_widths)]
            )
            + " |\n"
        )
    return table


def print_markdown_description(description: str) -> str:
    """
    Format a description as a Markdown header.

    Args:
        description: Text to be formatted as header

    Returns:
        str: Markdown formatted header
    """
    return f"### {description}\n"


def format_difference(difference: float) -> str:
    """
    Format a numerical difference with color coding for negative values.

    Args:
        difference: Numerical difference to format

    Returns:
        str: HTML-formatted string with color coding
    """
    if difference < 0:
        return f'<span style="color:red">{difference:.2f}</span>'  # Indicating negative with bold
    else:
        return f"{difference:.2f}"


def format_pvalue(pvalue: float) -> str:
    """
    Format a p-value with color coding for significant values.

    Args:
        pvalue: P-value to format

    Returns:
        str: HTML-formatted string with color coding
    """
    if pvalue < 0.05:
        return f'<span style="color:red">{pvalue:.6f}</span>'  # Indicating significant p-value with red
    else:
        return f"{pvalue:.6f}"


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Process JSON file and generate Markdown report."
    )
    parser.add_argument(
        "json_file_path", type=str, help="The full path to the JSON file"
    )
    return parser.parse_args()


def load_json_data(json_file_path: str) -> dict:
    """Load and return JSON data from file."""
    with open(json_file_path, "r") as file:
        return json.load(file)


def get_unique_folder_path(base_path: str) -> str:
    """
    Generate a unique folder path by appending a number if the folder exists.

    Args:
        base_path: The initial folder path to check

    Returns:
        str: A unique folder path
    """
    if not os.path.exists(base_path):
        return base_path

    counter = 1
    while True:
        numbered_path = f"{base_path}({counter})"
        if not os.path.exists(numbered_path):
            return numbered_path
        counter += 1


def setup_output_directory(json_file_path: str) -> Tuple[str, str]:
    """Create output directory and return paths."""
    json_file_name = os.path.splitext(os.path.basename(json_file_path))[0]
    base_output_folder = os.path.join("./data", json_file_name)

    # Get a unique folder path
    output_folder = get_unique_folder_path(base_output_folder)

    os.makedirs(output_folder, exist_ok=True)

    # Copy the JSON file to the output folder
    json_destination = os.path.join(output_folder, os.path.basename(json_file_path))
    shutil.copy2(json_file_path, json_destination)
    return output_folder, json_file_name


def determine_position(x: float) -> str:
    """
    Determine the screen position based on x-coordinate.

    Args:
        x: X-coordinate value

    Returns:
        str: Position category ('left', 'center', or 'right')
    """
    if x < 0:
        return "left"
    elif x > 0 and x < 1000:  # Adjust based on screen dimensions
        return "center"
    else:
        return "right"


def process_trial_data(
    trial_data: List[Dict[str, Any]],
) -> Dict[str, Dict[str, List[float]]]:
    """
    Convert raw trial gaze data into target/non-target percentage summaries per trial type.

    Parameters
    ----------
    trial_data : list[dict]
        List of trial dictionaries each containing:
        - "type": str
        - "gazeData": list of { "x": float, "y": float, "time": float }
        - "positions": list of { "position": str, "isTarget": bool }

    Returns
    -------
    dict
        Nested dict: { trial_type: { "target": [percentages], "non_target": [percentages] } }.
        Percentages are (count of gaze samples at target/non-target position) / total samples * 100.
    """
    types_data: Dict[str, Dict[str, List[float]]] = {
        "1": {"target": [], "non_target": []},
        "2": {"target": [], "non_target": []},
    }

    for trial in trial_data:
        trial_type = trial.get("type")
        gaze_data = trial.get("gazeData", [])
        if not gaze_data or trial_type not in types_data:
            continue

        positions = trial.get("positions", [])
        target_pos = next((p["position"] for p in positions if p.get("isTarget")), None)
        non_target_pos = next(
            (p["position"] for p in positions if not p.get("isTarget")), None
        )

        total_samples = len(gaze_data)
        if total_samples == 0:
            continue

        # Count samples at target position
        if target_pos:
            target_count = sum(
                1
                for g in gaze_data
                if determine_position(g.get("x", 0.0)) == target_pos
            )
            types_data[trial_type]["target"].append(
                target_count / total_samples * 100.0
            )

        # Count samples at first non-target position
        if non_target_pos:
            non_target_count = sum(
                1
                for g in gaze_data
                if determine_position(g.get("x", 0.0)) == non_target_pos
            )
            types_data[trial_type]["non_target"].append(
                non_target_count / total_samples * 100.0
            )

    return types_data


def create_scatter_plots(trial_data: List[dict], output_folder: str) -> str:
    """Create and save scatter plots (robust to KDE failures)."""
    print("[INFO] Generating scatter_plots.png")
    try:
        fig, axes = plt.subplots(8, 5, figsize=(10.5, 8), dpi=100)
        axes = axes.flatten()

        for ax in axes:
            ax.set_facecolor("black")

        for i, trial in enumerate(trial_data):
            if i >= len(axes):
                break
            gaze_data = trial.get("gazeData", [])
            if not gaze_data:
                continue
            x_coords = [point["x"] for point in gaze_data]
            y_coords = [point["y"] for point in gaze_data]

            if not x_coords or not y_coords:
                continue

            x_min, x_max = min(x_coords), max(x_coords)
            y_min, y_max = min(y_coords), max(y_coords)

            # Determine center via KDE if possible, otherwise mean
            kde = safe_kde(x_coords, y_coords)
            if kde:
                try:
                    x_grid, y_grid = np.mgrid[x_min:x_max:100j, y_min:y_max:100j]
                    density = kde(np.vstack([x_grid.flatten(), y_grid.flatten()]))
                    density_reshaped = density.reshape(x_grid.shape)
                    max_density_index = np.unravel_index(
                        np.argmax(density_reshaped), density_reshaped.shape
                    )
                    center_x = x_grid[max_density_index]
                    center_y = y_grid[max_density_index]
                except Exception as e:
                    print(f"[WARN] KDE evaluation failed in scatter plot: {e}")
                    center_x = float(np.mean(x_coords))
                    center_y = float(np.mean(y_coords))
            else:
                center_x = float(np.mean(x_coords))
                center_y = float(np.mean(y_coords))

            semi_major_axis = (x_max - x_min) / 3 if x_max != x_min else 1
            semi_minor_axis = (y_max - y_min) / 3 if y_max != y_min else 1

            axes[i].scatter(x_coords, y_coords, c="yellow", alpha=0.75, s=10)

            # Draw the panel/view outline (thin white rectangle)
            try:
                view_rect = Rectangle(
                    (x_min, y_min),
                    x_max - x_min if x_max > x_min else 1,
                    y_max - y_min if y_max > y_min else 1,
                    edgecolor="white",
                    linewidth=0.8,
                    fill=False,
                    zorder=3,
                )
                axes[i].add_patch(view_rect)
            except Exception:
                # ignore if bounding box cannot be drawn
                pass

            # Helper to get object coordinates from trial positions or map labels to coords
            positions = trial.get("positions", [])

            def get_obj_coord(pos_entry):
                # If explicit coordinates are available, use them
                if (
                    isinstance(pos_entry, dict)
                    and "x" in pos_entry
                    and "y" in pos_entry
                ):
                    return float(pos_entry["x"]), float(pos_entry["y"])
                # Otherwise map left/center/right labels into the current view bounds
                label = (
                    pos_entry.get("position")
                    if isinstance(pos_entry, dict)
                    else pos_entry
                )
                label = str(label).lower() if label is not None else None
                if label == "left":
                    x = x_min + 0.1 * (x_max - x_min)
                elif label == "center":
                    x = x_min + 0.5 * (x_max - x_min)
                elif label == "right":
                    x = x_min + 0.9 * (x_max - x_min)
                else:
                    x = (x_min + x_max) / 2.0
                y = y_min + 0.5 * (y_max - y_min)
                return float(x), float(y)

            # Determine and draw ovals for object positions
            # Target: red (prefer position coords if present), Non-targets: thin white
            target_drawn = False
            # First, find a target entry if present to draw red at correct location
            for pos_entry in positions:
                if isinstance(pos_entry, dict) and pos_entry.get("isTarget"):
                    try:
                        tx, ty = get_obj_coord(pos_entry)
                        red_ellipse = Ellipse(
                            (tx, ty),
                            width=1 * semi_major_axis,
                            height=2.2 * semi_minor_axis,
                            angle=0,
                            edgecolor="red",
                            fill=False,
                            linewidth=2,
                            zorder=4,
                        )
                        axes[i].add_patch(red_ellipse)
                        target_drawn = True
                        break
                    except Exception:
                        continue

            # If no explicit target in positions, keep KDE/mean-based red ellipse
            if not target_drawn:
                ellipse = Ellipse(
                    (center_x, center_y),
                    width=1 * semi_major_axis,
                    height=2.2 * semi_minor_axis,
                    angle=0,
                    edgecolor="red",
                    fill=False,
                    linewidth=2,
                    zorder=2.5,
                )
                axes[i].add_patch(ellipse)

            # Draw white ovals for the other objects (non-targets)
            for pos_entry in positions:
                try:
                    is_target = isinstance(pos_entry, dict) and pos_entry.get(
                        "isTarget"
                    )
                    if is_target:
                        continue
                    ox, oy = get_obj_coord(pos_entry)
                    white_ellipse = Ellipse(
                        (ox, oy),
                        width=0.8 * semi_major_axis,
                        height=1.8 * semi_minor_axis,
                        angle=0,
                        edgecolor="white",
                        fill=False,
                        linewidth=1,
                        alpha=0.9,
                        zorder=3.5,
                    )
                    axes[i].add_patch(white_ellipse)
                except Exception:
                    continue

            axes[i].set_title(
                f"Trial {trial.get('trialNumber', '?')}, Type {trial.get('type', '?')}",
                fontsize=6,
                color="white",
            )
            axes[i].axis("off")

        plt.tight_layout()
        scatter_plot_path = os.path.join(output_folder, "scatter_plots.png")
        plt.savefig(scatter_plot_path, facecolor="black")
        print(f"[INFO] Saved scatter plots to {scatter_plot_path}")
        return scatter_plot_path
    except Exception as e:
        print(f"[ERROR] Failed to generate scatter plots: {e}")
        # Attempt to still write an empty figure to avoid downstream failures
        fallback_path = os.path.join(output_folder, "scatter_plots.png")
        try:
            plt.figure(figsize=(4, 3))
            plt.text(
                0.5, 0.5, "Scatter Plot Failure", ha="center", va="center", color="red"
            )
            plt.axis("off")
            plt.savefig(fallback_path, facecolor="black")
            print(f"[INFO] Wrote fallback scatter plot figure to {fallback_path}")
        finally:
            plt.close()
        return fallback_path


def create_trial_percentage_plots(trial_data: List[dict], output_folder: str) -> str:
    """
    Create per-trial plots showing % time for Left / Center / Right with target highlight (dynamic grid).
    If individual foil positions are unavailable (e.g., fewer than 2 non-target positions),
    the combined non-target time is evenly divided and labeled as scaled.
    """
    print("[INFO] Generating trial_percentage_plots.png")
    try:
        fig, axes, _, _ = create_dynamic_grid(
            len(trial_data), cols=5, base_width=10.5, base_height=8.0, dpi=100
        )
        for ax in axes:
            ax.set_facecolor("black")

        for i, trial in enumerate(trial_data):
            if i >= len(axes):
                break
            gaze_data = trial.get("gazeData", [])
            if not gaze_data:
                continue

            positions = trial.get("positions", [])
            target_positions = [p for p in positions if p.get("isTarget")]
            foil_positions = [p for p in positions if not p.get("isTarget")]

            target_pos = target_positions[0]["position"] if target_positions else None
            foil1_pos = (
                foil_positions[0]["position"] if len(foil_positions) > 0 else None
            )
            foil2_pos = (
                foil_positions[1]["position"] if len(foil_positions) > 1 else None
            )

            total_time = sum(pt.get("time", 0.0) for pt in gaze_data)
            if total_time <= 0:
                axes[i].text(
                    0.5,
                    0.5,
                    "Error: zero total time",
                    transform=axes[i].transAxes,
                    ha="center",
                    va="center",
                    fontsize=8,
                    color="red",
                )
                axes[i].set_title(
                    f"Trial {trial.get('trialNumber', '?')} % Time",
                    fontsize=6,
                    color="white",
                )
                axes[i].axis("off")
                continue

            def time_for_position(pos):
                if not pos:
                    return 0.0
                return sum(
                    pt.get("time", 0.0)
                    for pt in gaze_data
                    if determine_position(pt.get("x", 0.0)) == pos
                )

            target_time = time_for_position(target_pos)
            foil1_time = time_for_position(foil1_pos)
            foil2_time = time_for_position(foil2_pos)

            scaled = False
            # If we do not have two distinct foils, scale the combined non-target time
            if foil1_pos is None or foil2_pos is None:
                combined_non_target_time = total_time - target_time
                foil1_time = combined_non_target_time / 2.0
                foil2_time = combined_non_target_time / 2.0
                scaled = True

            # Convert to percentages
            if total_time > 0:
                # target_pct unused in reordered logic (removed)
                # foil1_pct unused in reordered logic (removed)
                # foil2_pct unused in reordered logic (removed)
                pass  # explicit no-op after removing legacy percentage variables
            else:
                # explicit else to satisfy block structure after refactor
                pass
            # (Removed unused percentage variables for target/foils.)

            # Build foil labels based on their screen positions (left/center/right)
            # Exclude the target position from foil labeling
            position_label_map = {
                "left": "Foil Left",
                "center": "Foil Center",
                "right": "Foil Right",
            }
            foil_times = {}
            if not scaled:
                # Use actual foil positions
                if foil1_pos:
                    foil_times[foil1_pos] = foil1_time
                if foil2_pos:
                    foil_times[foil2_pos] = foil2_time
            else:
                # Scaled case: split combined non-target between two generic foil placeholders
                # Choose two foil position labels not equal to target (priority order: left, center, right)
                candidate_positions = [
                    p for p in ["left", "center", "right"] if p != target_pos
                ]
                if len(candidate_positions) >= 2:
                    foil_times[candidate_positions[0]] = foil1_time
                    foil_times[candidate_positions[1]] = foil2_time
                elif len(candidate_positions) == 1:
                    # Only one position available, duplicate with scaled tag
                    foil_times[candidate_positions[0]] = foil1_time + foil2_time
            # Order foils by spatial priority left -> center -> right
            ordered_foils = [
                p
                for p in ["left", "center", "right"]
                if p in foil_times and p != target_pos
            ]
            # Ensure we have at most two foil entries
            ordered_foils = ordered_foils[:2]
            # Prepare labels and values
            foil_labels = []
            foil_values = []
            for p in ordered_foils:
                base_label = position_label_map.get(p, "Foil")
                if scaled:
                    base_label += " (Scaled)"
                foil_labels.append(base_label)
                foil_values.append(
                    (foil_times[p] / total_time * 100.0) if total_time > 0 else 0.0
                )
            # If fewer than 2 foils after processing (edge case), pad with zeros
            while len(foil_labels) < 2:
                filler_label = "Foil (Scaled)" if scaled else "Foil"
                foil_labels.append(filler_label)
                foil_values.append(0.0)
            # (Removed unused target_label variable.)
            # Reworked: enforce Left / Center / Right ordering with target highlight
            left_time = time_for_position("left")
            center_time = time_for_position("center")
            right_time = time_for_position("right")
            if total_time > 0:
                left_pct = left_time / total_time * 100.0
                center_pct = center_time / total_time * 100.0
                right_pct = right_time / total_time * 100.0
            else:
                left_pct = center_pct = right_pct = 0.0
            labels = ["Left", "Center", "Right"]
            values = [left_pct, center_pct, right_pct]
            base_color_map = {
                "Left": (1, 0.5, 0, 0.7),
                "Center": (0.7, 0.7, 0.7, 0.7),
                "Right": (0, 1, 0, 0.7),
            }
            target_color = (0, 0, 1, 0.85)
            colors = [
                target_color
                if lbl.lower() == (target_pos or "")
                else base_color_map[lbl]
                for lbl in labels
            ]
            bars = axes[i].bar(labels, values, color=colors)
            axes[i].set_ylim(0, 100)
            axes[i].set_title(
                f"Trial {trial.get('trialNumber', '?')} % Time",
                fontsize=6,
                color="white",
            )

            for bar, val, lbl in zip(bars, values, labels):
                axes[i].text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + 1,
                    f"{val:.1f}%",
                    ha="center",
                    va="bottom",
                    fontsize=6,
                    color="white",
                )
                if lbl == "Target":
                    axes[i].text(
                        bar.get_x() + bar.get_width() / 2,
                        bar.get_height() + 4,
                        "Target",
                        ha="center",
                        va="bottom",
                        fontsize=6,
                        color="cyan",
                    )

            axes[i].tick_params(axis="x", colors="white", labelsize=6)
            axes[i].tick_params(axis="y", colors="white", labelsize=6)
            axes[i].spines["bottom"].set_color("white")
            axes[i].spines["left"].set_color("white")
            axes[i].spines["top"].set_visible(False)
            axes[i].spines["right"].set_visible(False)

        plt.tight_layout()
        # Position legend
        build_position_legend(fig)
        percentage_plot_path = os.path.join(output_folder, "trial_percentage_plots.png")
        plt.savefig(percentage_plot_path, facecolor="black")
        print(f"[INFO] Saved trial percentage plots to {percentage_plot_path}")
    except Exception as e:
        print(f"[ERROR] Failed to generate trial percentage plots: {e}")
        percentage_plot_path = os.path.join(output_folder, "trial_percentage_plots.png")
        plt.figure(figsize=(4, 3))
        plt.text(
            0.5,
            0.5,
            "Trial Percentage Plot Failure",
            ha="center",
            va="center",
            color="red",
        )
        plt.axis("off")
        plt.savefig(percentage_plot_path, facecolor="black")
    finally:
        plt.close()
    return percentage_plot_path


def create_trial_count_plots(trial_data: List[dict], output_folder: str) -> str:
    """
    Create per-trial plots showing number of observations for Left / Center / Right with target highlight (dynamic grid).
    If individual foils cannot be distinguished (fewer than 2 non-target position entries),
    the combined non-target count is evenly divided and labeled as scaled.
    """
    print("[INFO] Generating trial_count_plots.png")
    try:
        fig, axes, _, _ = create_dynamic_grid(
            len(trial_data), cols=5, base_width=10.5, base_height=8.0, dpi=100
        )
        for ax in axes:
            ax.set_facecolor("black")

        for i, trial in enumerate(trial_data):
            if i >= len(axes):
                break
            gaze_data = trial.get("gazeData", [])
            if not gaze_data:
                continue

            positions = trial.get("positions", [])
            target_positions = [p for p in positions if p.get("isTarget")]
            foil_positions = [p for p in positions if not p.get("isTarget")]

            target_pos = target_positions[0]["position"] if target_positions else None
            foil1_pos = (
                foil_positions[0]["position"] if len(foil_positions) > 0 else None
            )
            foil2_pos = (
                foil_positions[1]["position"] if len(foil_positions) > 1 else None
            )

            def count_for_position(pos):
                if not pos:
                    return 0
                return sum(
                    1 for pt in gaze_data if determine_position(pt.get("x", 0.0)) == pos
                )

            target_count = count_for_position(target_pos)
            foil1_count = count_for_position(foil1_pos)
            foil2_count = count_for_position(foil2_pos)

            scaled = False
            if foil1_pos is None or foil2_pos is None:
                combined_non_target = len(gaze_data) - target_count
                foil1_count = combined_non_target // 2
                foil2_count = combined_non_target - foil1_count
                scaled = True

            # Build foil labels for counts based on screen positions
            position_label_map = {
                "left": "Foil Left",
                "center": "Foil Center",
                "right": "Foil Right",
            }
            foil_counts = {}
            if not scaled:
                if foil1_pos:
                    foil_counts[foil1_pos] = foil1_count
                if foil2_pos:
                    foil_counts[foil2_pos] = foil2_count
            else:
                candidate_positions = [
                    p for p in ["left", "center", "right"] if p != target_pos
                ]
                if len(candidate_positions) >= 2:
                    foil_counts[candidate_positions[0]] = foil1_count
                    foil_counts[candidate_positions[1]] = foil2_count
                elif len(candidate_positions) == 1:
                    foil_counts[candidate_positions[0]] = foil1_count + foil2_count
            ordered_foils = [
                p
                for p in ["left", "center", "right"]
                if p in foil_counts and p != target_pos
            ]
            ordered_foils = ordered_foils[:2]
            foil_labels = []
            foil_values = []
            for p in ordered_foils:
                base_label = position_label_map.get(p, "Foil")
                if scaled:
                    base_label += " (Scaled)"
                foil_labels.append(base_label)
                foil_values.append(foil_counts[p])
            while len(foil_labels) < 2:
                filler_label = "Foil (Scaled)" if scaled else "Foil"
                foil_labels.append(filler_label)
                foil_values.append(0)
            # Reworked: Left / Center / Right ordering with target highlight for counts
            left_count = count_for_position("left")
            center_count = count_for_position("center")
            right_count = count_for_position("right")
            labels = ["Left", "Center", "Right"]
            values = [left_count, center_count, right_count]
            base_color_map = {
                "Left": (1, 0.5, 0, 0.7),
                "Center": (0.7, 0.7, 0.7, 0.7),
                "Right": (0, 1, 0, 0.7),
            }
            target_color = (0, 0, 1, 0.85)
            colors = [
                target_color
                if lbl.lower() == (target_pos or "")
                else base_color_map[lbl]
                for lbl in labels
            ]
            bars = axes[i].bar(labels, values, color=colors)
            axes[i].set_title(
                f"Trial {trial.get('trialNumber', '?')} Counts",
                fontsize=6,
                color="white",
            )
            max_val = max(values + [1])
            axes[i].set_ylim(0, max_val * 1.15)

            for bar, val, lbl in zip(bars, values, labels):
                axes[i].text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + (max_val * 0.02),
                    f"{val}",
                    ha="center",
                    va="bottom",
                    fontsize=6,
                    color="white",
                )
                if lbl == "Target":
                    axes[i].text(
                        bar.get_x() + bar.get_width() / 2,
                        bar.get_height() + (max_val * 0.05),
                        "Target",
                        ha="center",
                        va="bottom",
                        fontsize=6,
                        color="cyan",
                    )

            axes[i].tick_params(axis="x", colors="white", labelsize=6)
            axes[i].tick_params(axis="y", colors="white", labelsize=6)
            axes[i].spines["bottom"].set_color("white")
            axes[i].spines["left"].set_color("white")
            axes[i].spines["top"].set_visible(False)
            axes[i].spines["right"].set_visible(False)

        plt.tight_layout()
        build_position_legend(fig)
        count_plot_path = os.path.join(output_folder, "trial_count_plots.png")
        plt.savefig(count_plot_path, facecolor="black")
        print(f"[INFO] Saved trial count plots to {count_plot_path}")
    except Exception as e:
        print(f"[ERROR] Failed to generate trial count plots: {e}")
        count_plot_path = os.path.join(output_folder, "trial_count_plots.png")
        plt.figure(figsize=(4, 3))
        plt.text(
            0.5, 0.5, "Trial Count Plot Failure", ha="center", va="center", color="red"
        )
        plt.axis("off")
        plt.savefig(count_plot_path, facecolor="black")
    finally:
        plt.close()
    return count_plot_path


def create_trajectory_plots(trial_data: List[dict], output_folder: str) -> str:
    """
    Create trajectory plots with vectors between consecutive gaze points,
    color-coded by direction (N, S, E, W, NE, NW, SE, SW).
    Each subplot is twice as large in width and height compared to scatter plots.
    Robust to KDE or data issues; logs progress.
    """
    print("[INFO] Generating trajectory_plots.png")
    # Colors (RGBA)
    base_colors = {
        "N": (0, 0, 1, 0.85),
        "S": (1, 0, 0, 0.85),
        "E": (0, 1, 0, 0.85),
        "W": (1, 0.5, 0, 0.85),
    }

    def blend(c1, c2):
        return tuple((c1[i] + c2[i]) / 2 for i in range(4))

    direction_colors = {
        "N": base_colors["N"],
        "S": base_colors["S"],
        "E": base_colors["E"],
        "W": base_colors["W"],
        "NE": blend(base_colors["N"], base_colors["E"]),
        "NW": blend(base_colors["N"], base_colors["W"]),
        "SE": blend(base_colors["S"], base_colors["E"]),
        "SW": blend(base_colors["S"], base_colors["W"]),
    }

    fig, axes = plt.subplots(8, 5, figsize=(21, 16), dpi=100)  # doubled size
    axes = axes.flatten()
    for ax in axes:
        ax.set_facecolor("black")

    def classify_direction(dx, dy):
        angle = np.degrees(np.arctan2(dy, dx))
        # Normalize angle to (-180,180]
        if -22.5 < angle <= 22.5:
            return "E"
        if 22.5 < angle <= 67.5:
            return "NE"
        if 67.5 < angle <= 112.5:
            return "N"
        if 112.5 < angle <= 157.5:
            return "NW"
        if angle > 157.5 or angle <= -157.5:
            return "W"
        if -157.5 < angle <= -112.5:
            return "SW"
        if -112.5 < angle <= -67.5:
            return "S"
        if -67.5 < angle <= -22.5:
            return "SE"
        return "E"

    for i, trial in enumerate(trial_data):
        if i >= len(axes):
            break
        gaze = trial.get("gazeData", [])
        if len(gaze) < 2:
            continue
        x = [p["x"] for p in gaze]
        y = [p["y"] for p in gaze]

        x_min, x_max = min(x), max(x)
        y_min, y_max = min(y), max(y)

        # Plot points
        axes[i].scatter(x, y, c="yellow", s=5, alpha=0.6)

        # Draw panel view outline
        try:
            view_rect = Rectangle(
                (x_min, y_min),
                x_max - x_min if x_max > x_min else 1,
                y_max - y_min if y_max > y_min else 1,
                edgecolor="white",
                linewidth=0.8,
                fill=False,
                zorder=3,
            )
            axes[i].add_patch(view_rect)
        except Exception:
            pass

        # Ellipse center via safe KDE fallback or target position if available
        try:
            kde = safe_kde(x, y)
            if kde:
                x_grid, y_grid = np.mgrid[x_min:x_max:100j, y_min:y_max:100j]
                density = kde(np.vstack([x_grid.flatten(), y_grid.flatten()]))
                density_reshaped = density.reshape(x_grid.shape)
                max_density_index = np.unravel_index(
                    np.argmax(density_reshaped), density_reshaped.shape
                )
                center_x = x_grid[max_density_index]
                center_y = y_grid[max_density_index]
            else:
                center_x = float(np.mean(x))
                center_y = float(np.mean(y))
            semi_major_axis = (x_max - x_min) / 3 if x_max != x_min else 1
            semi_minor_axis = (y_max - y_min) / 3 if y_max != y_min else 1
        except Exception as e:
            print(
                f"[WARN] Ellipse fallback in trajectory plot trial {trial.get('trialNumber', '?')}: {e}"
            )
            center_x = float(np.mean(x))
            center_y = float(np.mean(y))
            semi_major_axis = 1
            semi_minor_axis = 1

        # Helper to get object coordinates from trial positions or map labels to coords
        positions = trial.get("positions", [])

        def get_obj_coord(pos_entry):
            if isinstance(pos_entry, dict) and "x" in pos_entry and "y" in pos_entry:
                return float(pos_entry["x"]), float(pos_entry["y"])
            label = (
                pos_entry.get("position") if isinstance(pos_entry, dict) else pos_entry
            )
            label = str(label).lower() if label is not None else None
            if label == "left":
                ox = x_min + 0.1 * (x_max - x_min)
            elif label == "center":
                ox = x_min + 0.5 * (x_max - x_min)
            elif label == "right":
                ox = x_min + 0.9 * (x_max - x_min)
            else:
                ox = (x_min + x_max) / 2.0
            oy = y_min + 0.5 * (y_max - y_min)
            return float(ox), float(oy)

        # Draw red ellipse at target position if provided
        target_drawn = False
        for pos_entry in positions:
            if isinstance(pos_entry, dict) and pos_entry.get("isTarget"):
                try:
                    tx, ty = get_obj_coord(pos_entry)
                    red_ellipse = Ellipse(
                        (tx, ty),
                        width=1 * semi_major_axis,
                        height=2.2 * semi_minor_axis,
                        angle=0,
                        edgecolor="red",
                        fill=False,
                        linewidth=2,
                        zorder=4,
                    )
                    axes[i].add_patch(red_ellipse)
                    target_drawn = True
                    break
                except Exception:
                    continue
        if not target_drawn:
            # fallback to KDE/mean center
            red_ellipse = Ellipse(
                (center_x, center_y),
                width=1 * semi_major_axis,
                height=2.2 * semi_minor_axis,
                angle=0,
                edgecolor="red",
                fill=False,
                linewidth=2,
                zorder=2.5,
            )
            axes[i].add_patch(red_ellipse)

        # Draw white ovals for other two objects
        for pos_entry in positions:
            try:
                is_target = isinstance(pos_entry, dict) and pos_entry.get("isTarget")
                if is_target:
                    continue
                ox, oy = get_obj_coord(pos_entry)
                white_ellipse = Ellipse(
                    (ox, oy),
                    width=0.8 * semi_major_axis,
                    height=1.8 * semi_minor_axis,
                    angle=0,
                    edgecolor="white",
                    fill=False,
                    linewidth=1,
                    alpha=0.9,
                    zorder=3.5,
                )
                axes[i].add_patch(white_ellipse)
            except Exception:
                continue

        # Vectors
        for idx in range(len(gaze) - 1):
            x1, y1 = x[idx], y[idx]
            x2, y2 = x[idx + 1], y[idx + 1]
            dx = x2 - x1
            dy = y2 - y1
            direction = classify_direction(dx, dy)
            color = direction_colors[direction]
            axes[i].plot([x1, x2], [y1, y2], color=color, linewidth=1, zorder=2)

        axes[i].set_title(
            f"Trial {trial.get('trialNumber', '?')} Trajectory",
            fontsize=8,
            color="white",
        )
        axes[i].axis("off")

    # Construct legend manually
    legend_elements = [
        Line2D([0], [0], color=direction_colors[d], lw=3, label=d)
        for d in ["N", "S", "E", "W", "NE", "NW", "SE", "SW"]
    ]
    fig.legend(
        handles=legend_elements,
        loc="lower center",
        ncol=8,
        frameon=True,
        facecolor="black",
        edgecolor="white",
        fontsize=8,
    )
    trajectory_plot_path = os.path.join(output_folder, "trajectory_plots.png")
    try:
        plt.tight_layout(rect=(0, 0.05, 1, 1))
        plt.savefig(trajectory_plot_path, facecolor="black")
        print(f"[INFO] Saved trajectory plots to {trajectory_plot_path}")
    except Exception as e:
        print(f"[ERROR] Failed saving trajectory plots: {e}")
        plt.figure(figsize=(4, 3))
        plt.text(
            0.5, 0.5, "Trajectory Plot Failure", ha="center", va="center", color="red"
        )
        plt.axis("off")
        fb = os.path.join(output_folder, "trajectory_plots.png")
        plt.savefig(fb, facecolor="black")
        trajectory_plot_path = fb
    finally:
        plt.close()
    return trajectory_plot_path


def create_trial_time_plots(trial_data: List[dict], output_folder: str) -> str:
    """
    Create per-trial plots showing percentage of total time spent at Left, Center, and Right positions.
    Labels trials with 'Error' when total trial time is zero and continues processing.
    """
    print("[INFO] Generating trial_time_plots.png")
    try:
        fig, axes, _, _ = create_dynamic_grid(
            len(trial_data), cols=5, base_width=10.5, base_height=8.0, dpi=100
        )
        for ax in axes:
            ax.set_facecolor("black")

        for i, trial in enumerate(trial_data):
            if i >= len(axes):
                break
            gaze_data = trial.get("gazeData", [])
            if not gaze_data:
                continue

            total_time = sum(pt.get("time", 0.0) for pt in gaze_data)
            if total_time <= 0:
                axes[i].text(
                    0.5,
                    0.5,
                    "Error: zero total time",
                    transform=axes[i].transAxes,
                    ha="center",
                    va="center",
                    fontsize=8,
                    color="red",
                )
                axes[i].set_title(
                    f"Trial {trial.get('trialNumber', '?')} Time %",
                    fontsize=6,
                    color="white",
                )
                axes[i].axis("off")
                continue

            # Aggregate time by screen position
            pos_times = {"left": 0.0, "center": 0.0, "right": 0.0}
            for pt in gaze_data:
                pos = determine_position(pt.get("x", 0.0))
                pos_times[pos] = pos_times.get(pos, 0.0) + pt.get("time", 0.0)

            labels = ["Left", "Center", "Right"]
            # Identify target position for this trial (if available)
            target_positions = [
                p for p in trial.get("positions", []) if p.get("isTarget")
            ]
            target_pos = target_positions[0]["position"] if target_positions else None
            values = [
                (pos_times["left"] / total_time) * 100.0,
                (pos_times["center"] / total_time) * 100.0,
                (pos_times["right"] / total_time) * 100.0,
            ]
            # Base (foil) color map by spatial position
            base_color_map = {
                "left": (1, 0.5, 0, 0.7),
                "center": (0.7, 0.7, 0.7, 0.7),
                "right": (0, 1, 0, 0.7),
            }
            target_color = (0, 0, 1, 0.85)
            # Assign colors: target bar always blue regardless of its spatial position
            colors = [
                target_color
                if lbl.lower() == target_pos
                else base_color_map[lbl.lower()]
                for lbl in labels
            ]

            bars = axes[i].bar(labels, values, color=colors)
            # Annotate which bar is target (optional explicit label)
            for bar, lbl in zip(bars, labels):
                if lbl.lower() == target_pos:
                    axes[i].text(
                        bar.get_x() + bar.get_width() / 2,
                        bar.get_height() + 3,
                        "Target",
                        ha="center",
                        va="bottom",
                        fontsize=6,
                        color="cyan",
                    )
            axes[i].set_ylim(0, 100)
            axes[i].set_title(
                f"Trial {trial.get('trialNumber', '?')} Time %",
                fontsize=6,
                color="white",
            )
            for bar, val in zip(axes[i].patches, values):
                axes[i].text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + 1,
                    f"{val:.1f}%",
                    ha="center",
                    va="bottom",
                    fontsize=6,
                    color="white",
                )
            axes[i].tick_params(axis="x", colors="white", labelsize=6)
            axes[i].tick_params(axis="y", colors="white", labelsize=6)
            axes[i].spines["bottom"].set_color("white")
            axes[i].spines["left"].set_color("white")
            axes[i].spines["top"].set_visible(False)
            axes[i].spines["right"].set_visible(False)

        plt.tight_layout()
        build_position_legend(fig)
        time_plot_path = os.path.join(output_folder, "trial_time_plots.png")
        plt.savefig(time_plot_path, facecolor="black")
        print(f"[INFO] Saved trial time plots to {time_plot_path}")
    except Exception as e:
        print(f"[ERROR] Failed to generate trial time plots: {e}")
        time_plot_path = os.path.join(output_folder, "trial_time_plots.png")
        plt.figure(figsize=(4, 3))
        plt.text(
            0.5, 0.5, "Trial Time Plot Failure", ha="center", va="center", color="red"
        )
        plt.axis("off")
        plt.savefig(time_plot_path, facecolor="black")
    finally:
        plt.close()
    return time_plot_path


def create_combined_violin_plot(
    types_data: Dict[str, Dict[str, List[float]]], output_folder: str
) -> str:
    """Create a violin plot combining target and non-target gaze data."""
    data_list = []
    for trial_type, type_data in types_data.items():
        for target_status, values in type_data.items():
            data_list.extend(
                [
                    {
                        "Trial Type": f"Type {trial_type}",
                        "Percentage": value,
                        "Target Status": target_status.capitalize(),
                    }
                    for value in values
                ]
            )

    df = pd.DataFrame(data_list)
    plt.figure(figsize=(10.5, 8))
    ax = plt.gca()
    ax.set_facecolor("black")

    violin_palette = {"Non_target": (1, 0.5, 0, 0.75), "Target": (0, 0, 1, 0.75)}
    dot_palette = {"Non_target": "yellow", "Target": "cyan"}

    plt.axhline(y=33, xmin=0, xmax=1.1, color="red", linestyle="--", linewidth=1.5)

    sns.violinplot(
        x="Trial Type",
        y="Percentage",
        hue="Target Status",
        data=df,
        order=["Type 2", "Type 1"],
        hue_order=["Target", "Non_target"],
        palette={"Non_target": (1, 0.5, 0, 0.75), "Target": (0, 0, 1, 0.75)},
        alpha=0.9,
        split=True,
        inner="box",
        inner_kws={"color": "0.8", "box_width": 25, "whis_width": 5},
        fill=True,
        density_norm="count",
        bw_adjust=0.5,
        native_scale=True,
        gap=0.1,
        cut=0,
    )
    sns.despine(left=True)

    sns.swarmplot(
        x="Trial Type",
        y="Percentage",
        hue="Target Status",
        data=df,
        palette={"Non_target": "yellow", "Target": "cyan"},
        dodge=True,
        alpha=0.9,
        size=9,
    )
    sns.despine(left=True)

    handles = [
        (
            Line2D([0], [0], color=violin_palette["Target"], lw=4),
            Line2D(
                [0],
                [0],
                marker="o",
                color="w",
                markerfacecolor=dot_palette["Target"],
                markersize=10,
            ),
        ),
        (
            Line2D([0], [0], color=violin_palette["Non_target"], lw=4),
            Line2D(
                [0],
                [0],
                marker="o",
                color="w",
                markerfacecolor=dot_palette["Non_target"],
                markersize=10,
            ),
        ),
    ]

    labels = ["Target", "Non-Target"]

    legend = plt.legend(
        handles=handles,
        labels=labels,
        handler_map={tuple: HandlerTuple(ndivide=None)},
        loc="center left",
        bbox_to_anchor=(0.85, 0.75),
        frameon=True,
        facecolor="black",
        edgecolor="white",
    )
    plt.setp(legend.get_texts(), color="white")
    plt.setp(legend.get_title(), color="white")

    plt.title(
        "Target and Non-Target Gaze Time Distribution (All Trials)", color="white"
    )
    plt.ylabel("% Time Exploring", color="white")
    plt.ylim(-10, 100)
    plt.xlabel("Trial Type", color="white")
    plt.text(x=1.15, y=35, s="33% = Chance", fontsize=12, color="red")
    plt.xticks(
        ticks=[0, 1], labels=["Low Interference", "High Interference"], color="white"
    )
    plt.yticks(color="white")

    ax.yaxis.grid(True, color="white", linestyle="-", linewidth=0.2)

    violin_plot_path = os.path.join(output_folder, "violin_plot.png")
    plt.savefig(violin_plot_path, facecolor="black")
    plt.close()
    return violin_plot_path


def create_combined_scatterplots(trial_data: List[dict], output_folder: str) -> str:
    """
    Aggregate gaze points across trials by target spatial position and render
    a 3-row heatmap (Top: target=left, Middle: target=center, Bottom: target=right).

    Produces `combined_scatterplots.png` in the output folder. Uses seaborn's
    KDE/contour fill to create a smooth heatmap-like visualization. If a
    position has no data, writes a placeholder text panel.
    """
    print("[INFO] Generating combined_scatterplots.png")
    try:
        # Collect gaze points grouped by the trial's target position
        grouped = {"left": [], "center": [], "right": []}
        all_x = []
        all_y = []
        for trial in trial_data:
            target_pos = get_trial_target_position(trial)
            if target_pos not in grouped:
                continue
            gaze = trial.get("gazeData", []) or []
            xs = [pt.get("x", 0.0) for pt in gaze if pt is not None]
            ys = [pt.get("y", 0.0) for pt in gaze if pt is not None]
            if xs and ys:
                paired = list(zip(xs, ys))
                grouped[target_pos].extend(paired)
                all_x.extend(xs)
                all_y.extend(ys)

        combined_fig, axes = plt.subplots(
            3, 1, figsize=(8, 12), dpi=100, constrained_layout=True
        )
        # Titles/top-to-bottom map: left, center, right
        title_map = {0: "Target: Left", 1: "Target: Center", 2: "Target: Right"}
        pos_order = ["left", "center", "right"]

        # Compute global bounds for consistent panel scales
        if all_x and all_y:
            x_min, x_max = min(all_x), max(all_x)
            y_min, y_max = min(all_y), max(all_y)
            # Add a tiny padding
            x_pad = (x_max - x_min) * 0.03 if x_max > x_min else 1.0
            y_pad = (y_max - y_min) * 0.03 if y_max > y_min else 1.0
            x_limits = (x_min - x_pad, x_max + x_pad)
            y_limits = (y_min - y_pad, y_max + y_pad)
        else:
            x_limits = (-1, 1)
            y_limits = (-1, 1)

        for idx, ax in enumerate(axes):
            ax.set_facecolor("black")
            pos = pos_order[idx]
            points = grouped.get(pos, [])
            ax.set_title(title_map[idx], color="white")
            ax.set_xlim(x_limits)
            ax.set_ylim(y_limits)
            ax.axis("off")

            if not points:
                # Placeholder when no points exist for this target position
                ax.text(
                    0.5,
                    0.5,
                    f"No data for target={pos}",
                    transform=ax.transAxes,
                    ha="center",
                    va="center",
                    color="white",
                    fontsize=12,
                )
                continue

            xs, ys = zip(*points)

            try:
                # Use seaborn KDE plot for smooth heatmap-like rendering
                sns.kdeplot(
                    x=np.array(xs),
                    y=np.array(ys),
                    cmap="magma",
                    fill=True,
                    thresh=0.01,
                    levels=100,
                    ax=ax,
                    alpha=0.9,
                )
                # Overlay a low-opacity scatter so raw points are still visible
                ax.scatter(xs, ys, s=6, c="yellow", alpha=0.3)
            except Exception as e:
                # Fallback to a simple 2D histogram if KDE fails
                try:
                    h = ax.hist2d(xs, ys, bins=80, cmap="magma")
                    # add colorbar for the first panel only
                    if idx == 0:
                        combined_fig.colorbar(h[3], ax=ax, fraction=0.05)
                except Exception as ex:
                    ax.text(
                        0.5,
                        0.5,
                        f"Heatmap failed: {ex}",
                        transform=ax.transAxes,
                        ha="center",
                        va="center",
                        color="red",
                    )

        combined_plot_path = os.path.join(output_folder, "combined_scatterplots.png")
        plt.savefig(combined_plot_path, facecolor="black")
        plt.close()
        print(f"[INFO] Saved combined scatterplots to {combined_plot_path}")
        return combined_plot_path
    except Exception as e:
        print(f"[ERROR] Failed to generate combined scatterplots: {e}")
        fallback_path = os.path.join(output_folder, "combined_scatterplots.png")
        plt.figure(figsize=(6, 4))
        plt.text(0.5, 0.5, "Combined Scatterplot Failure", ha="center", va="center", color="red")
        plt.axis("off")
        plt.savefig(fallback_path, facecolor="black")
        plt.close()
        return fallback_path


def perform_statistical_analysis(
    types_data: Dict[str, Dict[str, List[float]]],
) -> Dict[str, Any]:
    """Perform statistical analysis on the gaze data."""
    target_times = types_data["1"]["target"] + types_data["2"]["target"]
    non_target_times = types_data["1"]["non_target"] + types_data["2"]["non_target"]

    # Shapiro-Wilk test
    shapiro_target = shapiro(target_times)
    shapiro_non_target = shapiro(non_target_times)

    # Levene's test
    levene_test = levene(target_times, non_target_times)

    # Wilcoxon test (Target > 33%)
    w_test_33 = wilcoxon(np.array(target_times) - 33, alternative="greater")

    # Wilcoxon test (Target vs Non-Target)
    w_test_target_vs_non = wilcoxon(target_times, non_target_times)

    # T-test
    t_test_target_vs_non = ttest_ind(target_times, non_target_times)
    df_ttest = len(target_times) + len(non_target_times) - 2

    # ANOVA
    anova_test = f_oneway(types_data["1"]["target"], types_data["2"]["target"])
    df_between = 1
    df_within = len(target_times) - 2

    # Calculate difference
    difference = np.mean(target_times) - np.mean(non_target_times)

    return {
        "shapiro_target": shapiro_target,
        "shapiro_non_target": shapiro_non_target,
        "levene_test": levene_test,
        "w_test_33": w_test_33,
        "w_test_target_vs_non": w_test_target_vs_non,
        "t_test_target_vs_non": t_test_target_vs_non,
        "df_ttest": df_ttest,
        "anova_test": anova_test,
        "df_between": df_between,
        "df_within": df_within,
        "difference": difference,
        "target_times": target_times,
        "non_target_times": non_target_times,
    }


def generate_descriptive_statistics(
    target_times: List[float], non_target_times: List[float]
) -> str:
    """Generate descriptive statistics table."""
    return generate_table(
        headers=["Measure", "Target Object Gaze", "Non-Target Objects Gaze"],
        data=[
            ["Mean", np.mean(target_times), np.mean(non_target_times)],
            ["Standard Deviation", np.std(target_times), np.std(non_target_times)],
            ["Median", np.median(target_times), np.median(non_target_times)],
            ["Min", np.min(target_times), np.min(non_target_times)],
            ["Max", np.max(target_times), np.max(non_target_times)],
        ],
    )


def generate_summary_paragraph(stats: Dict[str, Any]) -> str:
    """Generate executive summary paragraph."""
    return f"""
### Executive Summary

This analysis examined the gaze data across different trial types to determine if there were significant differences in gaze behavior. The Shapiro-Wilk test for normality indicated that the target gaze data {"did not follow" if stats["shapiro_target"].pvalue < 0.05 else "followed"} a normal distribution (p-value: {format_pvalue(stats["shapiro_target"].pvalue)}), while the non-target gaze data {"did not follow" if stats["shapiro_non_target"].pvalue < 0.05 else "followed"} a normal distribution (p-value: {format_pvalue(stats["shapiro_non_target"].pvalue)}). Levene's test for homoscedasticity showed that the variances between target and non-target gaze data were {"not equal" if stats["levene_test"].pvalue < 0.05 else "equal"} (p-value: {format_pvalue(stats["levene_test"].pvalue)}).

The Wilcoxon signed-rank test revealed that the target gaze percentage was {"significantly greater" if stats["w_test_33"].pvalue < 0.05 else "not significantly greater"} than 33% (p-value: {format_pvalue(stats["w_test_33"].pvalue)}). Additionally, the Wilcoxon test comparing target and non-target gaze percentages indicated that there was {"a significant difference" if stats["w_test_target_vs_non"].pvalue < 0.05 else "no significant difference"} between the two conditions (p-value: {format_pvalue(stats["w_test_target_vs_non"].pvalue)}).

The independent t-test comparing target gaze percentages between Trial Type 1 and Trial Type 2 showed that there was {"a significant difference" if stats["t_test_target_vs_non"].pvalue < 0.05 else "no significant difference"} between the two trial types (p-value: {format_pvalue(stats["t_test_target_vs_non"].pvalue)}). Finally, the one-way ANOVA test indicated that the target gaze percentages across different trial types were {"significantly different" if stats["anova_test"].pvalue < 0.05 else "not significantly different"} (p-value: {format_pvalue(stats["anova_test"].pvalue)}).

Overall, these results provide insights into the gaze behavior across different trial types, highlighting significant differences where applicable.
"""


def write_markdown_report(
    output_folder: str,
    json_file_name: str,
    types_data: Dict[str, Dict[str, List[float]]],
    scatter_plot_path: str,
    violin_plot_path: str,
    percentage_plot_path: str,
    count_plot_path: str,
    trajectory_plot_path: str,
    time_plot_path: str,
    combined_scatter_path: str | None = None,
) -> None:
    """Write the complete analysis report in Markdown format, including new per-trial and trajectory plots."""
    md_file_path = os.path.join(output_folder, f"{json_file_name}.md")

    # Perform statistical analysis
    stats = perform_statistical_analysis(types_data)

    with open(md_file_path, "w") as md_file:
        # Title
        md_file.write(f"# Analysis Report for {json_file_name}\n")

        # Plots
        md_file.write(
            print_markdown_description(
                f"Scatter Plots of Gaze Data (Red Ellipse Represents Center of Highest Concentration)\n"
            )
        )
        md_file.write(f"![Scatter Plots]({os.path.abspath(scatter_plot_path)})\n\n")

        if combined_scatter_path:
            md_file.write(
                print_markdown_description(
                    "Combined Heatmaps by Target Position (Top: Left, Middle: Center, Bottom: Right)\n"
                )
            )
            md_file.write(f"![Combined Heatmaps]({os.path.abspath(combined_scatter_path)})\n\n")

        md_file.write(
            print_markdown_description(
                "Trajectory Plots (Vectors Color-Coded by Direction)\n"
            )
        )
        md_file.write(
            f"![Trajectory Plots]({os.path.abspath(trajectory_plot_path)})\n\n"
        )

        md_file.write(
            print_markdown_description("Per-Trial % Time in Target vs Outside Target\n")
        )
        md_file.write(
            f"![Trial Percentage Plots]({os.path.abspath(percentage_plot_path)})\n\n"
        )

        md_file.write(
            print_markdown_description(
                "Per-Trial Observation Counts (Target vs Outside)\n"
            )
        )
        md_file.write(f"![Trial Count Plots]({os.path.abspath(count_plot_path)})\n\n")

        md_file.write(
            print_markdown_description(
                "Per-Trial Time Distribution Across Screen Positions (Left, Center, Right)\n"
            )
        )
        md_file.write(f"![Trial Time Plots]({os.path.abspath(time_plot_path)})\n\n")
        md_file.write(print_markdown_description(f"Violin Plot of Gaze Data\n"))

        md_file.write(f"![Violin Plot]({os.path.abspath(violin_plot_path)})\n\n")

        # Descriptive Statistics
        md_file.write(
            print_markdown_description(
                "Descriptive Statistics for Gaze Percentages (Target vs Combined Non-Target Objects)"
            )
        )
        md_file.write(
            generate_descriptive_statistics(
                stats["target_times"], stats["non_target_times"]
            )
        )

        # Normality Test
        md_file.write(
            print_markdown_description(f"Shapiro-Wilk Test for Normality\n\n")
        )
        md_file.write(
            "This test checks whether the data follows a normal distribution. It returns a test statistic "
            "and a p-value. A p-value less than 0.05 indicates that the data significantly deviates from "
            "a normal distribution.\n\n"
        )
        md_file.write(
            generate_table(
                headers=["Measure", "W Statistic", "p-value"],
                data=[
                    [
                        "Target Gaze",
                        stats["shapiro_target"].statistic,
                        format_pvalue(stats["shapiro_target"].pvalue),
                    ],
                    [
                        "Non-Target Gaze",
                        stats["shapiro_non_target"].statistic,
                        format_pvalue(stats["shapiro_non_target"].pvalue),
                    ],
                ],
            )
        )

        # Homoscedasticity Test
        md_file.write(
            print_markdown_description(f"Levene's Test for Homoscedasticity\n\n")
        )
        md_file.write(
            generate_table(
                headers=["W Statistic", "p-value"],
                data=[
                    [
                        stats["levene_test"].statistic,
                        format_pvalue(stats["levene_test"].pvalue),
                    ]
                ],
            )
        )

        # Wilcoxon Tests
        md_file.write(
            print_markdown_description(f"Wilcoxon Test (One-Sided; Target >= 33%)\n\n")
        )
        md_file.write(
            generate_table(
                headers=["W Statistic", "p-value"],
                data=[
                    [
                        stats["w_test_33"].statistic,
                        format_pvalue(stats["w_test_33"].pvalue),
                    ]
                ],
            )
        )

        md_file.write(
            print_markdown_description(
                f"Wilcoxon Test (Two-Sided; Target vs Non-Target)\n\n"
            )
        )
        md_file.write(
            generate_table(
                headers=["W Statistic", "p-value"],
                data=[
                    [
                        stats["w_test_target_vs_non"].statistic,
                        format_pvalue(stats["w_test_target_vs_non"].pvalue),
                    ]
                ],
            )
        )
        md_file.write(f"**Difference**: {format_difference(stats['difference'])}\n")

        # T-Test
        md_file.write(
            print_markdown_description(f"T-Test (Two-Sided; Target vs Non-Target)\n\n")
        )
        md_file.write(
            generate_table(
                headers=["T-Statistic", "Degrees of Freedom", "p-value"],
                data=[
                    [
                        stats["t_test_target_vs_non"].statistic,
                        stats["df_ttest"],
                        format_pvalue(stats["t_test_target_vs_non"].pvalue),
                    ]
                ],
            )
        )
        md_file.write(f"**Difference**: {format_difference(stats['difference'])}\n\n")

        # ANOVA
        md_file.write(
            print_markdown_description(
                "ANOVA (Target Gaze Percentages across Trial Types)\n\n"
            )
        )
        md_file.write(
            generate_table(
                headers=[
                    "F-Statistic",
                    "Degrees of Freedom (Between)",
                    "Degrees of Freedom (Within)",
                    "p-value",
                ],
                data=[
                    [
                        stats["anova_test"].statistic,
                        stats["df_between"],
                        stats["df_within"],
                        format_pvalue(stats["anova_test"].pvalue),
                    ]
                ],
            )
        )

        # Summary
        md_file.write(generate_summary_paragraph(stats))


def main():
    """Main execution function."""
    args = parse_arguments()
    data = load_json_data(args.json_file_path)
    output_folder, json_file_name = setup_output_directory(args.json_file_path)

    trial_data = data["trialData"]
    types_data = process_trial_data(trial_data)

    scatter_plot_path = create_scatter_plots(trial_data, output_folder)
    combined_scatter_path = create_combined_scatterplots(trial_data, output_folder)
    percentage_plot_path = create_trial_percentage_plots(trial_data, output_folder)
    count_plot_path = create_trial_count_plots(trial_data, output_folder)
    trajectory_plot_path = create_trajectory_plots(trial_data, output_folder)
    time_plot_path = create_trial_time_plots(trial_data, output_folder)
    violin_plot_path = create_combined_violin_plot(types_data, output_folder)

    write_markdown_report(
        output_folder,
        json_file_name,
        types_data,
        scatter_plot_path,
        violin_plot_path,
        percentage_plot_path,
        count_plot_path,
        trajectory_plot_path,
        time_plot_path,
        combined_scatter_path,
    )


if __name__ == "__main__":
    main()
