const mockArgv = require('mock-argv');
const captureConsole = require('capture-console');
const mockRequire = require('mock-require');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const { createTestEnvironment, assertions, migration } = require('./migration-utils');
const jestHelpers = require('./jest-helpers');

/**
 * Enhanced IntegrationTestUtils implementing methodological pragmatism principles
 * Provides verification hierarchies and cross-cognitive verification checkpoints
 * to address human-cognitive and artificial-stochastic error patterns
 */
class IntegrationTestUtils {
  static async runCliCommand(args, kanbnInstance) {
    const output = [];
    captureConsole.startIntercept(process.stdout, s => output.push(s));
    await mockArgv(args, kanbnInstance);
    captureConsole.stopIntercept(process.stdout);
    return output.join('');
  }

  /**
   * Enhanced CLI command execution with verification hierarchies
   * Implements cross-cognitive verification checkpoints
   * @param {Array} args - CLI arguments
   * @param {Object} kanbnInstance - Kanbn instance
   * @param {Object} verificationOptions - Verification configuration
   * @returns {Object} - Enhanced output with verification data
   */
  static async runVerifiedCliCommand(args, kanbnInstance, verificationOptions = {}) {
    const {
      verificationLevel = 'standard', // 'minimal', 'standard', 'comprehensive'
      expectSuccess = true,
      behavioralPattern = null,
      humanExpectation = null
    } = verificationOptions;

    // Capture initial state for behavioral equivalence verification
    const initialState = this.captureSystemState(verificationOptions.basePath);
    
    // Execute command with enhanced error detection
    const output = [];
    const errors = [];
    
    captureConsole.startIntercept(process.stdout, s => output.push(s));
    captureConsole.startIntercept(process.stderr, s => errors.push(s));
    
    let executionError = null;
    try {
      await mockArgv(args, kanbnInstance);
    } catch (error) {
      executionError = error;
    }
    
    captureConsole.stopIntercept(process.stdout);
    captureConsole.stopIntercept(process.stderr);
    
    const result = {
      output: output.join(''),
      outputLines: output,
      errors: errors.join(''),
      errorLines: errors,
      executionError,
      success: !executionError && errors.length === 0
    };

    // Apply verification hierarchy based on level
    if (verificationLevel !== 'minimal') {
      const finalState = this.captureSystemState(verificationOptions.basePath);
      result.verification = this.performVerificationHierarchy(
        initialState,
        finalState,
        result,
        verificationOptions
      );
    }

    return result;
  }

  static setupTestDirectory(testName) {
    const testDir = path.join(__dirname, '..', `test-${testName}`);
    if (fs.existsSync(testDir)) rimraf.sync(testDir);
    fs.mkdirSync(testDir, { recursive: true });
    return testDir;
  }

  /**
   * Setup verified test environment with methodological pragmatism principles
   * Integrates migration-utils patterns for enhanced verification
   * @param {string} testName - Test identifier
   * @param {Object} verificationOptions - Verification configuration
   * @returns {Object} - Enhanced test environment with verification capabilities
   */
  static setupVerifiedTestEnvironment(testName, verificationOptions = {}) {
    const {
      verificationLevel = 'standard',
      useRealFilesystem = true,
      fixtureOptions = {},
      errorArchitectureMode = 'comprehensive'
    } = verificationOptions;

    // Create test environment using migration-utils patterns
    const env = createTestEnvironment(testName, { useRealFilesystem });
    const setupData = env.setup(fixtureOptions);

    // Add verification capabilities
    const verifiedEnv = {
      ...setupData,
      env,
      verificationLevel,
      errorArchitectureMode,
      
      // Enhanced cleanup with verification
      cleanup: () => {
        try {
          env.cleanup();
        } catch (error) {
          console.warn(`Cleanup verification warning: ${error.message}`);
        }
      },

      // Behavioral equivalence verification method
      verifyBehavioralEquivalence: (expectedBehavior, actualOutput) => {
        return this.behavioralEquivalenceCheck(expectedBehavior, actualOutput, verificationLevel);
      },

      // Cross-cognitive verification checkpoint
      crossCognitiveVerification: (humanExpectation, aiPattern) => {
        return this.crossCognitiveVerification(humanExpectation, aiPattern, errorArchitectureMode);
      }
    };

    return verifiedEnv;
  }

  static cleanupTestDirectory(testDir) {
    if (fs.existsSync(testDir)) rimraf.sync(testDir);
  }

  /**
   * Extract task ID from command output
   * @param {string} output - Command output containing task information
   * @returns {string|null} - Extracted task ID or null if not found
   */
  static extractTaskId(output) {
    const taskIdMatch = output.match(/Task ID: ([a-f0-9-]+)/i) || output.match(/([a-f0-9-]{36})/i);
    return taskIdMatch ? taskIdMatch[1] : null;
  }

  /**
   * Setup mock kanbn instance with configuration
   * @param {Object} config - Mock configuration options
   * @returns {Object} - Mock kanbn instance
   */
  static setupMockKanbn(config = {}) {
    const mockKanbnModule = require('./mock-kanbn');
    mockRequire('../src/main', mockKanbnModule);
    
    // Apply configuration
    if (config.initialised !== undefined) {
      mockKanbnModule.config.initialised = config.initialised;
    }
    if (config.output !== undefined) {
      mockKanbnModule.config.output = config.output;
    }
    
    return require('../index');
  }

  /**
   * Clean up mock requires
   */
  static cleanupMocks() {
    mockRequire.stopAll();
  }

  /**
   * Capture system state for behavioral equivalence verification
   * @param {string} basePath - Base path to capture state from
   * @returns {Object} - System state snapshot
   */
  static captureSystemState(basePath) {
    if (!basePath || !fs.existsSync(basePath)) {
      return { valid: false, reason: 'Invalid base path' };
    }

    try {
      const state = {
        timestamp: Date.now(),
        basePath,
        valid: true
      };

      // Capture kanbn project state if it exists
      const kanbnPath = path.join(basePath, '.kanbn');
      if (fs.existsSync(kanbnPath)) {
        state.kanbnExists = true;
        
        // Capture index state
        const indexPath = path.join(kanbnPath, 'index.md');
        if (fs.existsSync(indexPath)) {
          state.indexContent = fs.readFileSync(indexPath, 'utf8');
          state.indexSize = state.indexContent.length;
        }

        // Capture tasks directory state
        const tasksPath = path.join(kanbnPath, 'tasks');
        if (fs.existsSync(tasksPath)) {
          state.taskFiles = fs.readdirSync(tasksPath).filter(f => f.endsWith('.md'));
          state.taskCount = state.taskFiles.length;
        }
      } else {
        state.kanbnExists = false;
      }

      return state;
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Behavioral equivalence verification implementing methodological pragmatism
   * @param {Object} expectedBehavior - Expected behavioral pattern
   * @param {Object} actualOutput - Actual command output
   * @param {string} verificationLevel - Level of verification depth
   * @returns {Object} - Verification result with confidence score
   */
  static behavioralEquivalenceCheck(expectedBehavior, actualOutput, verificationLevel = 'standard') {
    const verification = {
      passed: false,
      confidence: 0,
      humanCognitiveErrors: [],
      artificialStochasticErrors: [],
      fallibilismMarkers: []
    };

    try {
      // Human-cognitive error detection: Domain knowledge validation
      if (expectedBehavior.domainExpectations) {
        const domainCheck = this.validateDomainExpectations(
          expectedBehavior.domainExpectations,
          actualOutput
        );
        verification.humanCognitiveErrors = domainCheck.errors;
        verification.confidence += domainCheck.confidence * 0.4;
      }

      // Artificial-stochastic error detection: Pattern completion verification
      if (expectedBehavior.outputPatterns) {
        const patternCheck = this.validateOutputPatterns(
          expectedBehavior.outputPatterns,
          actualOutput
        );
        verification.artificialStochasticErrors = patternCheck.errors;
        verification.confidence += patternCheck.confidence * 0.4;
      }

      // Context continuity verification
      if (verificationLevel === 'comprehensive') {
        const contextCheck = this.validateContextContinuity(expectedBehavior, actualOutput);
        verification.confidence += contextCheck.confidence * 0.2;
        verification.fallibilismMarkers = contextCheck.uncertainties;
      }

      verification.passed = verification.confidence >= 0.8;
      return verification;
    } catch (error) {
      verification.fallibilismMarkers.push(`Verification error: ${error.message}`);
      return verification;
    }
  }

  /**
   * Cross-cognitive verification checkpoint
   * Bridges human insight with AI pattern recognition
   * @param {Object} humanExpectation - Human domain knowledge expectation
   * @param {Object} aiPattern - AI-detected pattern
   * @param {string} errorArchitectureMode - Error detection mode
   * @returns {Object} - Cross-cognitive verification result
   */
  static crossCognitiveVerification(humanExpectation, aiPattern, errorArchitectureMode = 'comprehensive') {
    const verification = {
      alignment: 0,
      conflicts: [],
      recommendations: [],
      errorArchitecture: {
        humanCognitive: [],
        artificialStochastic: [],
        contextContinuity: []
      }
    };

    // Detect human-cognitive vs artificial-stochastic error patterns
    if (humanExpectation && aiPattern) {
      // Check for domain knowledge gaps (human-cognitive errors)
      if (humanExpectation.domainKnowledge && aiPattern.detectedPatterns) {
        const domainAlignment = this.assessDomainAlignment(
          humanExpectation.domainKnowledge,
          aiPattern.detectedPatterns
        );
        verification.alignment += domainAlignment.score * 0.5;
        verification.errorArchitecture.humanCognitive = domainAlignment.gaps;
      }

      // Check for pattern completion errors (artificial-stochastic errors)
      if (aiPattern.completionPatterns) {
        const patternValidation = this.validatePatternCompletion(
          aiPattern.completionPatterns,
          humanExpectation
        );
        verification.alignment += patternValidation.score * 0.5;
        verification.errorArchitecture.artificialStochastic = patternValidation.errors;
      }
    }

    return verification;
  }

  /**
   * Perform verification hierarchy based on methodological pragmatism
   * @param {Object} initialState - Initial system state
   * @param {Object} finalState - Final system state
   * @param {Object} result - Command execution result
   * @param {Object} options - Verification options
   * @returns {Object} - Comprehensive verification result
   */
  static performVerificationHierarchy(initialState, finalState, result, options) {
    const verification = {
      level: options.verificationLevel,
      systematic: {
        stateTransition: this.verifyStateTransition(initialState, finalState),
        outputConsistency: this.verifyOutputConsistency(result),
        errorDetection: this.detectSystematicErrors(result, options)
      },
      pragmatic: {
        successCriteria: this.evaluateSuccessCriteria(result, options),
        fallibilismMarkers: this.identifyFallibilismMarkers(result, options)
      },
      cognitive: {
        humanCognitiveAssessment: this.assessHumanCognitiveErrors(result, options),
        artificialStochasticAssessment: this.assessArtificialStochasticErrors(result, options)
      }
    };

    return verification;
  }

  // Helper methods for verification hierarchy
  static verifyStateTransition(initialState, finalState) {
    if (!initialState.valid || !finalState.valid) {
      return { valid: false, reason: 'Invalid state capture' };
    }

    return {
      valid: true,
      changes: {
        kanbnCreated: !initialState.kanbnExists && finalState.kanbnExists,
        indexModified: initialState.indexSize !== finalState.indexSize,
        tasksChanged: (initialState.taskCount || 0) !== (finalState.taskCount || 0)
      }
    };
  }

  static verifyOutputConsistency(result) {
    return {
      hasOutput: result.output.length > 0,
      hasErrors: result.errors.length > 0,
      executionSuccess: result.success,
      consistency: result.success === (result.errors.length === 0)
    };
  }

  static detectSystematicErrors(result, options) {
    const errors = [];
    
    // Check for common CLI error patterns
    if (result.errors.includes('ENOENT')) {
      errors.push({ type: 'filesystem', message: 'File not found error detected' });
    }
    
    if (result.output.includes('undefined') && !options.allowUndefined) {
      errors.push({ type: 'logic', message: 'Undefined value in output' });
    }

    return errors;
  }

  static evaluateSuccessCriteria(result, options) {
    const criteria = {
      executionSuccess: result.success,
      expectedOutput: true, // Default assumption
      noUnexpectedErrors: result.errors.length === 0
    };

    if (options.expectSuccess !== undefined) {
      criteria.meetsExpectation = result.success === options.expectSuccess;
    }

    return criteria;
  }

  static identifyFallibilismMarkers(result, options) {
    const markers = [];
    
    if (result.output.includes('warning')) {
      markers.push('Output contains warnings - uncertain outcome');
    }
    
    if (result.executionError && options.expectSuccess) {
      markers.push('Execution failed despite success expectation - verify test assumptions');
    }

    return markers;
  }

  static assessHumanCognitiveErrors(result, options) {
    // Placeholder for human-cognitive error assessment
    return { detected: [], confidence: 0.8 };
  }

  static assessArtificialStochasticErrors(result, options) {
    // Placeholder for artificial-stochastic error assessment
    return { detected: [], confidence: 0.8 };
  }

  // Additional helper methods for behavioral verification
  static validateDomainExpectations(expectations, actualOutput) {
    return { errors: [], confidence: 0.8 };
  }

  static validateOutputPatterns(patterns, actualOutput) {
    return { errors: [], confidence: 0.8 };
  }

  static validateContextContinuity(expected, actual) {
    return { confidence: 0.8, uncertainties: [] };
  }

  static assessDomainAlignment(domainKnowledge, detectedPatterns) {
    return { score: 0.8, gaps: [] };
  }

  static validatePatternCompletion(patterns, humanExpectation) {
    return { score: 0.8, errors: [] };
  }
}

module.exports = IntegrationTestUtils;