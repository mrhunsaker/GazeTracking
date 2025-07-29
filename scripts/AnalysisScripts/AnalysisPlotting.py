#!/usr/bin/env python3

"""
 Copyright 2025  Michael Ryan Hunsaker, M.Ed., Ph.D.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
"""

# coding=utf-8

"""
Eye Gaze Analysis Tool

This module provides functionality for analyzing and visualizing eye gaze data from experimental trials. It processes JSON-formatted gaze data, generates statistical analyses, and creates visualizations, including scatter plots and violin plots. The tool supports comparison between target and non-target gaze times across different trial types.

Usage:
    python gaze_analysis.py path/to/data.json

The input JSON file should have the following structure:
{
    "trialData": [
        {
            "type": "1" or "2",
            "trialNumber": int,
            "gazeData": [
                {
                    "x": float,
                    "y": float,
                    "time": float
                },
                ...
            ],
            "positions": [
                {
                    "position": "left" or "center" or "right",
                    "isTarget": bool
                },
                ...
            ]
        },
        ...
    ]
}
"""

import os
import json
import numpy as np
from scipy.stats import wilcoxon, ttest_ind, f_oneway, levene, shapiro
import argparse
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from scipy.stats import gaussian_kde
from matplotlib.patches import Ellipse
from matplotlib.legend_handler import HandlerTuple
from typing import List, Dict, Any, Tuple
import shutil

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
    parser.add_argument("json_file_path", type=str, help="The full path to the JSON file")
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

def process_trial_data(trial_data: List[dict]) -> Tuple[Dict[str, Dict[str, List[float]]], List[Tuple[float, float]], Dict[str, List[float]]]:
    """Process trial data and return organized data structures."""
    types_data = {
        "1": {"target": [], "non_target": []},
        "2": {"target": [], "non_target": []},
    }
    gaze_data_all = []
    time_spent = {"target": [], "non_target": []}

    for trial in trial_data:
        trial_type = trial["type"]
        gaze_data = trial["gazeData"]
        gaze_data_all.extend([(point["x"], point["y"]) for point in gaze_data])

        target_positions = [pos for pos in trial["positions"] if pos["isTarget"]]
        non_target_positions = [pos for pos in trial["positions"] if not pos["isTarget"]]

        if target_positions:
            target_position = target_positions[0]["position"]
            target_times = sum(1 for point in gaze_data if determine_position(point["x"]) == target_position)
            target_time_abs = sum(point["time"] for point in gaze_data if determine_position(point["x"]) == target_position)
            types_data[trial_type]["target"].append(target_times / len(gaze_data) * 100)
            time_spent["target"].append(target_time_abs)

        if non_target_positions:
            non_target_position = non_target_positions[0]["position"]
            non_target_times = sum(1 for point in gaze_data if determine_position(point["x"]) == non_target_position)
            non_target_time_abs = sum(point["time"] for point in gaze_data if determine_position(point["x"]) == non_target_position)
            types_data[trial_type]["non_target"].append(non_target_times / len(gaze_data) * 100)
            time_spent["non_target"].append(non_target_time_abs)

    return types_data, gaze_data_all, time_spent

def create_scatter_plots(trial_data: List[dict], output_folder: str) -> str:
    """Create and save scatter plots."""
    fig, axes = plt.subplots(8, 5, figsize=(10.5, 8), dpi=100)
    axes = axes.flatten()

    for ax in axes:
        ax.set_facecolor("black")

    for i, trial in enumerate(trial_data):
        gaze_data = trial["gazeData"]
        x_coords = [point["x"] for point in gaze_data]
        y_coords = [point["y"] for point in gaze_data]

        x_min, x_max = min(x_coords), max(x_coords)
        y_min, y_max = min(y_coords), max(y_coords)

        kde = gaussian_kde([x_coords, y_coords])
        x_grid, y_grid = np.mgrid[x_min:x_max:100j, y_min:y_max:100j]
        density = kde(np.vstack([x_grid.flatten(), y_grid.flatten()]))
        density_reshaped = density.reshape(x_grid.shape)

        max_density_index = np.unravel_index(np.argmax(density_reshaped), density_reshaped.shape)
        center_x = x_grid[max_density_index]
        center_y = y_grid[max_density_index]

        semi_major_axis = (x_max - x_min) / 3
        semi_minor_axis = (y_max - y_min) / 3

        axes[i].scatter(x_coords, y_coords, c="yellow", alpha=0.75, s=10)
        ellipse = Ellipse(
            (center_x, center_y),
            width=1 * semi_major_axis,
            height=2.2 * semi_minor_axis,
            angle=0,
            color="red",
            fill=False,
            linewidth=2,
        )
        axes[i].add_patch(ellipse)
        axes[i].set_title(f"Trial {trial['trialNumber']}, Type {trial['type']}", fontsize=6, color="white")
        axes[i].axis("off")

    plt.tight_layout()
    scatter_plot_path = os.path.join(output_folder, "scatter_plots.png")
    plt.savefig(scatter_plot_path, facecolor="black")
    plt.close()
    return scatter_plot_path

def create_combined_violin_plot(types_data: Dict[str, Dict[str, List[float]]], output_folder: str) -> str:
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
            plt.Line2D([0], [0], color=violin_palette["Target"], lw=4),
            plt.Line2D(
                [0],
                [0],
                marker="o",
                color="w",
                markerfacecolor=dot_palette["Target"],
                markersize=10,
            ),
        ),
        (
            plt.Line2D([0], [0], color=violin_palette["Non_target"], lw=4),
            plt.Line2D(
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

    plt.title("Target and Non-Target Gaze Time Distribution (All Trials)", color="white")
    plt.ylabel("% Time Exploring", color="white")
    plt.ylim(-10, 100)
    plt.xlabel("Trial Type", color="white")
    plt.text(x=1.15, y=35, s="33% = Chance", fontsize=12, color="red")
    plt.xticks(ticks=[0, 1], labels=["Low Interference", "High Interference"], color="white")
    plt.yticks(color="white")

    ax.yaxis.grid(True, color="white", linestyle="-", linewidth=0.2)

    violin_plot_path = os.path.join(output_folder, "violin_plot.png")
    plt.savefig(violin_plot_path, facecolor="black")
    plt.close()
    return violin_plot_path

def perform_statistical_analysis(types_data: Dict[str, Dict[str, List[float]]]) -> Dict[str, Any]:
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
        "non_target_times": non_target_times
    }

def generate_descriptive_statistics(target_times: List[float], non_target_times: List[float]) -> str:
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

def write_markdown_report(output_folder: str, json_file_name: str, types_data: Dict[str, Dict[str, List[float]]],
                         scatter_plot_path: str, violin_plot_path: str) -> None:
    """Write the complete analysis report in Markdown format."""
    md_file_path = os.path.join(output_folder, f"{json_file_name}.md")

    # Perform statistical analysis
    stats = perform_statistical_analysis(types_data)

    with open(md_file_path, "w") as md_file:
        # Title
        md_file.write(f"# Analysis Report for {json_file_name}\n")

        # Plots
        md_file.write(print_markdown_description(
            f"Scatter Plots of Gaze Data (Red Ellipse Represents Center of Highest Concentration)\n"
        ))
        md_file.write(f"![Scatter Plots]({os.path.abspath(scatter_plot_path)})\n\n")

        md_file.write(print_markdown_description(f"Violin Plot of Gaze Data\n"))
        md_file.write(f"![Violin Plot]({os.path.abspath(violin_plot_path)})\n\n")

        # Descriptive Statistics
        md_file.write(print_markdown_description(
            "Descriptive Statistics for Gaze Percentages (Target vs Combined Non-Target Objects)"
        ))
        md_file.write(generate_descriptive_statistics(stats["target_times"], stats["non_target_times"]))

        # Normality Test
        md_file.write(print_markdown_description(f"Shapiro-Wilk Test for Normality\n\n"))
        md_file.write(
            "This test checks whether the data follows a normal distribution. It returns a test statistic "
            "and a p-value. A p-value less than 0.05 indicates that the data significantly deviates from "
            "a normal distribution.\n\n"
        )
        md_file.write(generate_table(
            headers=["Measure", "W Statistic", "p-value"],
            data=[
                ["Target Gaze", stats["shapiro_target"].statistic,
                 format_pvalue(stats["shapiro_target"].pvalue)],
                ["Non-Target Gaze", stats["shapiro_non_target"].statistic,
                 format_pvalue(stats["shapiro_non_target"].pvalue)],
            ],
        ))

        # Homoscedasticity Test
        md_file.write(print_markdown_description(f"Levene's Test for Homoscedasticity\n\n"))
        md_file.write(generate_table(
            headers=["W Statistic", "p-value"],
            data=[[stats["levene_test"].statistic, format_pvalue(stats["levene_test"].pvalue)]],
        ))

        # Wilcoxon Tests
        md_file.write(print_markdown_description(f"Wilcoxon Test (One-Sided; Target >= 33%)\n\n"))
        md_file.write(generate_table(
            headers=["W Statistic", "p-value"],
            data=[[stats["w_test_33"].statistic, format_pvalue(stats["w_test_33"].pvalue)]],
        ))

        md_file.write(print_markdown_description(f"Wilcoxon Test (Two-Sided; Target vs Non-Target)\n\n"))
        md_file.write(generate_table(
            headers=["W Statistic", "p-value"],
            data=[[stats["w_test_target_vs_non"].statistic,
                  format_pvalue(stats["w_test_target_vs_non"].pvalue)]],
        ))
        md_file.write(f"**Difference**: {format_difference(stats['difference'])}\n")

        # T-Test
        md_file.write(print_markdown_description(f"T-Test (Two-Sided; Target vs Non-Target)\n\n"))
        md_file.write(generate_table(
            headers=["T-Statistic", "Degrees of Freedom", "p-value"],
            data=[[stats["t_test_target_vs_non"].statistic, stats["df_ttest"],
                  format_pvalue(stats["t_test_target_vs_non"].pvalue)]],
        ))
        md_file.write(f"**Difference**: {format_difference(stats['difference'])}\n\n")

        # ANOVA
        md_file.write(print_markdown_description("ANOVA (Target Gaze Percentages across Trial Types)\n\n"))
        md_file.write(generate_table(
            headers=["F-Statistic", "Degrees of Freedom (Between)",
                    "Degrees of Freedom (Within)", "p-value"],
            data=[[stats["anova_test"].statistic, stats["df_between"],
                  stats["df_within"], format_pvalue(stats["anova_test"].pvalue)]],
        ))

        # Summary
        md_file.write(generate_summary_paragraph(stats))

def main():
    """Main execution function."""
    args = parse_arguments()
    data = load_json_data(args.json_file_path)
    output_folder, json_file_name = setup_output_directory(args.json_file_path)

    trial_data = data["trialData"]
    types_data, gaze_data_all, time_spent = process_trial_data(trial_data)

    scatter_plot_path = create_scatter_plots(trial_data, output_folder)
    violin_plot_path = create_combined_violin_plot(types_data, output_folder)

    write_markdown_report(output_folder, json_file_name, types_data,
                         scatter_plot_path, violin_plot_path)

if __name__ == "__main__":
    main()
