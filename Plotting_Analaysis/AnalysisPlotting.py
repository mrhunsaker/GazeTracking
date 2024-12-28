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


# Helper function to generate a Markdown table as part of a complete report
def generate_table(headers, data):
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

# Helper function to print markdown descriptions
def print_markdown_description(description):
    return f"### {description}\n"
# Helper function to color negative differences (simulating coloring in Markdown)
def format_difference(difference):
    if difference < 0:
        return f'<span style="color:red">{difference:.2f}</span>'  # Indicating negative with bold
    else:
        return f"{difference:.2f}"

# Helper function to color p-values (simulating coloring in Markdown)
def format_pvalue(pvalue):
    if pvalue < 0.05:
        return f'<span style="color:red">{pvalue:.6f}</span>'  # Indicating significant p-value with red
    else:
        return f"{pvalue:.6f}"

# Argument parser setup
parser = argparse.ArgumentParser(
    description="Process JSON file and generate Markdown report."
)
parser.add_argument("json_file_path", type=str, help="The full path to the JSON file")
args = parser.parse_args()

# Load the JSON data
json_file_path = args.json_file_path
with open(json_file_path, "r") as file:
    data = json.load(file)

# Extract the file name without extension for folder naming
json_file_name = os.path.splitext(os.path.basename(json_file_path))[0]
output_folder = os.path.join("./data", json_file_name)

# Create the folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

# Extract trial data
trial_data = data["trialData"]

# Function to determine the position based on gaze x-coordinates
def determine_position(x):
    if x < 0:
        return "left"
    elif x > 0 and x < 1000:  # Adjust based on screen dimensions
        return "center"
    else:
        return "right"


# Prepare data
types_data = {
    "1": {"target": [], "non_target": []},
    "2": {"target": [], "non_target": []},
}
gaze_data_all = []
time_spent = {"target": [], "non_target": []}

for trial in trial_data:
    trial_type = trial["type"]
    gaze_data = trial["gazeData"]
    gaze_data_all.extend(
        [(point["x"], point["y"]) for point in gaze_data]
    )  # Collect all gaze points

    target_positions = [pos for pos in trial["positions"] if pos["isTarget"]]
    non_target_positions = [pos for pos in trial["positions"] if not pos["isTarget"]]

    if target_positions:
        target_position = target_positions[0]["position"]
        target_times = sum(
            1
            for point in gaze_data
            if determine_position(point["x"]) == target_position
        )
        target_time_abs = sum(
            point["time"]
            for point in gaze_data
            if determine_position(point["x"]) == target_position
        )
        types_data[trial_type]["target"].append(target_times / len(gaze_data) * 100)
        time_spent["target"].append(target_time_abs)

    if non_target_positions:
        non_target_position = non_target_positions[0]["position"]
        non_target_times = sum(
            1
            for point in gaze_data
            if determine_position(point["x"]) == non_target_position
        )
        non_target_time_abs = sum(
            point["time"]
            for point in gaze_data
            if determine_position(point["x"]) == non_target_position
        )
        types_data[trial_type]["non_target"].append(
            non_target_times / len(gaze_data) * 100
        )
        time_spent["non_target"].append(non_target_time_abs)

# Montage of all trial-by-trial scatter plots with dividing lines based on dynamic x-axis range
fig, axes = plt.subplots(8, 5, figsize=(10.5, 8), dpi=100)
axes = axes.flatten()

for ax in axes:
    ax.set_facecolor("black")

for i, trial in enumerate(trial_data):
    gaze_data = trial["gazeData"]
    x_coords = [point["x"] for point in gaze_data]
    y_coords = [point["y"] for point in gaze_data]

    # Determine dynamic screen width for each plot
    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)

    # Use a kernel density estimate (KDE) to find the center of the highest concentration of gaze data points
    kde = gaussian_kde([x_coords, y_coords])
    x_grid, y_grid = np.mgrid[x_min:x_max:100j, y_min:y_max:100j]
    density = kde(np.vstack([x_grid.flatten(), y_grid.flatten()]))
    density_reshaped = density.reshape(x_grid.shape)

    # Find the index of the maximum density point
    max_density_index = np.unravel_index(
        np.argmax(density_reshaped), density_reshaped.shape
    )
    center_x = x_grid[max_density_index]
    center_y = y_grid[max_density_index]

    # Calculate the radius for the circle (1/3 of the plot area)
    circle_radius = (x_max - x_min) / 3  # The radius of the circle
    # Calculate the semi-major (primary) and semi-minor (secondary) axes of the ellipse
    semi_major_axis = (x_max - x_min) / 3  # Major axis length (horizontal)
    semi_minor_axis = (y_max - y_min) / 3  # Minor axis length (vertical)

    # Plot scatter points and the red circle
    axes[i].scatter(x_coords, y_coords, c="yellow", alpha=0.75, s=10)
    # Create an ellipse at the center with the specified axes lengths
    ellipse = Ellipse(
        (center_x, center_y),
        width=1 * semi_major_axis,  # Ellipse width (major axis length)
        height=2.2 * semi_minor_axis,  # Ellipse height (minor axis length)
        angle=0,  # No rotation (if you want rotation, change this value)
        color="red",
        fill=False,
        linewidth=2,
    )
    axes[i].add_patch(ellipse)
    axes[i].set_title(
        f"Trial {trial['trialNumber']}, Type {trial['type']}", fontsize=6, color="white"
    )
    axes[i].axis("off")

plt.tight_layout()
scatter_plot_path = os.path.join(output_folder, "scatter_plots.png")
plt.savefig(scatter_plot_path, facecolor="black")
plt.close()


# Violin Plot
# Prepare data for plotting
def create_combined_violin_plot(types_data, output_folder):
    # Restructure the data for seaborn
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

    # Create DataFrame
    df = pd.DataFrame(data_list)

    # Create the violin plot
    plt.figure(figsize=(10.5, 8))
    ax = plt.gca()
    ax.set_facecolor("black")

    # Violin plot with specified order
    violin_palette = {"Non_target": (1, 0.5, 0, 0.75), "Target": (0, 0, 1, 0.75)}
    dot_palette = {"Non_target": "yellow", "Target": "cyan"}

    # Move the red line behind the violin plots
    plt.axhline(y=33, xmin=0, xmax=1.1, color="red", linestyle="--", linewidth=1.5)

    # Violin plot with specified order
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
        inner="box",  # Enable the default inner boxplot
        inner_kws={"color": "0.8", "box_width": 25, "whis_width": 5},
        fill=True,
        density_norm="count",
        bw_adjust=0.5,
        native_scale=True,
        gap=0.1,
        cut=0,
    )
    sns.despine(left=True)

    # Jittered points for individual data with different colors
    sns.swarmplot(
        x="Trial Type",
        y="Percentage",
        hue="Target Status",
        data=df,
        palette={"Non_target": "yellow", "Target": "cyan"},
        dodge=True,
        alpha=0.9,
        # jitter=True,
        size=9,
    )
    sns.despine(left=True)

    # Custom legend
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

    # Add faint white horizontal lines
    ax.yaxis.grid(True, color="white", linestyle="-", linewidth=0.2)

    violin_plot_path = os.path.join(output_folder, "violin_plot.png")
    plt.savefig(violin_plot_path, facecolor="black")
    plt.close()
    return violin_plot_path

# Use the function with your existing types_data
violin_plot_path = create_combined_violin_plot(types_data, output_folder)

# Open a Markdown file in that folder to write the results
md_file_path = os.path.join(output_folder, f"{json_file_name}.md")

with open(md_file_path, "w") as md_file:
    md_file.write(f"# Analysis Report for {json_file_name}\n")
        # Add plots to markdown
    md_file.write(
        print_markdown_description(
            "Scatter Plots of Gaze Data (Red Ellipse Represents Center of Highest Concentration)"
        )
    )
    md_file.write(f"![Scatter Plots]({os.path.abspath(scatter_plot_path)})\n")

    md_file.write(print_markdown_description("Violin Plot of Gaze Data"))
    md_file.write(f"![Violin Plot]({os.path.abspath(violin_plot_path)})\n")
    md_file.write(
        print_markdown_description(
            "Descriptive Statistics for Gaze Percentages (Target vs Combined Non-Target Objects)"
        )
    )

    # Descriptive statistics
    target_times = types_data["1"]["target"] + types_data["2"]["target"]
    non_target_times = types_data["1"]["non_target"] + types_data["2"]["non_target"]
    descriptive_stats = generate_table(
        headers=["Measure", "Target Object Gaze", "Non-Target Objects Gaze"],
        data=[
            ["Mean", np.mean(target_times), np.mean(non_target_times)],
            ["Standard Deviation", np.std(target_times), np.std(non_target_times)],
            ["Median", np.median(target_times), np.median(non_target_times)],
            ["Min", np.min(target_times), np.min(non_target_times)],
            ["Max", np.max(target_times), np.max(non_target_times)],
        ],
    )
    md_file.write(descriptive_stats)

    # Normality test
    shapiro_target = shapiro(target_times)
    shapiro_non_target = shapiro(non_target_times)
    md_file.write(print_markdown_description("Shapiro-Wilk Test for Normality"))
    md_file.write(f"This test checks whether the data follows a normal distribution. It returns a test statistic and a p-value. A p-value less than 0.05 indicates that the data significantly deviates from a normal distribution.\n\n")
    normality_test = generate_table(
        headers=["Measure", "W Statistic", "p-value"],
        data=[
            ["Target Gaze", shapiro_target.statistic, format_pvalue(shapiro_target.pvalue)],
            ["Non-Target Gaze", shapiro_non_target.statistic, format_pvalue(shapiro_non_target.pvalue)],
        ],
    )
    md_file.write(normality_test)

    # Homoscedasticity test
    levene_test = levene(target_times, non_target_times)
    md_file.write(print_markdown_description("Levene's Test for Homoscedasticity"))
    md_file.write(f"This test checks whether the data has equal variances. It returns a test statistic and a p-value. A p-value less than 0.05 indicates that the data significantly deviates from equal variances.\n\n")
    homoscedasticity_test = generate_table(
        headers=["W Statistic", "p-value"],
        data=[
            [levene_test.statistic, format_pvalue(levene_test.pvalue)],
        ],
    )
    md_file.write(homoscedasticity_test)

    # Wilcoxon test 1: IsTarget > 33%
    w_test_33 = wilcoxon(np.array(target_times) - 33, alternative="greater")
    md_file.write(
        print_markdown_description("Wilcoxon Test (One-Sided; Target >= 33%)")
    )
    md_file.write(f"This test checks whether the target gaze percentage is significantly greater than 33%. It returns a test statistic and a p-value. A p-value less than 0.05 indicates that the target gaze percentage is significantly greater than 33%. To compare target gaze percentages between two conditions (e.g., target vs. non-target, or trial type 1 vs. trial type 2). It returns a test statistic and a p-value. A p-value less than 0.05 indicates a significant difference between the groups.\n\n")
    wilcoxon_test_33 = generate_table(
        headers=["W Statistic", "p-value"],
        data=[
            [w_test_33.statistic, format_pvalue(w_test_33.pvalue)],
        ],
    )
    md_file.write(wilcoxon_test_33)

   # Wilcoxon test 2: IsTarget vs Non-Target
    w_test_target_vs_non = wilcoxon(target_times, non_target_times)
    difference = np.mean(target_times) - np.mean(non_target_times)
    md_file.write(
        print_markdown_description("Wilcoxon Test (Two-Sided; Target vs Non-Target)")
    )
    md_file.write(f"This test checks whether the target gaze percentage is significantly different from the non-target gaze percentage. It returns a test statistic and a p-value. A p-value less than 0.05 indicates a significant difference between the target and non-target gaze percentages.\n\n")
    wilcoxon_test_target_vs_non = generate_table(
        headers=["W Statistic", "p-value"],
        data=[
            [w_test_target_vs_non.statistic, format_pvalue(w_test_target_vs_non.pvalue)],
        ],
    )
    md_file.write(wilcoxon_test_target_vs_non)
    md_file.write(f"**Difference**: {format_difference(difference)}\n")

    # T-test: IsTarget vs Non-Target
    t_test_target_vs_non = ttest_ind(target_times, non_target_times)
    df_ttest = len(target_times) + len(non_target_times) - 2
    md_file.write(
        print_markdown_description("T-Test (Two-Sided; Target vs Non-Target)")
    )
    md_file.write("This test checks whether the target gaze percentage is significantly different from the non-target gaze percentage. It returns a test statistic and a p-value. A p-value less than 0.05 indicates a significant difference between the target and non-target gaze percentages.\n\n")
    ttest_target_vs_non = generate_table(
        headers=["T-Statistic", "Degrees of Freedom", "p-value"],
        data=[
            [t_test_target_vs_non.statistic, df_ttest, format_pvalue(t_test_target_vs_non.pvalue)],
        ],
    )
    md_file.write(ttest_target_vs_non)
    md_file.write(f"**Difference**: {format_difference(difference)}\n")

    # ANOVA: Target Gaze Percentages across Trial Types
    anova_test = f_oneway(types_data["1"]["target"], types_data["2"]["target"])
    df_between = 1  # Number of groups - 1
    df_within = len(target_times) - 2  # Total number of observations - number of groups
    md_file.write(
        print_markdown_description("ANOVA (Target Gaze Percentages across Trial Types)")
    )
    md_file.write(f"This test checks whether the target gaze percentages are significantly different across trial types. It returns a test statistic and a p-value. A p-value less than 0.05 indicates a significant difference between the groups.\n\n")
    anova_test_result = generate_table(
        headers=["F-Statistic", "Degrees of Freedom (Between)", "Degrees of Freedom (Within)", "p-value"],
        data=[
            [anova_test.statistic, df_between, df_within, format_pvalue(anova_test.pvalue)],
        ],
    )
    md_file.write(anova_test_result)

    # Summary paragraph
    summary_paragraph = f"""
### Executive Summary

This analysis examined the gaze data across different trial types to determine if there were significant differences in gaze behavior. The Shapiro-Wilk test for normality indicated that the target gaze data {'did not follow' if shapiro_target.pvalue < 0.05 else 'followed'} a normal distribution (p-value: {format_pvalue(shapiro_target.pvalue)}), while the non-target gaze data {'did not follow' if shapiro_non_target.pvalue < 0.05 else 'followed'} a normal distribution (p-value: {format_pvalue(shapiro_non_target.pvalue)}). Levene's test for homoscedasticity showed that the variances between target and non-target gaze data were {'not equal' if levene_test.pvalue < 0.05 else 'equal'} (p-value: {format_pvalue(levene_test.pvalue)}).

The Wilcoxon signed-rank test revealed that the target gaze percentage was {'significantly greater' if w_test_33.pvalue < 0.05 else 'not significantly greater'} than 33% (p-value: {format_pvalue(w_test_33.pvalue)}). Additionally, the Wilcoxon test comparing target and non-target gaze percentages indicated that there was {'a significant difference' if w_test_target_vs_non.pvalue < 0.05 else 'no significant difference'} between the two conditions (p-value: {format_pvalue(w_test_target_vs_non.pvalue)}).

The independent t-test comparing target gaze percentages between Trial Type 1 and Trial Type 2 showed that there was {'a significant difference' if t_test_target_vs_non.pvalue < 0.05 else 'no significant difference'} between the two trial types (p-value: {format_pvalue(t_test_target_vs_non.pvalue)}). Finally, the one-way ANOVA test indicated that the target gaze percentages across different trial types were {'significantly different' if anova_test.pvalue < 0.05 else 'not significantly different'} (p-value: {format_pvalue(anova_test.pvalue)}).

Overall, these results provide insights into the gaze behavior across different trial types, highlighting significant differences where applicable.
"""
    md_file.write(summary_paragraph)
