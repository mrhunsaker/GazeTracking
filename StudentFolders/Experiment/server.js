import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Save experiment data to data/to_analyze/
app.post('/api/save-experiment-data', (req, res) => {
    try {
        const experimentData = req.body;
        const { participantId, timestamp } = experimentData;
        
        // Create filename
        const filename = `participant_${participantId}_${timestamp}.json`;
        const filepath = path.join(__dirname, 'data', 'to_analyze', filename);

        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filepath, JSON.stringify(experimentData, null, 2));
        
        console.log(`Data saved to: ${filepath}`);
        res.json({ 
            success: true, 
            message: 'Data saved successfully',
            filepath: filepath 
        });
    } 
    catch (err) {
        console.error('Error saving data:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Serve trial manifest
app.get('/trial_manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'trial_manifest.json'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// GazeTracking (c) by Michael Ryan Hunsaker, M.Ed., Ph.D.
// 
// GazeTracking is licensed under a
// Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
// 
// You should have received a copy of the license along with this
// work. If not, see <https://creativecommons.org/licenses/by-nc-sa/4.0/>.