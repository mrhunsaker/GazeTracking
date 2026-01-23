"""Data analysis example for gaze tracking experiment.

This module loads participant data and generates summary statistics
for accuracy and reaction time grouped by difficulty level.
"""
import pandas as pd

df = pd.read_csv('all_participants.csv')

# drop practice trials if present
if 'practice' in df.columns:
    df = df[not df['practice']]

summary = (
    df.groupby(['difficulty'])
      .agg(
          accuracy=('correct', 'mean'),
          rt=('rt', 'mean')
      )
)

print(summary)
