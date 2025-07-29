import {
    objectExclusions_Abstract,
    objectExclusions_Colors,
    objectExclusions_Pictures,
    objectExclusions_Shapes
} from './objectExclusions.js'; // objectExclusions_Pictures not available yet, still only has colors in the folder

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

    /**
     * Initializes the object exclusions based on the current test type.
     * Dynamically imports the relevant exclusions module and assigns it
     * to a property on the instance based on the test type. If the test
     * type is unknown or an error occurs during the import, initializes
     * exclusions as an empty object.
     *
     * @return {Promise<void>} A promise that resolves when the initialization
     * process for exclusions is complete.
     */
    async initializeExclusions() {
        try {
            // Import exclusions based on selected test type
            switch (this.testType.toLowerCase()) {
                case 'Shapes':
                    const {objectExclusions_Shapes} = await import('./objectExclusions.js');
                    this.objectExclusions_Shapes = objectExclusions_Shapes;
                    break;
                case 'Colors':
                    const {objectExclusions_Colors} = await import('./objectExclusions.js');
                    this.objectExclusions_Colors = objectExclusions_Colors;
                    break;
                case 'Abstract':
                    const {objectExclusions_Abstract} = await import('./objectExclusions.js');
                    this.objectExclusions_Abstract = objectExclusions_Abstract;
                    break;
                case 'Pictures':
                    const {objectExclusions_Pictures} = await import('./objectExclusions.js');
                    this.objectExclusions_Abstract = objectExclusions_Abstract;
                    break;
                default:
                    console.warn('Unknown test type:', this.testType);
            }
        }
        catch (error) {
            console.error('Error loading exclusions:', error);
            // Initialize with empty object if loading fails
            this[`objectExclusions_${this.testType}`] = {};
        }
    }


    /**
     * Displays a dialog for the user to input their initials, select a test type,
     * and specify the number of trials. Once all inputs are provided and validated,
     * initializes exclusions and setups images for the test session.
     *
     * @return {Promise<void>} A promise that resolves after the dialog is closed and inputs are processed.
     */
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


    /**
     * Generates a random object number from a range of numbers, excluding specified ones.
     *
     * @param {Array<number>} exclude - An array of numbers to be excluded from the random selection.
     * @return {number} A random object number that is not included in the excluded array. If no valid options remain, returns a random object number from the entire range.
     */
    getRandomObjectNumber(exclude) {
        const validObjects = Array.from({length: this.totalImages}, (_, i) => i + 1).filter(num => !exclude.includes(num));

        if (validObjects.length === 0) {
            console.error('No valid objects available');
            return Math.floor(Math.random() * this.totalImages) + 1;
        }

        const randomIndex = Math.floor(Math.random() * validObjects.length);
        return validObjects[randomIndex];
    }

    /**
     * Retrieves a list of excluded objects for the specified object number. Exclusions are filtered
     * to include only those within the total allowed range of images.
     *
     * @param {number} objectNum - The number of the object for which exclusions are being retrieved.
     * @return {number[]} A filtered array of excluded object numbers for the given objectNum.
     */
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


    /**
     * Initializes the exclusions for a specific testType by dynamically importing the
     * relevant module and assigning the appropriate exclusions object based on the testType property.
     * Handles errors by logging them and setting exclusions to an empty object if the dynamic import fails
     * or if the testType is unknown.
     *
     * @return {Promise<void>} A promise that resolves once the exclusions have been initialized.
     */
    async initializeExclusions() {
        try {
            const module = await import('./objectExclusions.js');

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

    /**
     * Processes gaze point data and stores it with a timestamp and trial phase.
     *
     * @param {Object} gazePoint - The gaze point containing x and y coordinates.
     * @param {number} gazePoint.x - The x-coordinate of the gaze point.
     * @param {number} gazePoint.y - The y-coordinate of the gaze point.
     * @param {number} trialStartTime - The timestamp indicating when the trial started.
     * @return {void} This method does not return a value.
     */
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


    /**
     * Initiates the calibration phase for the system. During this phase, the user is prompted to interact
     * with random points on the screen in order to gather calibration data.
     *
     * The method is asynchronous and creates visual indicators (calibration points) for the user to click on.
     * It manages the state of calibration and ensures correct data recording. Once all calibration points
     * are clicked, the process completes, and the system proceeds to the next phase.
     *
     * @return {Promise<void>} Resolves when the calibration phase completes, or stops immediately if calibration
     * is already in progress or has been completed.
     */
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

    /**
     * Hides the specified HTML element by setting its display style to "none".
     *
     * @param {HTMLElement} element - The HTML element to hide. If null or undefined, no action is taken.
     * @return {void} Does not return a value.
     */
    hide(element) {
        if (element) {
            element.style.display = "none";
        }
    }

    /**
     * Positions the given element at the center of the `testContainer` and makes it visible.
     *
     * @param {HTMLElement} element - The DOM element to be positioned and displayed in the center.
     * @return {void} This method does not return a value.
     */
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

    /**
     * Displays a black screen overlay for a specified duration.
     *
     * @param {number} [duration=1000] The time in milliseconds for which the black screen will be visible.
     * @return {void} Does not return a value.
     */
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


    /**
     * Generates a file name based on user initials, the current timestamp, and a fixed suffix.
     *
     * The file name is formatted as "userInitials_timestamp_data.json".
     * The timestamp is retrieved in ISO format and replaces colons and periods with hyphens for compatibility.
     *
     * @return {string} The generated file name.
     */
    generateFileName() {
        const timestamp = new Date().toISOString().replace(/[:\.]/g, "-");
        return `${this.userInitials}_${timestamp}_data.json`;
    }

    /**
     * Shuffles the elements of an array in random order.
     *
     * @param {Array} array - The array to be shuffled.
     * @return {Array} The shuffled array.
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Sets up images for the specified test type by loading them asynchronously.
     * It determines the number of images to load based on the test type and populates
     * the `objectImages` object with loaded image elements. If the test type is
     * invalid or there is an error during image loading, it throws an error.
     *
     * @return {Promise<void>} A promise that resolves once all images are successfully loaded,
     * or rejects if an error occurs during the loading process.
     */
    async setupImages() {
        console.log(`Setting up images for test type: ${this.testType}`);

        const loadingMsg = document.createElement('div');
        // ... (keep existing loading message setup)

        try {
            // Determine correct total images based on test type
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

            // Clear existing images
            this.objectImages = {};
            const imagePromises = [];

            // Only load up to totalImages
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


    /**
     * Creates an HTMLImageElement based on the provided object number.
     *
     * @param {number} objectNum - The number of the object to create an image for.
     * @return {HTMLImageElement} The created image element with the specified source and className.
     */
    createImage(objectNum) {
        const img = document.createElement("img");
        img.src = `${this.testType}/object${objectNum.toString().padStart(3, "0")}.png`;
        img.className = "object";
        return img;
    }

    /**
     * Initializes the WebGazer library for eye tracking functionality.
     * This method configures WebGazer with specific settings, resumes it if paused,
     * starts gaze tracking, and handles potential errors during initialization.
     * Displays camera preview and additional visualization options for debugging, if enabled.
     *
     * @return {Promise<void>} A promise that resolves when WebGazer is successfully initialized,
     * or logs an error if initialization fails. Returns nothing explicitly.
     */
    async initWebGazer() {
        try {
            // Check if WebGazer is loaded
            if (typeof webgazer === "undefined") {
                console.error("WebGazer is not loaded. Check script inclusion.");
                return;
            }

            console.log("Starting WebGazer initialization...");

            // Modify resume to handle potential null references
            await webgazer.resume().catch(err => {
                console.warn("WebGazer resume warning:", err);
            });

            console.log("WebGazer explicitly resumed.");

            // Enable video preview and face overlay visualization
            webgazer.showVideoPreview(true); // only activate to debug
            webgazer.showFaceOverlay(false); // only activate to debug
            // Set gaze listener to collect gaze data
            webgazer.setGazeListener((data, elapsedTime) => {
                if (data && this.currentTrialData.startTime) {
                    this.processGazeData(data, this.currentTrialData.startTime);
                }
            });

            // Configure WebGazer with comprehensive settings
            webgazer.setRegression("weightedRidge").setTracker("TFFacemesh").showPredictionPoints(false);

            // Start WebGazer with error handling
            await webgazer.begin().catch(err => {
                console.error("WebGazer begin error:", err);
            });

            console.log("WebGazer initialized successfully with face mesh.");
        }
        catch (err) {
            console.error("Comprehensive WebGazer initialization error:", err);

            // Display user-friendly error
            if (this.instructionElement) {
                this.instructionElement.innerText = "Error initializing eye tracking. Please check console and ensure camera permissions.";
            }

            // Additional browser compatibility check
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("Browser does not support camera access");
                if (this.instructionElement) {
                    this.instructionElement.innerText += "\nYour browser does not support camera access.";
                }
            }
        }
    }

    /**
     * Generates a random object number, ensuring that the generated number is not
     * included in the given exclusion list. The method retries up to a defined
     * number of attempts to find a valid number.
     *
     * @param {number[]} exclude - An array of object numbers to exclude from selection.
     * @return {number} A randomly-selected object number not present in the exclusion list.
     */
    getRandomObjectNumber(exclude) {
        // Log the exclusion list for debugging
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

            // Log each attempt
            console.log(`Attempt ${attempts}: trying object ${objectNum}`);
        } while (exclude.includes(objectNum));

        console.log('Selected object:', objectNum);
        return objectNum;
    }

    /**
     * Retrieves the list of excluded objects for the specified object number.
     * Ensures that the returned exclusions are within a valid range.
     *
     * @param {number} objectNum The number of the object for which exclusions are to be retrieved.
     * @return {number[]} An array of excluded object numbers, filtered to be within the valid range.
     */
    getExcludedObjects(objectNum) {
        const exclusionsKey = `objectExclusions_${this.testType}`;
        const exclusions = this[exclusionsKey];

        if (!exclusions || !exclusions[objectNum]) {
            return [];
        }

        // Ensure returned exclusions are within valid range
        return exclusions[objectNum].filter(num => num <= this.totalImages);
    }

    /**
     * Executes a trial based on the given type. The method handles the selection,
     * display, and arrangement of images, while also recording gaze data and
     * trial-specific metadata.
     *
     * @param {number} trialType - The type of trial to execute. The value determines
     *                             the specific logic used for selecting and arranging objects.
     *                             Example values: 1 for single-repeat trials, 2 for varied trials.
     * @return {Promise<void>} Resolves when the trial is completed, including
     *                         displaying all necessary objects and recording gaze data.
     * @throws {Error} Throws an error if the trial execution encounters an issue.
     */
    async runTrial(trialType) {
        try {
            this.currentGazeData = [];
            this.gazeData = [];
            const startTime = Date.now();

            // Choose first object
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

            // Show first object
            const sampleObject = this.createImage(object1Num);
            this.showCentered(sampleObject);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            sampleObject.remove();

            await this.showBlackScreen(2000);

            // Create test phase objects
            let testObjects = [];
            if (trialType === 1) {
                // Get a non-excluded object
                const object2Num = this.getRandomObjectNumber(excludeList);
                testObjects = [
                    {num: object1Num, isTarget: true},
                    {num: object2Num, isTarget: false},
                    {num: object2Num, isTarget: false}
                ];
            }
            else {
                // Get two different non-excluded objects
                const object2Num = this.getRandomObjectNumber(excludeList);
                const newExcludeList = [...excludeList, object2Num];
                const object3Num = this.getRandomObjectNumber(newExcludeList);

                testObjects = [
                    {num: object1Num, isTarget: true},
                    {num: object2Num, isTarget: false},
                    {num: object3Num, isTarget: false}
                ];
            }

            // Randomize positions and continue with trial
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

    /**
     * Runs a single training trial by creating, displaying, and removing an image after a delay.
     *
     * @param {number} sampleObjectNum - The identifier used to create the sample image object.
     * @return {Promise<void>} A promise that resolves after the sample image is removed.
     */
    async runTrainingTrial(sampleObjectNum) {
        const sampleObject = this.createImage(sampleObjectNum);
        this.showCentered(sampleObject);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        sampleObject.remove();
    }

    /**
     * Positions an array of test objects within a container, aligning them horizontally
     * as "left", "center", and "right", with optional vertical centering.
     *
     * @param {Array} objects - An array of HTML elements to be positioned inside the container.
     * @return {void} This method does not return any value.
     */
    positionTestObjects(objects) {
        const containerWidth = this.testContainer.offsetWidth;
        const containerHeight = this.testContainer.offsetHeight;
        const offset = containerWidth * 0.3; // 30% of container width
        const positions = ["left", "center", "right"];

        objects.forEach((obj, index) => {
            obj.style.position = "absolute"; // Ensure object is absolutely positioned
            let xPos = 0; // Default x position

            // Explicitly handle positions based on the index
            if (index === 0) {
                xPos = -offset; // "left" position
            }
            else if (index === 1) {
                xPos = 0; // "center" position
            }
            else if (index === 2) {
                xPos = offset; // "right" position
            }

            // Apply calculated x position to each object
            obj.style.left = `${xPos}px`;

            // Optional: Set y position based on your layout or container height
            // You can add further logic here if needed to adjust vertical positions.
            // For example, we could center objects vertically in the container:
            const yPos = (containerHeight - obj.offsetHeight) / 2;
            obj.style.top = `${yPos}px`;
        });
    }

    /**
     * Executes a single test trial which includes displaying a sample object, pausing, and showing test objects.
     *
     * @param {number} sampleObjectNum - The unique identifier for the sample object to be displayed during the trial.
     * @return {Promise<void>} A promise that resolves once the trial, including all pauses and visual displays, is complete.
     */
    async runTestTrial(sampleObjectNum) {
        // Show sample object first
        const sampleObject = this.createImage(sampleObjectNum);
        this.showCentered(sampleObject);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        sampleObject.remove();

        // Black screen pause
        await this.showBlackScreen(2000);

        // Create test objects
        let testObjects = [];
        if (Math.random() < 0.5) {
            // Type 1 trial
            let otherObjectNum;
            do {
                otherObjectNum =
                    Math.floor(Math.random() * 403) + 1;
            } while (otherObjectNum === sampleObjectNum);

            testObjects = [
                this.createImage(sampleObjectNum),
                this.createImage(otherObjectNum),
                this.createImage(otherObjectNum),
            ];
        }
        else {
            // Type 2 trial
            const usedObjects = new Set([sampleObjectNum]);
            while (usedObjects.size < 3) {
                const newObjectNum =
                    Math.floor(Math.random() * 403) + 1;
                if (!usedObjects.has(newObjectNum)) {
                    usedObjects.add(newObjectNum);
                    testObjects.push(
                        this.createImage(newObjectNum),
                    );
                }
            }
        }

        this.positionTestObjects(testObjects);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        testObjects.forEach((obj) => obj.remove());
        await this.showBlackScreen(2000);
    }

    /**
     * Positions test objects within a container based on predefined rules.
     *
     * @param {Array} objects - An array of DOM elements to be positioned inside the container.
     * @return {void} This method does not return a value.
     */
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

    /**
     * Centers the specified element both vertically and horizontally within the container
     * and makes it visible by appending it to the test container.
     *
     * @param {HTMLElement} element - The HTML element to be centered and displayed.
     * @return {void} This method does not return a value.
     */
    showCentered(element) {
        element.style.position = "absolute";
        element.style.top = "50%";
        element.style.left = "50%";
        element.style.transform = "translate(-50%, -50%)";
        element.style.display = "block";
        this.testContainer.appendChild(element);
    }

    /**
     * Displays a black screen by changing the background color of the document body to black
     * for a specified duration.
     *
     * @param {number} duration - The duration in milliseconds for which the black screen is displayed.
     * @return {Promise<void>} A promise that resolves after the specified duration.
     */
    async showBlackScreen(duration) {
        document.body.style.backgroundColor = "black";
        await new Promise((resolve) =>
            setTimeout(resolve, duration),
        );
        document.body.style.backgroundColor = "black";
    }

    /**
     * Hides the specified DOM element by setting its display style to "none".
     *
     * @param {HTMLElement} element - The DOM element to hide.
     * @return {void} This method does not return anything.
     */
    hide(element) {
        element.style.display = "none";
    }


    /**
     * Initiates and manages the execution of an experiment if the calibration process has been completed.
     * The method handles multiple trials, saves experimental data locally using localforage, and triggers
     * the download of a JSON file containing the results.
     *
     * @return {Promise<void>} A promise that resolves when the experiment completes successfully,
     * including saving and downloading the experimental data. If calibration is incomplete,
     * the process terminates with a warning, and the promise does not proceed further.
     */
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

            // Save using localforage
            await localforage.setItem("experimentData", experimentData);
            console.log("Data saved to localforage successfully");

            // Create and trigger download of JSON file
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


