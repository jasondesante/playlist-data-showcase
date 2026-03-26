/**
 * DataContractValidator Component
 *
 * Validates the rhythm generation output data contract before level generation.
 * Ensures all required fields exist and have valid data.
 *
 * Task 0.6: Create Data Contract Validation UI
 *
 * Validates:
 * - bandStreams (low/mid/high with beats[])
 * - composite.stream[]
 * - difficultyVariants (easy/medium/hard/natural with stream[])
 * - phrases[]
 * - metadata.transientsDetected
 * - Each beat has required fields (timestamp, beatIndex, intensity, band, quantizationError)
 *
 * Color coding: Green checkmark for pass, Red X for fail with explanation.
 */

import { useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import './DataContractValidator.css';
import type { GeneratedRhythm, GeneratedBeat } from '../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

/**
 * Result of validating a single field.
 */
interface FieldValidation {
    /** Field path/name */
    field: string;
    /** Whether the field is valid */
    valid: boolean;
    /** Human-readable message */
    message: string;
    /** Optional count or value */
    value?: string | number;
}

/**
 * Result of validating the entire GeneratedRhythm.
 */
export interface GeneratedRhythmValidation {
    /** Overall validation result */
    isValid: boolean;
    /** Field-level validation results */
    fields: FieldValidation[];
    /** Any errors encountered */
    errors: string[];
    /** Summary message */
    summary: string;
}

export interface DataContractValidatorProps {
    /** The generated rhythm to validate */
    rhythm: GeneratedRhythm | null;
    /** Whether validation is currently running */
    isValidating?: boolean;
    /** Callback to retry validation */
    onRetry?: () => void;
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Validation Functions
// ============================================================

/**
 * Validates a single GeneratedBeat has all required fields.
 * Returns an array of field validation results.
 */
function validateBeat(beat: unknown, index: number): FieldValidation[] {
    const results: FieldValidation[] = [];
    const b = beat as Record<string, unknown>;

    // Timestamp is required
    if (typeof b.timestamp !== 'number') {
        results.push({
            field: `beats[${index}].timestamp`,
            valid: false,
            message: `Missing or invalid timestamp at beat ${index}`,
        });
    }

    // beatIndex is required
    if (typeof b.beatIndex !== 'number') {
        results.push({
            field: `beats[${index}].beatIndex`,
            valid: false,
            message: `Missing or invalid beatIndex at beat ${index}`,
        });
    }

    // intensity is required
    if (typeof b.intensity !== 'number') {
        results.push({
            field: `beats[${index}].intensity`,
            valid: false,
            message: `Missing or invalid intensity at beat ${index}`,
        });
    }

    // band is required
    if (!['low', 'mid', 'high'].includes(b.band as string)) {
        results.push({
            field: `beats[${index}].band`,
            valid: false,
            message: `Missing or invalid band at beat ${index}`,
        });
    }

    // quantizationError is optional but should be a number if present
    if (b.quantizationError !== undefined && typeof b.quantizationError !== 'number') {
        results.push({
            field: `beats[${index}].quantizationError`,
            valid: false,
            message: `Invalid quantizationError at beat ${index}`,
        });
    }

    return results;
}

/**
 * Validates an array of beats.
 * Returns validation results for the array and samples of beat-level validations.
 */
function validateBeatsArray(
    beats: unknown[] | undefined,
    fieldName: string
): FieldValidation[] {
    const results: FieldValidation[] = [];

    if (!Array.isArray(beats)) {
        results.push({
            field: fieldName,
            valid: false,
            message: `${fieldName} is not an array`,
        });
        return results;
    }

    const count = beats.length;
    results.push({
        field: fieldName,
        valid: true,
        message: `${count} beats found`,
        value: count,
    });

    // Sample validation: check first 5 beats, last 5 beats, and a random middle sample
    if (count > 0) {
        const indicesToCheck = new Set<number>();

        // First 5 (or all if less than 5)
        for (let i = 0; i < Math.min(5, count); i++) {
            indicesToCheck.add(i);
        }

        // Last 5 (or all if less than 5)
        for (let i = Math.max(0, count - 5); i < count; i++) {
            indicesToCheck.add(i);
        }

        // Middle sample
        if (count > 10) {
            indicesToCheck.add(Math.floor(count / 2));
        }

        // Validate sampled beats
        for (const index of indicesToCheck) {
            const beatErrors = validateBeat(beats[index], index);
            results.push(...beatErrors);
        }
    }

    return results;
}

/**
 * Validates a difficulty variant has required fields.
 */
function validateDifficultyVariant(
    variant: unknown,
    variantName: string
): FieldValidation[] {
    const results: FieldValidation[] = [];
    const v = variant as Record<string, unknown>;

    if (!v) {
        results.push({
            field: `difficultyVariants.${variantName}`,
            valid: false,
            message: `${variantName} variant is missing`,
        });
        return results;
    }

    // Check for beats array (some variants may have 'beats' instead of 'stream')
    const beats = v.beats || v.stream;
    if (!Array.isArray(beats)) {
        results.push({
            field: `difficultyVariants.${variantName}.beats`,
            valid: false,
            message: `${variantName} variant has no beats array`,
        });
    } else {
        results.push({
            field: `difficultyVariants.${variantName}.beats`,
            valid: true,
            message: `${beats.length} beats`,
            value: beats.length,
        });
    }

    return results;
}

/**
 * Validates a GeneratedRhythm object for level generation compatibility.
 *
 * @param rhythm - The GeneratedRhythm to validate
 * @returns Validation result with field-level checks and overall status
 */
export function validateGeneratedRhythm(rhythm: GeneratedRhythm | null): GeneratedRhythmValidation {
    const fields: FieldValidation[] = [];
    const errors: string[] = [];

    if (!rhythm) {
        return {
            isValid: false,
            fields: [{
                field: 'rhythm',
                valid: false,
                message: 'No rhythm data available',
            }],
            errors: ['No rhythm data available'],
            summary: 'Rhythm data is required for level generation',
        };
    }

    // Validate bandStreams
    const r = rhythm as unknown as Record<string, unknown>;
    const bandStreams = r.bandStreams as Record<string, unknown> | undefined;

    if (!bandStreams) {
        fields.push({
            field: 'bandStreams',
            valid: false,
            message: 'bandStreams is missing',
        });
        errors.push('bandStreams is required');
    } else {
        // Low band
        const lowBeats = (bandStreams.low as Record<string, unknown>)?.beats;
        fields.push(...validateBeatsArray(lowBeats as GeneratedBeat[] | undefined, 'bandStreams.low.beats'));

        // Mid band
        const midBeats = (bandStreams.mid as Record<string, unknown>)?.beats;
        fields.push(...validateBeatsArray(midBeats as GeneratedBeat[] | undefined, 'bandStreams.mid.beats'));

        // High band
        const highBeats = (bandStreams.high as Record<string, unknown>)?.beats;
        fields.push(...validateBeatsArray(highBeats as GeneratedBeat[] | undefined, 'bandStreams.high.beats'));
    }

    // Validate composite
    const composite = r.composite as Record<string, unknown> | undefined;
    if (!composite) {
        fields.push({
            field: 'composite',
            valid: false,
            message: 'composite is missing',
        });
        errors.push('composite is required');
    } else {
        const compositeBeats = composite.beats || composite.stream;
        fields.push(...validateBeatsArray(compositeBeats as GeneratedBeat[] | undefined, 'composite.stream'));
    }

    // Validate difficultyVariants
    const difficultyVariants = r.difficultyVariants as Record<string, unknown> | undefined;
    if (!difficultyVariants) {
        fields.push({
            field: 'difficultyVariants',
            valid: false,
            message: 'difficultyVariants is missing',
        });
        errors.push('difficultyVariants is required');
    } else {
        fields.push(...validateDifficultyVariant(difficultyVariants.easy, 'easy'));
        fields.push(...validateDifficultyVariant(difficultyVariants.medium, 'medium'));
        fields.push(...validateDifficultyVariant(difficultyVariants.hard, 'hard'));
        // Natural is optional but recommended
        if (difficultyVariants.natural) {
            fields.push(...validateDifficultyVariant(difficultyVariants.natural, 'natural'));
        } else {
            fields.push({
                field: 'difficultyVariants.natural',
                valid: true,
                message: '(optional, not present)',
                value: 0,
            });
        }
    }

    // Validate phrases (nested at analysis.phraseAnalysis.phrases)
    const analysis = r.analysis as Record<string, unknown> | undefined;
    const phraseAnalysis = analysis?.phraseAnalysis as Record<string, unknown> | undefined;
    const phrases = phraseAnalysis?.phrases;
    if (!Array.isArray(phrases)) {
        fields.push({
            field: 'analysis.phraseAnalysis.phrases',
            valid: false,
            message: 'phrases is not an array',
        });
        errors.push('phrases array is required');
    } else {
        fields.push({
            field: 'analysis.phraseAnalysis.phrases',
            valid: true,
            message: `${phrases.length} phrases found`,
            value: phrases.length,
        });
    }

    // Validate metadata
    const metadata = r.metadata as Record<string, unknown> | undefined;
    if (!metadata) {
        fields.push({
            field: 'metadata',
            valid: false,
            message: 'metadata is missing',
        });
        errors.push('metadata is required');
    } else {
        // transientsDetected
        if (typeof metadata.transientsDetected !== 'number') {
            fields.push({
                field: 'metadata.transientsDetected',
                valid: false,
                message: 'transientsDetected is missing or not a number',
            });
            errors.push('metadata.transientsDetected is required');
        } else {
            fields.push({
                field: 'metadata.transientsDetected',
                valid: true,
                message: `${metadata.transientsDetected} transients`,
                value: metadata.transientsDetected,
            });
        }
    }

    // Collect all invalid fields for errors
    const invalidFields = fields.filter(f => !f.valid);
    for (const field of invalidFields) {
        if (!errors.includes(field.message)) {
            errors.push(`${field.field}: ${field.message}`);
        }
    }

    const isValid = invalidFields.length === 0;

    return {
        isValid,
        fields,
        errors,
        summary: isValid
            ? 'All data contract validations passed. Ready for level generation.'
            : `${invalidFields.length} validation issue(s) found`,
    };
}

// ============================================================
// Sub-components
// ============================================================

interface FieldStatusProps {
    field: FieldValidation;
}

function FieldStatus({ field }: FieldStatusProps) {
    return (
        <div className={`data-contract-field ${field.valid ? 'valid' : 'invalid'}`}>
            <span className="data-contract-field-icon">
                {field.valid ? (
                    <CheckCircle size={16} />
                ) : (
                    <XCircle size={16} />
                )}
            </span>
            <span className="data-contract-field-name">{field.field}</span>
            <span className="data-contract-field-message">{field.message}</span>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function DataContractValidator({
    rhythm,
    isValidating = false,
    onRetry,
    className,
}: DataContractValidatorProps) {
    // Run validation
    const validation = useMemo(() => validateGeneratedRhythm(rhythm), [rhythm]);

    // Don't render if no rhythm data
    if (!rhythm) {
        return null;
    }

    // Show loading state
    if (isValidating) {
        return (
            <div className={`data-contract-validator ${className || ''}`}>
                <div className="data-contract-header">
                    <RefreshCw className="data-contract-header-icon spinning" size={20} />
                    <h4 className="data-contract-header-title">Validating Data Contract...</h4>
                </div>
            </div>
        );
    }

    return (
        <div className={`data-contract-validator ${className || ''}`}>
            <div className="data-contract-header">
                <Shield
                    className={`data-contract-header-icon ${validation.isValid ? 'valid' : 'invalid'}`}
                    size={20}
                />
                <h4 className="data-contract-header-title">Data Contract Validation</h4>
                <span className={`data-contract-status-badge ${validation.isValid ? 'valid' : 'invalid'}`}>
                    {validation.isValid ? 'PASS' : 'FAIL'}
                </span>
            </div>

            {/* Summary */}
            <div className={`data-contract-summary ${validation.isValid ? 'valid' : 'invalid'}`}>
                {validation.isValid ? (
                    <CheckCircle size={16} />
                ) : (
                    <AlertTriangle size={16} />
                )}
                <span>{validation.summary}</span>
            </div>

            {/* Field Validations */}
            <div className="data-contract-fields">
                {validation.fields.map((field, index) => (
                    <FieldStatus key={`${field.field}-${index}`} field={field} />
                ))}
            </div>

            {/* Errors Section */}
            {validation.errors.length > 0 && (
                <div className="data-contract-errors">
                    <h5 className="data-contract-errors-title">Errors</h5>
                    <ul className="data-contract-errors-list">
                        {validation.errors.map((error, index) => (
                            <li key={index} className="data-contract-error-item">
                                {error}
                            </li>
                        ))}
                    </ul>
                    {onRetry && (
                        <button className="data-contract-retry-button" onClick={onRetry}>
                            <RefreshCw size={14} />
                            Retry Validation
                        </button>
                    )}
                </div>
            )}

            {/* Success Message */}
            {validation.isValid && (
                <div className="data-contract-success">
                    <CheckCircle size={16} />
                    <span>Ready for Level Generation</span>
                </div>
            )}
        </div>
    );
}

export default DataContractValidator;
