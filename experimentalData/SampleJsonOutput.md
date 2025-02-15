# Sample JSON Output

```json
{
  "trialData": [
    {
      "trialNumber": 1,
      "type": "1" or "2",
      "startTime": 1701542400000,  // Unix timestamp in milliseconds
      "object1": 42,  // Object number for the first sample object
      "testObjects": [42, 87, 123],  // Object numbers in the test phase
      "positions": [
        {
          "position": "left",
          "objectNum": 42,
          "isTarget": true
        },
        {
          "position": "center",
          "objectNum": 87,
          "isTarget": false
        },
        {
          "position": "right",
          "objectNum": 123,
          "isTarget": false
        }
      ],
      "endTime": 1701542410000,  // Unix timestamp in milliseconds
      "gazeData": [
        {
          "x": 500,  // X coordinate of gaze point
          "y": 300,  // Y coordinate of gaze point
          "time": 1701542401234,  // Absolute timestamp
          "relativeTime": 1234,  // Time elapsed since trial start
          "phase": "experiment"  // "calibration" or "experiment"
        },
        // ... more gaze data points
      ]
    },
    // ... more trial entries (total of 40 trials)
  ],
  "gazeData": [
    // Potentially a full list of all gaze data points across all trials
    // Similar structure to the gazeData in each trial
  ],
  "timestamp": 1701542500000,  // Timestamp of entire experiment
  "totalTrials": 40
}
```
