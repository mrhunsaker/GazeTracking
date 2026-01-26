/**
 * @license
 * Copyright 2026 Michael Ryan Hunsaker, M.Ed., Ph.D. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

export default class TrialManager {
    constructor(participantId = 0) {
        this.participantId = participantId;
        this.trialData = [];
        this.currentBlockIndex = 0;
        this.currentTrialIndex = 0;
        this.isPractice = false;
        this.objectImages = { targets: [], foils: [] };
        this._lastMousePos = { x: null, y: null };
        
        // Kalman filter states for smoothing
        this.kalmanX = null;
        this.kalmanY = null;
        
        // Head pose tracking
        this.baselineHeadPose = null;
        
        // Recent gaze points for outlier detection
        this.recentGazePoints = [];
        this.maxRecentPoints = 5;
        
        // Adaptive sampling
        this.lastSampleTime = 0;
        
        // Initialize Kalman filters
        this.initKalmanFilter();
    }

    // Deterministic PRNG seeded by participantId
    seededRandom(seed) {
        return function() {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    /**
     * Initializes the Kalman filter states for X and Y coordinates.
     */
    initKalmanFilter() {
        this.kalmanX = {
            q: 0.01,  // Process noise
            r: 0.1,   // Measurement noise
            p: 1,     // Estimation error
            x: 0,     // Estimated value
            k: 0      // Kalman gain
        };
        this.kalmanY = {...this.kalmanX};
    }

    /**
     * Applies Kalman filter to a measurement.
     */
    kalmanFilter(measurement, kalmanState) {
        kalmanState.p = kalmanState.p + kalmanState.q;
        kalmanState.k = kalmanState.p / (kalmanState.p + kalmanState.r);
        kalmanState.x = kalmanState.x + kalmanState.k * (measurement - kalmanState.x);
        kalmanState.p = (1 - kalmanState.k) * kalmanState.p;
        return kalmanState.x;
    }

    /**
     * Compensates for head movement and applies Kalman filtering.
     */
    compensateForHeadMovement(gazePoint, headPoseData) {
        const smoothX = this.kalmanFilter(gazePoint.x, this.kalmanX);
        const smoothY = this.kalmanFilter(gazePoint.y, this.kalmanY);
        return {x: smoothX, y: smoothY};
    }

    /**
     * Checks if a gaze point is an outlier based on position and velocity.
     */
    isOutlier(gazePoint) {
        if (gazePoint.x < -100 || gazePoint.x > window.innerWidth + 100 ||
            gazePoint.y < -100 || gazePoint.y > window.innerHeight + 100) {
            return true;
        }
        
        if (this.recentGazePoints.length > 0) {
            const lastPoint = this.recentGazePoints[this.recentGazePoints.length - 1];
            const distance = Math.sqrt(
                Math.pow(gazePoint.x - lastPoint.x, 2) + 
                Math.pow(gazePoint.y - lastPoint.y, 2)
            );
            if (distance > 500) return true;
        }
        return false;
    }

    /**
     * Calculates head pose from facial landmarks.
     */
    calculateHeadPose(faceMesh) {
        if (!faceMesh || faceMesh.length < 468) return null;
        
        const currentPose = this.extractHeadPoseFeatures(faceMesh);
        
        if (!this.baselineHeadPose) {
            this.baselineHeadPose = currentPose;
        }
        
        return {
            roll: currentPose.roll - this.baselineHeadPose.roll,
            pitch: currentPose.pitch - this.baselineHeadPose.pitch,
            yaw: currentPose.yaw - this.baselineHeadPose.yaw,
            distance: this.calculateFaceDistance(faceMesh)
        };
    }

    /**
     * Extracts head pose features from facial landmarks.
     */
    extractHeadPoseFeatures(faceMesh) {
        const nose = faceMesh[1] || [0, 0, 0];
        const leftEye = faceMesh[33] || [0, 0, 0];
        const rightEye = faceMesh[263] || [0, 0, 0];
        
        const roll = Math.atan2(rightEye[1] - leftEye[1], rightEye[0] - leftEye[0]);
        const pitch = Math.atan2(nose[1] - (leftEye[1] + rightEye[1]) / 2, nose[2] || 1);
        const eyeDistance = Math.abs(rightEye[0] - leftEye[0]);
        const yaw = eyeDistance > 0 ? (rightEye[0] - leftEye[0]) / Math.abs(nose[0] - (leftEye[0] + rightEye[0]) / 2) : 0;
        
        return {roll, pitch, yaw};
    }

    /**
     * Calculates approximate face distance from camera.
     */
    calculateFaceDistance(faceMesh) {
        if (!faceMesh || faceMesh.length < 468) return 0;
        
        const leftEye = faceMesh[33] || [0, 0, 0];
        const rightEye = faceMesh[263] || [0, 0, 0];
        
        return Math.sqrt(
            Math.pow(rightEye[0] - leftEye[0], 2) +
            Math.pow(rightEye[1] - leftEye[1], 2)
        );
    }

    /**
     * Determines if a gaze sample should be processed based on adaptive sampling rate.
     */
    shouldProcessSample(data) {
        const now = Date.now();
        const timeSinceLastSample = now - this.lastSampleTime;
        
        let movementSpeed = 0;
        if (this.recentGazePoints.length > 0) {
            const lastPoint = this.recentGazePoints[this.recentGazePoints.length - 1];
            const distance = Math.sqrt(
                Math.pow(data.x - lastPoint.x, 2) + 
                Math.pow(data.y - lastPoint.y, 2)
            );
            const timeElapsed = (now - lastPoint.time) / 1000;
            movementSpeed = timeElapsed > 0 ? distance / timeElapsed : 0;
        }
        
        const dynamicInterval = movementSpeed > 100 ? 16 : 33;
        
        if (timeSinceLastSample >= dynamicInterval) {
            this.lastSampleTime = now;
            return true;
        }
        return false;
    }

    /**
     * Processes gaze data with filtering and compensation.
     */
    processGazeData(gazePoint, timestamp) {
        if (!gazePoint) return null;
        
        if (this.isOutlier(gazePoint)) {
            console.log('Outlier rejected:', gazePoint);
            return null;
        }
        
        let headPoseData = null;
        try {
            const faceMesh = webgazer.getTracker().getPrediction();
            if (faceMesh && faceMesh.length > 0) {
                headPoseData = this.calculateHeadPose(faceMesh);
            }
        } catch (err) {
            // Face mesh not available
        }
        
        const compensatedGaze = this.compensateForHeadMovement(gazePoint, headPoseData);
        
        this.recentGazePoints.push({x: compensatedGaze.x, y: compensatedGaze.y, time: Date.now()});
        if (this.recentGazePoints.length > this.maxRecentPoints) {
            this.recentGazePoints.shift();
        }
        
        return {
            x: compensatedGaze.x,
            y: compensatedGaze.y,
            rawX: gazePoint.x,
            rawY: gazePoint.y,
            headPose: headPoseData,
            timestamp: timestamp || Date.now()
        };
    }

    async init() {
        await this.loadManifest();
        this.rng = this.seededRandom(this.participantId);
        this.assignCounterbalancing(this.participantId);
        this.initializeColorPools();
        await this.setupImages();
    }

    // Legacy compatibility: show a modal dialog to collect initials and experiment options
    async showInitialsDialog() {
        // If running outside browser, fallback to simple prompt
        if (typeof document === 'undefined') {
            return new Promise((resolve) => {
                let input = '0';
                try { input = window.prompt('Enter participant ID (integer) or initials:', '0'); } catch (e) {}
                if (!input) input = '0';
                const asNum = parseInt(input, 10);
                if (!Number.isNaN(asNum)) this.participantId = asNum;
                else {
                    let h = 0; for (let i = 0; i < input.length; i++) h = ((h << 5) - h) + input.charCodeAt(i);
                    this.participantId = Math.abs(h) % 1000000;
                }
                this.participantInitials = input;
                this.rng = this.seededRandom(this.participantId);
                this.assignCounterbalancing(this.participantId);
                resolve();
            });
        }

        return new Promise((resolve) => {
            // create modal overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.left = 0;
            overlay.style.top = 0;
            overlay.style.right = 0;
            overlay.style.bottom = 0;
            overlay.style.background = 'rgba(0,0,0,0.6)';
            overlay.style.zIndex = 9999;
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';

            const box = document.createElement('div');
            box.style.width = '480px';
            box.style.maxWidth = '95%';
            box.style.background = '#fff';
            box.style.color = '#000';
            box.style.borderRadius = '8px';
            box.style.padding = '18px';
            box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';

            const title = document.createElement('h3');
            title.textContent = 'Participant & Experiment Options';
            box.appendChild(title);

            // initials / id
            const idLabel = document.createElement('label');
            idLabel.textContent = 'Participant ID or initials:';
            idLabel.style.display = 'block';
            idLabel.style.marginTop = '8px';
            const idInput = document.createElement('input');
            idInput.type = 'text';
            idInput.value = this.participantInitials || '';
            idInput.style.width = '100%';
            idInput.style.marginTop = '4px';
            box.appendChild(idLabel);
            box.appendChild(idInput);

            // experiment type
            const typeLabel = document.createElement('label');
            typeLabel.textContent = 'Experiment type:';
            typeLabel.style.display = 'block';
            typeLabel.style.marginTop = '8px';
            const typeSelect = document.createElement('select');
            ['shapes','colors','discrimination'].forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; typeSelect.appendChild(o); });
            typeSelect.style.width = '100%';
            box.appendChild(typeLabel);
            box.appendChild(typeSelect);

            // Note: do not allow manual selection of shapes/colors; full stimulus pool will be used

            // difficulty
            const diffLabel = document.createElement('label');
            diffLabel.textContent = 'Difficulty level:';
            diffLabel.style.display = 'block';
            diffLabel.style.marginTop = '8px';
            const diffSelect = document.createElement('select');
            Object.keys(this.manifest.difficultyLevels).forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; diffSelect.appendChild(o); });
            diffSelect.style.width = '100%';
            box.appendChild(diffLabel);
            box.appendChild(diffSelect);

            // number of trials
            const trialsLabel = document.createElement('label');
            trialsLabel.textContent = 'Trials per block:';
            trialsLabel.style.display = 'block';
            trialsLabel.style.marginTop = '8px';
            const trialsInput = document.createElement('input');
            trialsInput.type = 'number';
            trialsInput.min = 1;
            trialsInput.value = this.manifest.trialsPerBlock || 24;
            trialsInput.style.width = '100%';
            box.appendChild(trialsLabel);
            box.appendChild(trialsInput);

            // submit / cancel
            const ctrl = document.createElement('div');
            ctrl.style.display = 'flex';
            ctrl.style.justifyContent = 'flex-end';
            ctrl.style.gap = '8px';
            ctrl.style.marginTop = '12px';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(); };

            const okBtn = document.createElement('button');
            okBtn.textContent = 'Start';
            okBtn.style.background = '#4CAF50';
            okBtn.style.color = '#fff';
            okBtn.onclick = () => {
                const pidVal = idInput.value.trim() || '0';
                const asNum = parseInt(pidVal, 10);
                if (!Number.isNaN(asNum)) this.participantId = asNum;
                else { let h = 0; for (let i = 0; i < pidVal.length; i++) h = ((h << 5) - h) + pidVal.charCodeAt(i); this.participantId = Math.abs(h) % 1000000; }
                this.participantInitials = pidVal;
                this.experimentType = typeSelect.value;
                this.selectedDifficulty = diffSelect.value;
                const tpb = parseInt(trialsInput.value, 10) || this.manifest.trialsPerBlock;
                this.manifest.trialsPerBlock = tpb;
                // Do not restrict the stimulus pool; use full manifest shapes/colors

                // reseed and reassign
                this.rng = this.seededRandom(this.participantId);
                this.assignCounterbalancing(this.participantId);

                document.body.removeChild(overlay);
                resolve();
            };

            ctrl.appendChild(cancelBtn);
            ctrl.appendChild(okBtn);
            box.appendChild(ctrl);

            overlay.appendChild(box);
            document.body.appendChild(overlay);
            // focus the ID input
            idInput.focus();
        });
    }

    // Legacy compatibility: initialize webgazer if available
    async initWebGazer() {
        return new Promise((resolve) => {
            if (typeof webgazer === 'undefined') {
                console.warn('WebGazer not loaded, using mouse fallback');
                resolve(false);
                return;
            }

            // Configure WebGazer with improved settings for head movement resistance
            webgazer
                .setRegression('ridge')  // More stable than weightedRidge for head movement
                .setTracker('TFFacemesh') // More accurate face tracking
                .setGazeListener((data, clock) => {
                    // Apply adaptive sampling and processing
                    if (data && this.shouldProcessSample(data)) {
                        const processed = this.processGazeData(data, clock);
                        if (processed) {
                            this._lastGazePoint = processed;
                        }
                    }
                })
                .saveDataAcrossSessions(false) // Fresh calibration each time
                .showVideo(true) // Show video feed for debugging
                .showPredictionPoints(true); // Show where system thinks you're looking

            // Increase training data storage for better model
            webgazer.params.storingPoints = 200;

            webgazer.begin();

            // Enable pause/resume to prevent continuous updates during trials
            webgazer.pause(); // Start paused, resume after calibration

            // Wait for WebGazer to fully initialize
            setTimeout(() => {
                console.log('WebGazer initialized with enhanced settings');
                resolve(true);
            }, 1000);
        });
    }

    // Enhanced calibration phase with validation
    async startCalibrationPhase() {
        return new Promise(async (resolve) => {
            if (typeof webgazer === 'undefined') {
                console.warn('WebGazer not available, skipping calibration');
                resolve();
                return;
            }

            // Resume WebGazer for calibration
            if (typeof webgazer.resume === 'function') {
                webgazer.resume();
            }

            // Create calibration UI
            const calibrationDiv = document.createElement('div');
            calibrationDiv.id = 'calibration-container';
            calibrationDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #1a1a1a;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            `;

            const instructions = document.createElement('div');
            instructions.style.cssText = `
                color: white;
                font-size: 24px;
                text-align: center;
                margin-bottom: 50px;
                max-width: 600px;
            `;
            instructions.innerHTML = `
                <h2>Calibration Phase</h2>
                <p>Please click on each blue circle as it appears.</p>
                <p>Keep your head still and follow the points with your eyes.</p>
                <p id="calibration-progress">Point 1 of 9</p>
            `;
            calibrationDiv.appendChild(instructions);

            document.body.appendChild(calibrationDiv);

            // 9-point calibration grid for better coverage
            const calibrationPoints = [
                { x: 0.1, y: 0.1 },   // top-left
                { x: 0.5, y: 0.1 },   // top-center
                { x: 0.9, y: 0.1 },   // top-right
                { x: 0.1, y: 0.5 },   // middle-left
                { x: 0.5, y: 0.5 },   // center
                { x: 0.9, y: 0.5 },   // middle-right
                { x: 0.1, y: 0.9 },   // bottom-left
                { x: 0.5, y: 0.9 },   // bottom-center
                { x: 0.9, y: 0.9 }    // bottom-right
            ];

            let currentPoint = 0;
            const calibrationData = [];

            const showCalibrationPoint = () => {
                const point = calibrationPoints[currentPoint];
                const dot = document.createElement('div');
                dot.className = 'calibration-dot';
                dot.style.cssText = `
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    background: #2196F3;
                    border-radius: 50%;
                    border: 3px solid white;
                    cursor: pointer;
                    left: ${point.x * window.innerWidth - 15}px;
                    top: ${point.y * window.innerHeight - 15}px;
                    animation: pulse 1s infinite;
                `;

                // Add pulse animation
                if (!document.getElementById('calibration-pulse-style')) {
                    const style = document.createElement('style');
                    style.id = 'calibration-pulse-style';
                    style.textContent = `
                        @keyframes pulse {
                            0%, 100% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(1.2); opacity: 0.8; }
                        }
                    `;
                    document.head.appendChild(style);
                }

                dot.addEventListener('click', async () => {
                    // Record click for calibration
                    const clickData = {
                        x: point.x * window.innerWidth,
                        y: point.y * window.innerHeight,
                        timestamp: Date.now()
                    };
                    calibrationData.push(clickData);

                    // Give WebGazer multiple samples at this point - INCREASED from 5 to 10
                    for (let i = 0; i < 10; i++) {
                        await new Promise(r => setTimeout(r, 150));
                        webgazer.recordScreenPosition(clickData.x, clickData.y);
                    }

                    dot.remove();
                    currentPoint++;

                    // Update progress
                    const progress = document.getElementById('calibration-progress');
                    if (progress) {
                        progress.textContent = `Point ${currentPoint + 1} of ${calibrationPoints.length}`;
                    }

                    if (currentPoint < calibrationPoints.length) {
                        setTimeout(showCalibrationPoint, 500);
                    } else {
                        // Calibration complete - validate
                        await this.validateCalibration(calibrationDiv);
                        calibrationDiv.remove();
                        
                        // Clear the regression model's stored data to prevent stuck predictions
                        console.log('Calibration complete, clearing old prediction cache');
                        
                        resolve();
                    }
                });

                calibrationDiv.appendChild(dot);
            };

            // Start calibration
            setTimeout(showCalibrationPoint, 1000);
        });
    }

    // Validate calibration quality
    async validateCalibration(container) {
        const validationDiv = document.createElement('div');
        validationDiv.style.cssText = `
            color: white;
            font-size: 20px;
            text-align: center;
            padding: 30px;
        `;
        validationDiv.innerHTML = `
            <h3>Validating calibration...</h3>
            <p>Please look at the center of the screen</p>
        `;
        container.innerHTML = '';
        container.appendChild(validationDiv);

        // Test prediction at screen center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        await new Promise(r => setTimeout(r, 2000));

        const prediction = await this.getCurrentGazePrediction();
        
        if (prediction && prediction.x !== null && prediction.y !== null) {
            const errorX = Math.abs(prediction.x - centerX);
            const errorY = Math.abs(prediction.y - centerY);
            const totalError = Math.sqrt(errorX * errorX + errorY * errorY);

            console.log(`Calibration error: ${totalError.toFixed(2)}px`);

            if (totalError > 300) {
                validationDiv.innerHTML += `
                    <p style="color: #ff9800;">⚠️ Calibration accuracy may be low</p>
                    <p>Error: ${totalError.toFixed(0)}px</p>
                `;
                await new Promise(r => setTimeout(r, 2000));
            } else {
                validationDiv.innerHTML += `
                    <p style="color: #4caf50;">✓ Calibration successful!</p>
                    <p>Error: ${totalError.toFixed(0)}px</p>
                `;
                await new Promise(r => setTimeout(r, 1500));
            }
        } else {
            validationDiv.innerHTML += `
                <p style="color: #f44336;">❌ No gaze data detected</p>
                <p>Please ensure your face is visible to the camera</p>
            `;
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    // Get current gaze prediction with validation
    async getCurrentGazePrediction() {
        if (typeof webgazer === 'undefined') {
            return null;
        }

        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 100);
            
            webgazer.getCurrentPrediction().then(prediction => {
                clearTimeout(timeout);
                
                // Validate prediction
                if (!prediction || prediction.x === null || prediction.y === null) {
                    resolve(null);
                    return;
                }

                // Check if within screen bounds (with small margin)
                const margin = 200; // Allow some extrapolation
                if (prediction.x < -margin || 
                    prediction.x > window.innerWidth + margin ||
                    prediction.y < -margin || 
                    prediction.y > window.innerHeight + margin) {
                    console.warn('Prediction out of bounds:', prediction);
                    resolve(null);
                    return;
                }

                resolve(prediction);
            }).catch(() => {
                clearTimeout(timeout);
                resolve(null);
            });
        });
    }

    // Enhanced gaze recording with validation and stuck detection
    async startGazeRecording(durationMs = 2000, intervalMs = 250) {
        const samples = [];
        const startTime = Date.now();
        let lastValidPrediction = null;
        let stuckCount = 0;
        const stuckThreshold = 3;
        
        // Track last N predictions to detect stuck state
        const recentPredictions = [];
        const maxRecentPredictions = 10;

        return new Promise((resolve) => {
            const intervalId = setInterval(async () => {
                const elapsed = Date.now() - startTime;
                
                // Get prediction using the enhanced validation method
                let prediction = await this.getCurrentGazePrediction();

                // Track recent predictions
                if (prediction && prediction.x !== null && prediction.y !== null) {
                    recentPredictions.push({ x: prediction.x, y: prediction.y });
                    if (recentPredictions.length > maxRecentPredictions) {
                        recentPredictions.shift();
                    }
                }

                // Check if predictions are stuck (all within 10px radius)
                if (recentPredictions.length >= 5) {
                    const avgX = recentPredictions.reduce((sum, p) => sum + p.x, 0) / recentPredictions.length;
                    const avgY = recentPredictions.reduce((sum, p) => sum + p.y, 0) / recentPredictions.length;
                    
                    const allNearAverage = recentPredictions.every(p => 
                        Math.abs(p.x - avgX) < 10 && Math.abs(p.y - avgY) < 10
                    );

                    if (allNearAverage) {
                        stuckCount++;
                        if (stuckCount >= stuckThreshold) {
                            console.warn(`⚠️ Gaze stuck at (${Math.round(avgX)}, ${Math.round(avgY)})`);
                            // Record null values for stuck predictions
                            prediction = { x: null, y: null };
                            recentPredictions.length = 0; // Clear history
                        }
                    } else {
                        stuckCount = 0;
                    }
                }

                // If prediction is invalid or stuck, record null
                if (!prediction || prediction.x === null) {
                    prediction = { x: null, y: null };
                }

                samples.push({
                    t: elapsed,
                    x: prediction.x !== null ? Math.round(prediction.x) : null,
                    y: prediction.y !== null ? Math.round(prediction.y) : null
                });

                if (prediction.x !== null && prediction.y !== null) {
                    lastValidPrediction = prediction;
                }

                if (elapsed >= durationMs) {
                    clearInterval(intervalId);
                    
                    // Log data quality metrics
                    const validSamples = samples.filter(s => s.x !== null && s.y !== null);
                    const validPercent = (validSamples.length / samples.length * 100).toFixed(1);
                    
                    // Check variance to detect stuck data
                    if (validSamples.length > 0) {
                        const xValues = validSamples.map(s => s.x);
                        const yValues = validSamples.map(s => s.y);
                        const xVariance = this.calculateVariance(xValues);
                        const yVariance = this.calculateVariance(yValues);
                        const totalVariance = xVariance + yVariance;
                        
                        console.log(`Gaze data quality: ${validPercent}% valid (${validSamples.length}/${samples.length}), variance: ${totalVariance.toFixed(0)}`);
                        
                        if (totalVariance < 100) {
                            console.warn('⚠️ Very low variance - gaze tracking may be stuck');
                        }
                    } else {
                        console.error('⚠️ NO VALID GAZE DATA COLLECTED - Check WebGazer initialization and face detection');
                    }
                    
                    resolve(samples);
                }
            }, intervalMs);
        });
    }

    calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    async loadManifest() {
        const res = await fetch('trial_manifest.json');
        this.manifest = await res.json();
    }

    generateLatinSquare(levels) {
        const square = [];
        for (let i = 0; i < levels.length; i++) {
            square.push(levels.slice(i).concat(levels.slice(0, i)));
        }
        return square;
    }

    assignCounterbalancing(pid) {
        const levels = Object.keys(this.manifest.difficultyLevels);
        const square = this.generateLatinSquare(levels);
        this.blockDifficultyOrder = square[pid % square.length];
    }

    initializeColorPools() {
        this.remainingColors = [...this.manifest.colors];
    }

    startBlock(blockIndex, practice = false) {
        this.isPractice = practice;
        this.currentBlockIndex = blockIndex;
        this.currentTrialIndex = 0;

        this.currentBlockDifficulty = practice ? 'easy' : this.blockDifficultyOrder[blockIndex];

        if (practice && this.manifest.practice && this.manifest.practice.allowColorRepeat) {
            this.currentBlockColor = this.manifest.colors[Math.floor(Math.random() * this.manifest.colors.length)];
        } else {
            if (!this.remainingColors || !this.remainingColors.length) this.initializeColorPools();
            if (!this.remainingColors.length) throw new Error('Color pool exhausted');
            const idx = Math.floor(this.rng() * this.remainingColors.length);
            this.currentBlockColor = this.remainingColors.splice(idx, 1)[0];
        }
    }

    getImage(shape, ratio, color) {
        // manifest filenames use shape-ratio-color.svg (ratio '1.00' for canonical)
        return `experiment-shapes/${shape}-${ratio}-${color}.svg`;
    }

    // Preload images for targets (1.00) and foils (all ratios)
    async setupImages() {
        console.log('Setting up images for shape experiment');
        const STIMULUS_DIR = 'experiment-shapes';
        const preload = (src) => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load ' + src));
            img.src = src;
        });

        const promises = [];

        const shapes = this.manifest.shapes;
        const colors = this.manifest.colors;
        const allRatios = [].concat(...Object.values(this.manifest.difficultyLevels));
        const uniqueRatios = [...new Set(allRatios)];

        for (const shape of shapes) {
            for (const color of colors) {
                // target (1.00)
                const tfile = `${STIMULUS_DIR}/${shape}-1.00-${color}.svg`;
                promises.push(preload(tfile).then(img => this.objectImages.targets.push({shape, color, ratio: '1.00', img})).catch(() => {}));

                // foils (only altered ratios)
                for (const ratio of uniqueRatios) {
                    const ffile = `${STIMULUS_DIR}/${shape}-${ratio}-${color}.svg`;
                    promises.push(preload(ffile).then(img => this.objectImages.foils.push({shape, color, ratio, img})).catch(() => {}));
                }
            }
        }

        await Promise.all(promises);
        console.log('Image preload complete');
    }

    // Returns a target and foil according to difficulty rules
    getTrialStimuli({difficulty}) {
        if (!this.manifest.difficultyLevels[difficulty]) throw new Error('Invalid difficulty: ' + difficulty);

        // pick random target from preloaded targets
        if (!this.objectImages.targets.length) throw new Error('No target images preloaded');
        const target = this.objectImages.targets[Math.floor(this.rng() * this.objectImages.targets.length)];

        const allowedRatios = this.manifest.difficultyLevels[difficulty];
        const foils = this.objectImages.foils.filter(f => f.shape === target.shape && allowedRatios.includes(f.ratio) && f.color === target.color);
        if (!foils.length) throw new Error('No valid foils found for ' + target.shape + ' @ ' + difficulty);
        const foil = foils[Math.floor(this.rng() * foils.length)];

        return { target, foil };
    }
    generateTrial() {
        // choose stimuli consistent with experiment type
        const difficulty = this.currentBlockDifficulty;
        const types = this.manifest.shapes;
        const colors = this.manifest.colors;

        const pickRandom = (arr) => arr[Math.floor(this.rng() * arr.length)];

        if (this.experimentType === 'shapes') {
            // target: pick shape and color; foils: two different shapes, each with a different color
            const targetShape = pickRandom(types);
            const targetColor = pickRandom(colors);
            const target = { shape: targetShape, color: targetColor, ratio: '1.00', img: null };

            // pick two other shapes
            const otherShapes = types.filter(s => s !== targetShape);
            const foilShape1 = pickRandom(otherShapes);
            let foilShape2 = pickRandom(otherShapes);
            while (foilShape2 === foilShape1 && otherShapes.length > 1) foilShape2 = pickRandom(otherShapes);

            // choose two colors different from targetColor (and from each other when possible)
            const otherColors = colors.filter(c => c !== targetColor);
            let foilColor1 = null;
            let foilColor2 = null;
            if (otherColors.length === 0) {
                // no alternative colors available, fallback to targetColor
                foilColor1 = targetColor;
                foilColor2 = targetColor;
            } else if (otherColors.length === 1) {
                foilColor1 = otherColors[0];
                foilColor2 = targetColor === otherColors[0] ? targetColor : otherColors[0];
            } else {
                foilColor1 = pickRandom(otherColors);
                // ensure foilColor2 != foilColor1
                const remaining = otherColors.filter(c => c !== foilColor1);
                foilColor2 = pickRandom(remaining);
            }

            const foil1 = { shape: foilShape1, color: foilColor1, ratio: '1.00', img: null };
            const foil2 = { shape: foilShape2, color: foilColor2, ratio: '1.00', img: null };

            this.currentTrial = { target, foils: [foil1, foil2], difficulty };
        }
        else if (this.experimentType === 'colors') {
            // target: pick color and shape; foils: same shape, two different colors
            const targetColor = pickRandom(colors);
            const shape = pickRandom(types);
            const target = { shape, color: targetColor, ratio: '1.00', img: null };

            const otherColors = colors.filter(c => c !== targetColor);
            const c1 = pickRandom(otherColors);
            let c2 = pickRandom(otherColors);
            while (c2 === c1 && otherColors.length > 1) c2 = pickRandom(otherColors);
            const foil1 = { shape, color: c1, ratio: '1.00', img: null };
            const foil2 = { shape, color: c2, ratio: '1.00', img: null };

            this.currentTrial = { target, foils: [foil1, foil2], difficulty };
        }
        else { // discrimination
            const shape = pickRandom(types);
            const color = pickRandom(colors);
            const target = { shape, color, ratio: '1.00', img: null };
            const allowedRatios = this.manifest.difficultyLevels[difficulty] || [];
            // pick two foils from allowed ratios
            const foil1 = { shape, color, ratio: allowedRatios[0] || '1.25', img: null };
            const foil2 = { shape, color, ratio: allowedRatios[1] || '1.50', img: null };
            this.currentTrial = { target, foils: [foil1, foil2], difficulty };
        }

        // attach preloaded images if available
        const attachImg = (obj) => {
            const found = this.objectImages.targets.find(t => t.shape === obj.shape && t.color === obj.color && t.ratio === (obj.ratio || '1.00'));
            if (found) obj.img = found.img;
            else {
                // search foils if ratio differs
                const f = this.objectImages.foils.find(x => x.shape === obj.shape && x.color === obj.color && x.ratio === obj.ratio);
                if (f) obj.img = f.img;
            }
        };
        attachImg(this.currentTrial.target);
        attachImg(this.currentTrial.foils[0]);
        attachImg(this.currentTrial.foils[1]);

        this.trialStart = performance.now();
    }

    handleTrialResponse(response) {
        const rt = performance.now() - this.trialStart;
        const { target, foil, difficulty } = this.currentTrial;

        // log trial (audit-ready)
        this.trialData.push({
            participantId: this.participantId,
            practice: this.isPractice,
            blockIndex: this.currentBlockIndex,
            trialIndex: this.currentTrialIndex,
            shape: target.shape,
            color: target.color,
            difficulty,
            foilRatio: foil.ratio,
            response,
            correct: response === 'target',
            rt
        });

        this.currentTrialIndex++;
    }

    // UI rendering helper: render the current trial into a container (selector or element)
    // Returns { targetImgEl, foilImgEl }
    renderTrial(container) {
        let el = null;
        if (typeof container === 'string') el = document.querySelector(container);
        else el = container;
        if (!el) throw new Error('Container not found for renderTrial');

        // clear existing
        while (el.firstChild) el.removeChild(el.firstChild);

        // Render three stimuli (target + two foils) in randomized positions
        const items = [];
        const t = this.currentTrial.target;
        items.push({ type: 'target', obj: t });
        items.push({ type: 'foil', obj: this.currentTrial.foils[0] });
        items.push({ type: 'foil', obj: this.currentTrial.foils[1] });

        // shuffle using rng for determinism
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }

        // Position images similar to legacy: center, left, right using absolute placement
        const containerEl = el;
        // ensure container is a positioned element so absolute children are positioned relative to it
        try {
            const cs = getComputedStyle(containerEl);
            if (!cs || cs.position === 'static' || cs.position === '') containerEl.style.position = 'relative';
        } catch (e) {
            // fallback for environments without getComputedStyle
            containerEl.style.position = containerEl.style.position || 'relative';
        }

        const ids = { targetId: null, foilIds: [] };
        const positions = {};

        // Pre-append images with absolute positioning; we'll compute exact left/top after layout
        items.forEach((it, idx) => {
            const src = (it.obj && it.obj.img) ? it.obj.img.src : this.getImage(it.obj.shape, it.obj.ratio, it.obj.color);
            const img = document.createElement('img');
            const id = `obj-${this.currentBlockIndex}-${this.currentTrialIndex}-${idx}`;
            img.id = id;
            img.src = src;
            img.alt = `${it.type}-${it.obj.shape}-${it.obj.ratio || '1.00'}`;
            img.style.position = 'absolute';
            img.style.width = '1600px';
            img.style.maxWidth = '95%';
            img.style.margin = '0';
            img.style.zIndex = 1000;
            // temporarily place at top-left; we'll move after measuring
            img.style.left = '0px';
            img.style.top = '0px';

            containerEl.appendChild(img);

            if (it.type === 'target') ids.targetId = id;
            else ids.foilIds.push(id);
        });

        // Ensure images are loaded before computing layout; wait for each image's load event.
        const loadPromises = [];
        items.forEach((it, idx) => {
            const id = `obj-${this.currentBlockIndex}-${this.currentTrialIndex}-${idx}`;
            const img = document.getElementById(id);
            if (!img) return;
            if (img.complete && img.naturalWidth && img.naturalHeight) {
                loadPromises.push(Promise.resolve());
            } else {
                loadPromises.push(new Promise((res) => {
                    const done = () => { res(); cleanup(); };
                    const onError = () => { res(); cleanup(); };
                    const cleanup = () => { img.removeEventListener('load', done); img.removeEventListener('error', onError); };
                    img.addEventListener('load', done);
                    img.addEventListener('error', onError);
                }));
            }
        });

        Promise.all(loadPromises).then(() => {
            try {
                const containerWidth = containerEl.clientWidth || window.innerWidth;
                const containerHeight = containerEl.clientHeight || window.innerHeight;

                // Measure each image's displayed size without affecting layout: make them absolute+hidden at 0,0 then measure.
                const measured = {};
                items.forEach((it, idx) => {
                    const id = `obj-${this.currentBlockIndex}-${this.currentTrialIndex}-${idx}`;
                    const img = document.getElementById(id);
                    if (!img) return;
                    // ensure absolute positioning for measurement
                    img.style.position = 'absolute';
                    img.style.left = '0px';
                    img.style.top = '0px';
                    img.style.visibility = 'hidden';
                    const r = img.getBoundingClientRect();
                    measured[idx] = { id, width: r.width, height: r.height, img };
                });

                const gap = 20;

                // 1) Center first
                const center = measured[0];
                if (center) {
                    const cLeft = Math.round((containerWidth - center.width) / 2);
                    const cTop = Math.round((containerHeight - center.height) / 2);
                    center.img.style.left = cLeft + 'px';
                    center.img.style.top = cTop + 'px';
                    center.img.style.visibility = 'visible';
                    positions[center.id] = { x: cLeft, y: cTop, width: center.width, height: center.height };
                }

                // 2) Place left foil
                const left = measured[1];
                if (left) {
                    const desiredLeft = 100;
                    const leftTop = center ? positions[center.id].y : Math.round((containerHeight - left.height) / 2);
                    // initial placement at 100px from left
                    let leftLeft = desiredLeft;
                    // if overlapping center, try to move left further left (closer to 0)
                    if (center) {
                        const centerLeft = positions[center.id].x;
                        if (leftLeft + left.width + gap > centerLeft) {
                            leftLeft = Math.max(0, centerLeft - gap - left.width);
                        }
                    }
                    left.img.style.left = Math.round(leftLeft) + 'px';
                    left.img.style.top = Math.round(leftTop) + 'px';
                    left.img.style.visibility = 'visible';
                    positions[left.id] = { x: leftLeft, y: leftTop, width: left.width, height: left.height };
                }

                // 3) Place right foil
                const right = measured[2];
                if (right) {
                    const desiredRight = Math.round(containerWidth - 100 - right.width);
                    const rightTop = center ? positions[center.id].y : Math.round((containerHeight - right.height) / 2);
                    let rightLeft = desiredRight;
                    if (center) {
                        const centerRight = positions[center.id].x + positions[center.id].width;
                        if (centerRight > rightLeft - gap) {
                            rightLeft = Math.min(containerWidth - right.width, centerRight + gap);
                        }
                    }
                    right.img.style.left = Math.round(rightLeft) + 'px';
                    right.img.style.top = Math.round(rightTop) + 'px';
                    right.img.style.visibility = 'visible';
                    positions[right.id] = { x: rightLeft, y: rightTop, width: right.width, height: right.height };
                }

                // store metadata for trial
                this.currentTrial.ids = ids;
                this.currentTrial.positions = positions;
            } catch (e) {
                console.warn('Error computing absolute positions for trial images', e);
            }
        }).catch((e) => {
            console.warn('Error waiting for images to load for placement', e);
        });

        return ids;
    }

    // Convenience: create two response buttons and attach handler. onResponse is optional callback.
    // Buttons will call handleTrialResponse and then invoke onResponse(response).
    createResponseButtons(container, onResponse) {
        let el = null;
        if (typeof container === 'string') el = document.querySelector(container);
        else el = container;
        if (!el) throw new Error('Container not found for createResponseButtons');

        const btnWrapper = document.createElement('div');
        btnWrapper.style.display = 'flex';
        btnWrapper.style.justifyContent = 'center';
        btnWrapper.style.gap = '1rem';
        btnWrapper.style.marginTop = '0.5rem';

        const targetBtn = document.createElement('button');
        targetBtn.textContent = 'Target';
        const foilBtn = document.createElement('button');
        foilBtn.textContent = 'Foil';

        targetBtn.addEventListener('click', () => {
            this.handleTrialResponse('target');
            if (onResponse) onResponse('target');
            // remove buttons after response
            if (btnWrapper.parentNode) btnWrapper.parentNode.removeChild(btnWrapper);
        });
        foilBtn.addEventListener('click', () => {
            this.handleTrialResponse('foil');
            if (onResponse) onResponse('foil');
            if (btnWrapper.parentNode) btnWrapper.parentNode.removeChild(btnWrapper);
        });

        btnWrapper.appendChild(targetBtn);
        btnWrapper.appendChild(foilBtn);
        el.appendChild(btnWrapper);
        return { targetBtn, foilBtn };
    }

    // Download trialData as JSON file from the browser
    downloadTrialDataJSON(filename = null) {
        const data = JSON.stringify(this.trialData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = filename || `participant_${this.participantId}_trials.json`;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    enforceRest() {
        return new Promise(res => setTimeout(res, (this.manifest.restSecondsBetweenBlocks || 15) * 1000));
    }

    exportCSV() {
        if (!this.trialData.length) return '';
        const headers = Object.keys(this.trialData[0]);
        const rows = [headers.join(',')];
        for (const r of this.trialData) rows.push(headers.map(h => r[h]).join(','));
        return rows.join('\n');
    }

    // Show the center target image and wait for the participant to press a visible Continue button
    async showCenterPresentation(container) {
        let el = null;
        if (typeof container === 'string') el = document.querySelector(container);
        else el = container;
        if (!el) throw new Error('Container not found for center presentation');

        // clear
        while (el.firstChild) el.removeChild(el.firstChild);

        const centerWrap = document.createElement('div');
        centerWrap.style.display = 'flex';
        centerWrap.style.flexDirection = 'column';
        centerWrap.style.alignItems = 'center';
        centerWrap.style.justifyContent = 'center';

        const imgSrc = (this.currentTrial && this.currentTrial.target && this.currentTrial.target.img)
            ? this.currentTrial.target.img.src
            : this.getImage(this.currentTrial.target.shape, this.currentTrial.target.ratio, this.currentTrial.target.color);

        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `center-target-${this.currentTrial.target.shape}`;
        img.style.width = '1600px';
        img.style.maxWidth = '95%';
        img.style.margin = '8px';

        centerWrap.appendChild(img);
        el.appendChild(centerWrap);

        const durationMs = (this.manifest && this.manifest.timings && this.manifest.timings.centerMs) || 2500;
        return new Promise((resolve) => {
            setTimeout(() => {
                if (centerWrap.parentNode) centerWrap.parentNode.removeChild(centerWrap);
                resolve();
            }, durationMs);
        });
    }

    // Start sampling gaze (or mouse fallback) at intervalMs for durationMs; returns samples [{t,x,y}]
    async startGazeRecording(durationMs = 2000, intervalMs = 250) {
        const samples = [];
        const start = performance.now();
        // mouse fallback listener
        const mouseHandler = (ev) => { 
            this._lastMousePos = { x: ev.clientX, y: ev.clientY }; 
        };
        window.addEventListener('mousemove', mouseHandler);

        const tick = () => {
            let x = null, y = null;
            try {
                if (window.webgazer && typeof window.webgazer.getCurrentPrediction === 'function') {
                    const p = window.webgazer.getCurrentPrediction();
                    if (p && typeof p.x === 'number' && typeof p.y === 'number') { x = p.x; y = p.y; }
                }
            } catch (e) { /* ignore */ }

            if ((x === null || y === null) && this._lastMousePos) {
                x = this._lastMousePos.x; y = this._lastMousePos.y;
            }

            samples.push({ t: Math.round(performance.now() - start), x, y });
        };

        // first sample immediately
        tick();
        const iv = setInterval(() => {
            tick();
        }, intervalMs);

        await new Promise(res => setTimeout(res, durationMs));
        clearInterval(iv);
        window.removeEventListener('mousemove', mouseHandler);
        return samples;
    }

    // Start the experiment run loop: iterate blocks and trials, render stimuli, collect responses
    async startExperiment() {
        if (!this.manifest)
            throw new Error('Manifest not loaded');

        // ensure color pools initialized
        if (!this.remainingColors || !Array.isArray(this.remainingColors))
            this.initializeColorPools();

        // VERIFY WEBGAZER IS WORKING BEFORE STARTING TRIALS
        if (typeof webgazer !== 'undefined') {
            console.log('Testing WebGazer before experiment...');
            const testPrediction = await this.getCurrentGazePrediction();
            if (!testPrediction || testPrediction.x === null) {
                console.error('❌ WebGazer not providing predictions! Face may not be detected.');
                const proceed = confirm('WebGazer is not detecting your face. Proceed with mouse tracking only?');
                if (!proceed) {
                    throw new Error('WebGazer calibration failed');
                }
            } else {
                console.log('✓ WebGazer working:', testPrediction);
            }
        }

        const isPracticeMode = this.experimentType === 'practice' && this.manifest.practice && this.manifest.practice.enabled;
        const totalBlocks = isPracticeMode ? this.manifest.practice.blocks : this.manifest.blocks;

        for (let b = 0; b < totalBlocks; b++) {
            this.startBlock(b, isPracticeMode);
            const trialsPerBlock = isPracticeMode ? this.manifest.practice.trialsPerBlock : this.manifest.trialsPerBlock;

            for (this.currentTrialIndex = 0; this.currentTrialIndex < trialsPerBlock; ) {
                try {
                    this.generateTrial();
                } catch (err) {
                    console.error('generateTrial error:', err);
                    break;
                }

                // show center-target presentation, then blank, then render choices and wait for response
                try {
                    await this.showCenterPresentation('#test-container');
                } catch (e) {
                    // non-fatal: continue to choices
                    console.warn('Center presentation failed:', e);
                }
                // optional blank interval between center and choices
                try {
                    const blankMs = (this.manifest && this.manifest.timings && this.manifest.timings.blankMs) || 250;
                    if (blankMs > 0) await new Promise(res => setTimeout(res, blankMs));
                } catch (e) { /* ignore */ }

                try {
                    this.renderTrial('#test-container');
                } catch (err) {
                    console.error('renderTrial error:', err);
                }

                // record gaze samples while choices are visible
                try {
                    const trialDisplayMs = (this.manifest && this.manifest.timings && this.manifest.timings.choiceMs) || 2000;
                    const sampleIntervalMs = (this.manifest && this.manifest.timings && this.manifest.timings.sampleIntervalMs) || 250;
                    const samples = await this.startGazeRecording(trialDisplayMs, sampleIntervalMs);

                    // store trial data including object ids/positions and samples
                    const { target, foils } = this.currentTrial;
                    this.trialData.push({
                        participantId: this.participantId,
                        practice: this.isPractice,
                        blockIndex: this.currentBlockIndex,
                        trialIndex: this.currentTrialIndex,
                        shape: target.shape,
                        color: target.color,
                        difficulty: this.currentTrial.difficulty,
                        targetId: this.currentTrial.ids && this.currentTrial.ids.targetId,
                        foilIds: this.currentTrial.ids && this.currentTrial.ids.foilIds,
                        positions: this.currentTrial.positions,
                        foilRatios: foils.map(f => f.ratio),
                        samples,
                    });
                } catch (err) {
                    console.error('gaze recording error:', err);
                }

                // advance trial index
                this.currentTrialIndex++;
            }

            // end of block: optionally rest
            if (b < totalBlocks - 1) {
                await this.enforceRest();
            }
        }

        console.log('Experiment complete');
        
        // Hide WebGazer video after experiment
        if (typeof webgazer !== 'undefined') {
            webgazer.showVideo(false);
            webgazer.showPredictionPoints(false);
        }
        
        try {
            const experimentData = {
                participantId: this.participantId,
                experimentType: this.experimentType,
                trialData: this.trialData,
                timestamp: Date.now(),
                totalTrials: this.trialData.length
            };

            // Save to localforage (browser storage)
            await localforage.setItem(`experimentData_${this.participantId}`, experimentData);
            console.log('Data saved to localforage successfully');

            // Download JSON to user's computer
            this.downloadTrialDataJSON();

            // Send to backend to save in data/to_analyze/
            await this.saveDataToServer(experimentData);

            // Show completion message
            this.showCompletionMessage();
        } 
        catch (err) {
            console.error('Error in experiment completion:', err);
            alert('Error completing experiment. Please check the console.');
        }
    }

    async saveDataToServer(experimentData) {
        try {
            const response = await fetch('/api/save-experiment-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(experimentData)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('Data saved to server successfully:', result);
        } 
        catch (err) {
            console.error('Failed to save data to server:', err);
            // Don't throw - user data is already in localforage and downloaded
        }
    }

    showCompletionMessage() {
        const msg = document.createElement('div');
        msg.style.position = 'fixed';
        msg.style.top = '50%';
        msg.style.left = '50%';
        msg.style.transform = 'translate(-50%, -50%)';
        msg.style.background = '#4CAF50';
        msg.style.color = 'white';
        msg.style.padding = '30px';
        msg.style.borderRadius = '8px';
        msg.style.zIndex = '10000';
        msg.style.textAlign = 'center';
        msg.style.fontSize = '18px';
        msg.style.fontFamily = 'Arial, sans-serif';
        msg.textContent = `Experiment complete! Data saved for participant ${this.participantId}.`;
        document.body.appendChild(msg);
    }
}

/**
 * Initializes the experiment by setting up event listeners for user interaction,
 * managing trials, and starting the calibration phase. This function handles the
 * sequential setup process such as collecting user input, preparing images, and
 * enabling WebGazer functionality, followed by starting the required calibration.
 *
 * @return {void} Does not return a value as it solely initializes the experiment setup process.
 */
export async function initializeExperiment() {
    const trialManager = new TrialManager();
    let experimentInitiated = false;

    // Ensure manifest is loaded before showing any UI that depends on it
    try {
        await trialManager.loadManifest();
    } catch (err) {
        console.error('Failed to load trial manifest during initialization', err);
        // allow showInitialsDialog to attempt to recover by loading manifest itself
    }

    document.addEventListener("keydown", async (e) => {
        if (experimentInitiated) return;

        experimentInitiated = true;
        try {
            /** 1. First show the dialog and get user input **/
            await trialManager.showInitialsDialog();

            /** 2. Then setup images and initialize WebGazer **/
            await Promise.all([
                trialManager.setupImages(),
                trialManager.initWebGazer(),
            ]);

            /** 3. Start calibration phase without showing dialog again **/
            await trialManager.startCalibrationPhase();
            // After calibration, start the experiment run loop
            try {
                await trialManager.startExperiment();
            } catch (e) {
                console.error('Failed to start experiment:', e);
            }
        }
        catch (err) {
            console.error(`Initialization error:`, err);
            experimentInitiated = false;
        }
    });
}