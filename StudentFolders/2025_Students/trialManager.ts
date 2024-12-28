// Export the TrialManager class
import {
    objectExclusions_Abstract,
    objectExclusions_Colors,
    objectExclusions_Pictures,
    objectExclusions_Shapes
} from './objectExclusions.js'; // not available yet, still only has colors in the folder

// Export the initialization code as a function
export function initializeExperiment(): void {
    const trialManager = new TrialManager();
    let experimentInitiated = false;

    document.addEventListener("keydown", async (e) => {
        if (experimentInitiated) return;

        experimentInitiated = true;
        try {
            // 1. First show the dialog and get user input
            await trialManager.showInitialsDialog();

            // 2. Then setup images and initialize WebGazer
            await Promise.all([
                trialManager.setupImages(),
                trialManager.initWebGazer()
            ]);

            // 3. Start calibration phase without showing dialog again
            await trialManager.startCalibrationPhase();
        } catch (err) {
            console.error(`Initialization error:`, err);
            experimentInitiated = false;
        }
    });
}

export class TrialManager {
    testContainer: HTMLElement | null;
    instructionElement: HTMLElement | null;
    trialTypes: string[];
    trialCount: number | null;
    currentTrial: number;
    currentTrialData: Record<string, any>;
    trialData: any[];
    gazeData: any[];
    isExperimentStarted: boolean;
    calibrationComplete: boolean;
    calibrationInProgress: boolean;
    CALIBRATION_POINTS: number;
    currentGazeData: any[];
    allGazeData: any[];
    userInitials: string;
    testType?: string;
    totalImages?: number;
    objectImages?: Record<string, HTMLImageElement>;
    objectExclusions_Shapes: Record<string, any>;
    objectExclusions_Colors: Record<string, any>;
    objectExclusions_Abstract: Record<string, any>;
    objectExclusions_Pictures?: Record<string, any>;

    constructor() {
        this.testContainer = document.getElementById("test-container");
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

    async initializeExclusions(): Promise<void> {
        try {
            // Import exclusions based on selected test type
            switch (this.testType?.toLowerCase()) {
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
                    this.objectExclusions_Pictures = objectExclusions_Pictures;
                    break;
                default:
                    console.warn('Unknown test type:', this.testType);
            }
        } catch (error) {
            console.error('Error loading exclusions:', error);
            // Initialize with empty object if loading fails
            this[`objectExclusions_${this.testType as string}`] = {};
        }
    }

    showInitialsDialog(): Promise<void> {
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
            const input = dialog.querySelector<HTMLInputElement>('#initials-input');
            const trialSelect = dialog.querySelector<HTMLSelectElement>('#trial-count');
            const testTypeSelect = dialog.querySelector<HTMLSelectElement>('#test-type');
            const button = dialog.querySelector<HTMLButtonElement>('#initials-submit');

            button!.onclick = async () => {
                const initials = input!.value.trim().toUpperCase();
                const trialCount = parseInt(trialSelect!.value, 10);
                this.testType = testTypeSelect!.value;

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

    // Additional methods removed for brevity; these will include type annotations for parameters and return types.
}