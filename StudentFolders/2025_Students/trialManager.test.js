// trialManager.test.js
import {TrialManager} from './trialManager';

describe('getRandomObjectNumber', () => {
    let trialManager;

    beforeEach(() => {
        trialManager = new TrialManager();
        trialManager.totalImages = 5; // Mock the total number of images
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a random number not in the exclusion list', () => {
        const exclude = [1, 2, 3];
        const result = trialManager.getRandomObjectNumber(exclude);

        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(5);
        expect(exclude).not.toContain(result);
    });

    it('should return a random number when the exclusion list is empty', () => {
        const exclude = [];
        const result = trialManager.getRandomObjectNumber(exclude);

        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(5);
    });

    it('should return any number when all valid numbers are excluded', () => {
        const exclude = [1, 2, 3, 4, 5];
        const result = trialManager.getRandomObjectNumber(exclude);

        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(5);
    });

    it('should retry a valid number no more than 100 attempts', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const exclude = [1, 2, 3, 4, 5];

        trialManager.totalImages = 3; // Lower total numbers for testing retries
        const result = trialManager.getRandomObjectNumber(exclude);

        expect(consoleWarnSpy).toHaveBeenCalledWith('Max attempts reached while finding random object');
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(3);
    });
});
jest.mock('./trialManager', () => ({
    TrialManager: jest.fn().mockImplementation(() => ({
        showInitialsDialog: jest.fn(),
        setupImages: jest.fn(),
        initWebGazer: jest.fn(),
        startCalibrationPhase: jest.fn(),
    })),
}));

describe('initializeExperiment', () => {
    let TrialManagerMock;
    let addEventListenerSpy;

    beforeEach(() => {
        // Mock the TrialManager class
        TrialManagerMock = require('./trialManager').TrialManager;

        // Spy on addEventListener
        addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should add a "keydown" event listener to the document', () => {
        initializeExperiment();
        expect(addEventListenerSpy).toHaveBeenCalledWith(
            'keydown',
            expect.any(Function)
        );
    });

    it('should initialize the experiment when "keydown" is triggered', async () => {
        const trialManagerInstance = new TrialManagerMock();
        const keyDownHandler = jest.fn();

        initializeExperiment();
        expect(addEventListenerSpy).toHaveBeenCalledWith(
            'keydown',
            expect.any(Function)
        );
        keyDownHandler.mockImplementation(
            addEventListenerSpy.mock.calls[0][1]
        );

        // Simulate keydown and resolve async methods
        await trialManagerInstance.showInitialsDialog.mockResolvedValueOnce();
        await trialManagerInstance.setupImages.mockResolvedValueOnce();
    });
});

describe('initializeExclusions', () => {
    let trialManager;

    beforeEach(() => {
        // Create a new TrialManager instance for each test
        trialManager = new TrialManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize objectExclusions_Shapes when testType is "Shapes"', async () => {
        jest.mock('./objectExclusions.js', () => ({
            objectExclusions_Shapes: {1: [2], 2: [3]},
        }));

        trialManager.testType = 'Shapes';
        await trialManager.initializeExclusions();
        expect(trialManager.objectExclusions_Shapes).toEqual({1: [2], 2: [3]});
    });

    it('should initialize objectExclusions_Colors when testType is "Colors"', async () => {
        jest.mock('./objectExclusions.js', () => ({
            objectExclusions_Colors: {1: [4], 2: [5]},
        }));

        trialManager.testType = 'Colors';
        await trialManager.initializeExclusions();
        expect(trialManager.objectExclusions_Colors).toEqual({1: [4], 2: [5]});
    });

    it('should initialize objectExclusions_Abstract when testType is "Abstract"', async () => {
        jest.mock('./objectExclusions.js', () => ({
            objectExclusions_Abstract: {3: [6], 4: [7]},
        }));

        trialManager.testType = 'Abstract';
        await trialManager.initializeExclusions();
        expect(trialManager.objectExclusions_Abstract).toEqual({3: [6], 4: [7]});
    });

    it('should initialize objectExclusions_Pictures when testType is "Pictures"', async () => {
        jest.mock('./objectExclusions.js', () => ({
            objectExclusions_Pictures: {5: [8], 6: [9]},
        }));

        trialManager.testType = 'Pictures';
        await trialManager.initializeExclusions();
        expect(trialManager.objectExclusions_Abstract).toEqual({5: [8], 6: [9]}); // Assigned to Abstract for Pictures
    });

    it('should log a warning for unknown testType and not assign exclusions', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        trialManager.testType = 'InvalidType';
        await trialManager.initializeExclusions();
        expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown test type:', 'InvalidType');
        expect(trialManager.objectExclusions_Shapes).toEqual({});
        consoleWarnSpy.mockRestore();
    });

    it('should handle errors during exclusions import and assign empty exclusions', async () => {
        jest.mock('./objectExclusions.js', () => {
            throw new Error('Import error');
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        trialManager.testType = 'Shapes';
        await trialManager.initializeExclusions();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading exclusions:', expect.any(Error));
        expect(trialManager.objectExclusions_Shapes).toEqual({});
        consoleErrorSpy.mockRestore();
    });

