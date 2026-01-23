library(tidyverse)

df <- read_csv('all_participants.csv')

df %>%
  filter(practice == FALSE) %>%
  group_by(difficulty) %>%
  summarise(
    accuracy = mean(correct),
    rt = mean(rt)
  ) %>%
  print()
