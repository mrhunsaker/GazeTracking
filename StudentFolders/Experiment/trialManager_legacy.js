import {
    objectExclusions_Abstract,
    objectExclusions_Colors,
    objectExclusions_Pictures,
    objectExclusions_Shapes
} from './objectExclusions_legacy.js'; // objectExclusions_Pictures not available yet, still only has colors in the folder

/**
 * Initializes the experiment by setting up event listeners for user interaction,
 * managing trials, and starting the calibration phase. This function handles the
 * sequential setup process such as collecting user input, preparing images, and
 * enabling WebGazer functionality, followed by starting the required calibration.
 *
 * @return {void} Does not return a value as it solely initializes the experiment setup process.
 */
export function initializeExperiment() {
    const trialManager = new TrialManager();
    let experimentInitiated = false;

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
        }
        catch (err) {
            console.error(`Initialization error:`, err);
            experimentInitiated = false;
        }
    });
}

/**
 * Manages trials, user data input, gaze data collection, and trial related processes.
 */
export class TrialManager {
    constructor() {
        this.testContainer = document.getElementById("test-container"); //
        this.instructionElement = document.getElementById("instruction");
        this.trialTypes = ["1", "2"];
        this.trialCount = null;
        this.currentTrial = 0;
        this.currentTrialData = {};
        this.trialData = [];
        this.gazeData = [];
        this.isExperimentStarted = false;
        this.calibrationComplete = false;
        this.calibrationInProgress = false;
        this.CALIBRATION_POINTS = 10; // Number of calibration points
        this.currentGazeData = []; // Store gaze data for current trial
        this.allGazeData = []; // Store all gaze data across trials
        this.userInitials = '';
        this.objectExclusions_Shapes = {};
        this.objectExclusions_Colors = {};
        this.objectExclusions_Abstract = {};

    }

    async initializeExclusions() {
        try {
            // Import exclusions based on selected test type
            switch (this.testType.toLowerCase()) {
                case 'Shapes':
                    const {objectExclusions_Shapes} = await import('./objectExclusions_legacy.js');
                    this.objectExclusions_Shapes = objectExclusions_Shapes;
                    break;
                case 'Colors':
                    const {objectExclusions_Colors} = await import('./objectExclusions_legacy.js');
                    this.objectExclusions_Colors = objectExclusions_Colors;
                    break;
                case 'Abstract':
                    const {objectExclusions_Abstract} = await import('./objectExclusions_legacy.js');
                    this.objectExclusions_Abstract = objectExclusions_Abstract;
                    break;
                case 'Pictures':
                    const {objectExclusions_Pictures} = await import('./objectExclusions_legacy.js');
                    this.objectExclusions_Abstract = objectExclusions_Abstract;
                    break;
                default:
                    console.warn('Unknown test type:', this.testType);
            }
        }
        catch (error) {
            console.error('Error loading exclusions:', error);
            this[`objectExclusions_${this.testType}`] = {};
        }
    }

    showInitialsDialog() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.innerHTML = `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 600px; height: 800px; background: white; padding: 20px; border-radius: 5px; z-index: 2000; color: black; font-family: Arial, sans-serif;">
                    <h3 style="margin: 0 0 10px;">Enter Participant Initials</h3>
                    <input type="text" id="initials-input" maxlength="6"
                        style="margin: 10px 0; width: 100%; padding: 5px; color: black; border: 1px solid #ccc;">
                    
                    <h3 style="margin: 10px 0;">Select Test Type</h3>
                    <select id="test-type"
                        style="margin: 10px 0; width: 100%; padding: 5px; color: black; border: 1px solid #ccc;">
                        <option value="Shapes">Shapes</option>
                        <option value="Colors">Colors</option>
                        <option value="Abstract">Abstract</option>     
                        <option value="Pictures">Pictures</option>     
                    </select>
    
                    <h3 style="margin: 10px 0;">Select Number of Trials</h3>
                    <select id="trial-count"
                        style="margin: 10px 0; width: 100%; padding: 5px; color: black; border: 1px solid #ccc;">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                        <option value="40">40</option>
                        <option value="50">50</option>
                    </select>

                    <button id="initials-submit"
                        style="margin-top: 10px; width: 100%; padding: 10px; background: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Start
                    </button>
                </div>
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 1999;"></div>
            `;

            document.body.appendChild(dialog);
            const input = dialog.querySelector('#initials-input');
            const trialSelect = dialog.querySelector('#trial-count');
            const testTypeSelect = dialog.querySelector('#test-type');
            const button = dialog.querySelector('#initials-submit');

            button.onclick = async () => {
                const initials = input.value.trim().toUpperCase();
                const trialCount = parseInt(trialSelect.value, 10);
                this.testType = testTypeSelect.value;

                if (!initials) {
                    alert('Please enter valid initials.');
                    return;
                }

                this.userInitials = initials || 'TEST';
                this.trialCount = trialCount;

                // Initialize exclusions after setting test type
                await this.initializeExclusions();
                // Then setup images
                await this.setupImages();

                dialog.remove();
                resolve();
            };
        });
    }

    getRandomObjectNumber(exclude) {
        const validObjects = Array.from({length: this.totalImages}, (_, i) => i + 1).filter(num => !exclude.includes(num));

        if (validObjects.length === 0) {
            console.error('No valid objects available');
            return Math.floor(Math.random() * this.totalImages) + 1;
        }

        const randomIndex = Math.floor(Math.random() * validObjects.length);
        return validObjects[randomIndex];
    }

    getExcludedObjects(objectNum) {
        const exclusionsKey = `objectExclusions_${this.testType}`;
        const exclusions = this[exclusionsKey];

        console.log('Getting exclusions for', objectNum, 'from', exclusionsKey);
        console.log('Exclusions object:', exclusions);

        if (!exclusions || !exclusions[objectNum]) {
            console.log('No exclusions found');
            return [];
        }

        const filteredExclusions = exclusions[objectNum].filter(num => num <= this.totalImages);
        console.log('Filtered exclusions:', filteredExclusions);
        return filteredExclusions;
    }

    async initializeExclusions() {
        try {
            const module = await import('./objectExclusions_legacy.js');

            switch (this.testType) {
                case 'Shapes':
                    this.objectExclusions_Shapes = module.objectExclusions_Shapes;
                    break;
                case 'Colors':
                    this.objectExclusions_Colors = module.objectExclusions_Colors;
                    break;
                case 'Abstract':
                    this.objectExclusions_Abstract = module.objectExclusions_Abstract;
                    break;
                default:
                    console.warn('Unknown test type:', this.testType);
            }
        }
        catch (error) {
            console.error('Error loading exclusions:', error);
            this[`objectExclusions_${this.testType}`] = {};
        }
    }

    processGazeData(gazePoint, trialStartTime) {
        const gazeData = {
            x: gazePoint.x,
            y: gazePoint.y,
            time: Date.now(), // Absolute timestamp
            relativeTime: Date.now() - trialStartTime, // Time since trial start
            phase: this.calibrationComplete ? 'experiment' : 'calibration'
        };
        this.currentGazeData.push(gazeData);
        this.allGazeData.push(gazeData);
        console.log('Gaze Data Collected:', gazeData);
    }

    async startCalibrationPhase() {
        if (this.calibrationInProgress || this.calibrationComplete) {
            console.log("Calibration already in progress or completed");
            return;
        }
        this.calibrationInProgress = true;

        try {
            const calibrationContainer = document.createElement("div");
            calibrationContainer.id = "calibration-container";
            Object.assign(calibrationContainer.style, {
                position: "fixed",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,1.0)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: "1000",
                color: "white",
                textAlign: "center",
            });

            calibrationContainer.innerHTML = `
                <h2>Remaining Calibration Points: <span id="calibration-points">${this.CALIBRATION_POINTS}</span></h2>
            `;
            document.body.appendChild(calibrationContainer);

            let remainingPoints = this.CALIBRATION_POINTS;

            // Predefined calibration points in (percentage-based positioning on screen)
            const predefinedPositions = [
                {x: 0.1, y: 0.1}, // Top-left
                {x: 0.5, y: 0.1}, // Top-center
                {x: 0.9, y: 0.1}, // Top-right
                {x: 0.9, y: 0.5}, // Middle-right
                {x: 0.5, y: 0.5}, // Middle-center
                {x: 0.1, y: 0.5}, // Middle-left
                {x: 0.1, y: 0.9}, // Bottom-left
                {x: 0.5, y: 0.9}, // Bottom-center
                {x: 0.9, y: 0.9}, // Bottom-right
            ];

            let currentPointIndex = 0;

            const createCalibrationPoint = () => {
                const existingPoint = calibrationContainer.querySelector('.calibration-point');
                if (existingPoint) existingPoint.remove();

                if (currentPointIndex >= predefinedPositions.length) {
                    calibrationContainer.remove();
                    this.calibrationComplete = true;
                    this.calibrationInProgress = false;
                    this.startExperiment();
                    return;
                }

                const point = document.createElement("div");
                point.className = 'calibration-point';
                Object.assign(point.style, {
                    position: "absolute",
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    backgroundColor: "yellow",
                    cursor: "pointer",
                    zIndex: "1001"
                });

                const {x, y} = predefinedPositions[currentPointIndex];
                const screenX = window.innerWidth * x * 0.8 + window.innerWidth * 0.1;
                const screenY = window.innerHeight * y * 0.8 + window.innerHeight * 0.1;
                point.style.left = `${screenX}px`;
                point.style.top = `${screenY}px`;

                const clickHandler = () => {
                    if (!this.calibrationInProgress) return;

                    webgazer.recordScreenPosition(screenX, screenY, 'click');
                    point.remove();
                    currentPointIndex++;
                    remainingPoints--;
                    document.getElementById("calibration-points").textContent = remainingPoints;
                    createCalibrationPoint();
                };

                point.addEventListener("click", clickHandler, {once: true});
                calibrationContainer.appendChild(point);
            };

            createCalibrationPoint();

        }
        catch (err) {
            console.error("Calibration error:", err);
            this.calibrationInProgress = false;
        }
    }

    hide(element) {
        if (element) {
            element.style.display = "none";
        }
    }

    showCentered(element) {
        const containerWidth = this.testContainer.offsetWidth;
        const containerHeight = this.testContainer.offsetHeight;

        Object.assign(element.style, {
            position: "absolute",
            left: `${(containerWidth - element.offsetWidth) / 2}px`,
            top: `${(containerHeight - element.offsetHeight) / 2}px`,
            display: "block",
        });

        this.testContainer.appendChild(element);
    }

    showBlackScreen(duration = 1000) {
        const blackScreen = document.createElement("div");

        Object.assign(blackScreen.style, {
            position: "absolute",
            width: "100%",
            height: "100%",
            backgroundColor: "black",
            top: "0",
            left: "0",
            zIndex: "1000",
        });

        this.testContainer.appendChild(blackScreen);

        setTimeout(() => {
            if (blackScreen.parentNode) {
                blackScreen.parentNode.removeChild(blackScreen);
            }
        }, duration);
    }

    generateFileName() {
        const timestamp = new Date().toISOString().replace(/[:\.]/g, "-");
        return `${this.userInitials}_${timestamp}_data.json`;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async setupImages() {
        console.log(`Setting up images for test type: ${this.testType}`);

        const loadingMsg = document.createElement('div');

        try {
            const imageCounts = {
                'Abstract': 403,
                'Shapes': 193,
                'Colors': 10,
                'Pictures': 10
            };

            this.totalImages = imageCounts[this.testType];
            if (!this.totalImages) {
                throw new Error(`Unknown test type: ${this.testType}`);
            }

            this.objectImages = {};
            const imagePromises = [];

            for (let i = 1; i <= this.totalImages; i++) {
                const img = new Image();
                const promise = new Promise((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error(`Failed to load image ${i}`));
                });

                img.src = `${this.testType}/object${i.toString().padStart(3, "0")}.png`;
                this.objectImages[i] = img;
                imagePromises.push(promise);
            }

            await Promise.all(imagePromises);
        }
        catch (error) {
            console.error('Error loading images:', error);
            throw error;
        }
        finally {
            loadingMsg.remove();
        }
    }

    createImage(objectNum) {
        const img = document.createElement("img");
        img.src = `${this.testType}/object${objectNum.toString().padStart(3, "0")}.png`;
        img.className = "object";
        return img;
    }

    async initWebGazer() {
        try {
            if (typeof webgazer === "undefined") {
                console.error("WebGazer is not loaded. Check script inclusion.");
                return;
            }

            console.log("Starting WebGazer initialization...");

            await webgazer.resume().catch(err => {
                console.warn("WebGazer resume warning:", err);
            });

            console.log("WebGazer explicitly resumed.");

            webgazer.showVideoPreview(true);
            webgazer.showFaceOverlay(false);
            webgazer.setGazeListener((data, elapsedTime) => {
                if (data && this.currentTrialData.startTime) {
                    this.processGazeData(data, this.currentTrialData.startTime);
                }
            });

            webgazer.setRegression("weightedRidge").setTracker("TFFacemesh").showPredictionPoints(false);

            await webgazer.begin().catch(err => {
                console.error("WebGazer begin error:", err);
            });

            console.log("WebGazer initialized successfully with face mesh.");
        }
        catch (err) {
            console.error("Comprehensive WebGazer initialization error:", err);

            if (this.instructionElement) {
                this.instructionElement.innerText = "Error initializing eye tracking. Please check console and ensure camera permissions.";
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("Browser does not support camera access");
                if (this.instructionElement) {
                    this.instructionElement.innerText += "\nYour browser does not support camera access.";
                }
            }
        }
    }

    getRandomObjectNumber(exclude) {
        console.log('Exclude list:', exclude);

        const maxAttempts = 100;
        let attempts = 0;
        let objectNum;

        do {
            objectNum = Math.floor(Math.random() * this.totalImages) + 1;
            attempts++;

            if (attempts > maxAttempts) {
                console.warn('Max attempts reached while finding random object');
                break;
            }

            console.log(`Attempt ${attempts}: trying object ${objectNum}`);
        } while (exclude.includes(objectNum));

        console.log('Selected object:', objectNum);
        return objectNum;
    }

    getExcludedObjects(objectNum) {
        const exclusionsKey = `objectExclusions_${this.testType}`;
        const exclusions = this[exclusionsKey];

        if (!exclusions || !exclusions[objectNum]) {
            return [];
        }

        return exclusions[objectNum].filter(num => num <= this.totalImages);
    }

    async runTrial(trialType) {
        try {
            this.currentGazeData = [];
            this.gazeData = [];
            const startTime = Date.now();

            const object1Num = Math.floor(Math.random() * this.totalImages) + 1;
            const exclusionList = this.getExcludedObjects(object1Num);
            const excludeList = [...exclusionList, object1Num];

            this.currentTrialData = {
                trialNumber: this.currentTrial + 1,
                type: trialType,
                startTime: startTime,
                object1: object1Num,
                testObjects: [],
                positions: [],
                gazeData: [],
            };

            const sampleObject = this.createImage(object1Num);
            this.showCentered(sampleObject);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            sampleObject.remove();

            await this.showBlackScreen(2000);

            let testObjects = [];
            if (trialType === 1) {
                const object2Num = this.getRandomObjectNumber(excludeList);
                testObjects = [
                    {num: object1Num, isTarget: true},
                    {num: object2Num, isTarget: false},
                    {num: object2Num, isTarget: false}
                ];
            }
            else {
                const object2Num = this.getRandomObjectNumber(excludeList);
                const newExcludeList = [...excludeList, object2Num];
                const object3Num = this.getRandomObjectNumber(newExcludeList);

                testObjects = [
                    {num: object1Num, isTarget: true},
                    {num: object2Num, isTarget: false},
                    {num: object3Num, isTarget: false}
                ];
            }

            this.shuffleArray(testObjects);

            this.currentTrialData.testObjects = testObjects.map(obj => obj.num);
            this.currentTrialData.positions = testObjects.map((obj, index) => ({
                position: ['left', 'center', 'right'][index],
                objectNum: obj.num,
                isTarget: obj.isTarget,
            }));

            const imageElements = testObjects.map((obj) => this.createImage(obj.num));
            this.positionTestObjects(imageElements);

            await new Promise((resolve) => setTimeout(resolve, 10000));

            imageElements.forEach((img) => img.remove());
            this.currentTrialData.endTime = Date.now();
            this.currentTrialData.gazeData = this.currentGazeData;
            this.trialData.push(this.currentTrialData);

            this.currentTrial++;
        }
        catch (error) {
            console.error('Error in runTrial:', error);
            throw error;
        }
    }

    async runTrainingTrial(sampleObjectNum) {
        const sampleObject = this.createImage(sampleObjectNum);
        this.showCentered(sampleObject);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        sampleObject.remove();
    }

    positionTestObjects(objects) {
        const containerWidth = this.testContainer.offsetWidth;
        const containerHeight = this.testContainer.offsetHeight;
        const offset = containerWidth * 0.3; // 30% of container width
        const positions = ["left", "center", "right"];

        objects.forEach((obj, index) => {
            obj.style.position = "absolute";
            if (index === 0) {
                obj.style.left = `${containerWidth / 2 - 200}px`;
                obj.style.top = `${containerHeight / 2 - 200}px`;
            }
            else if (index === 1) {
                obj.style.left = `${containerWidth / 2 - 200 - offset}px`;
                obj.style.top = `${containerHeight / 2 - 200}px`;
            }
            else if (index === 2) {
                obj.style.left = `${containerWidth / 2 - 200 + offset}px`;
                obj.style.top = `${containerHeight / 2 - 200}px`;
            }
            else {
                obj.style.left = `${containerWidth / 2 - 200 + offset}px`;
                obj.style.top = `${containerHeight / 2 - 200}px`;
            }
            obj.style.display = "block";
            this.testContainer.appendChild(obj);
        });
    }

    showCentered(element) {
        element.style.position = "absolute";
        element.style.top = "50%";
        element.style.left = "50%";
        element.style.transform = "translate(-50%, -50%)";
        element.style.display = "block";
        this.testContainer.appendChild(element);
    }

    async showBlackScreen(duration) {
        document.body.style.backgroundColor = "black";
        await new Promise((resolve) =>
            setTimeout(resolve, duration),
        );
        document.body.style.backgroundColor = "black";
    }

    hide(element) {
        element.style.display = "none";
    }

    async startExperiment() {
        if (!this.calibrationComplete) {
            console.warn("Attempt to start experiment before calibration");
            return;
        }

        console.log("Starting experiment...");
        this.hide(this.instructionElement);

        for (let i = 0; i < this.trialCount; i++) {
            await this.runTrial(
                this.trialTypes[i % this.trialTypes.length]
            );
        }


        try {
            const experimentData = {
                trialData: this.trialData,
                gazeData: this.allGazeData,
                timestamp: Date.now(),
                totalTrials: this.trialCount
            };

            await localforage.setItem("experimentData", experimentData);
            console.log("Data saved to localforage successfully");

            const dataStr = "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(experimentData, null, 2));

            const downloadAnchorNode = document.createElement("a");
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", this.generateFileName());

            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            alert("Experiment completed! Data saved and downloaded to your ~/Documents folder.");
        }
        catch (err) {
            console.error("Error saving data:", err);
            alert("Error saving experiment data. Please check the console.");
        }
    }
}
