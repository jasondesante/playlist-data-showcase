import { useMemo } from 'react';
import { Heart, Tag } from 'lucide-react';
import { Card } from '../ui/Card';
import type { MusicClassificationProfile } from '@/types';
import './MoodClassificationCard.css';

/**
 * Props for the MoodClassificationCard component
 */
export interface MoodClassificationCardProps {
    /** The full music classification profile */
    profile?: MusicClassificationProfile | null;
    /** Optional additional CSS class name */
    className?: string;
}

/**
 * Format mood/theme name for display (capitalize, handle hyphens)
 */
const formatMoodName = (name: string): string => {
    return name
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

/**
 * MoodClassificationCard Component
 *
 * Displays mood/theme tags and confidence scores from music classification.
 */
export function MoodClassificationCard({
    profile,
    className = '',
}: MoodClassificationCardProps) {
    // Extract mood data from classification profile
    const moodData = useMemo(() => {
        if (!profile) return null;

        return {
            moods: profile.moods,
            moodTags: profile.mood_tags,
        };
    }, [profile]);

    // No data state
    if (!moodData) {
        return null;
    }

    const { moods, moodTags } = moodData;
    const hasMoods = moods.length > 0 || moodTags.length > 0;
    const displayMoods = moods.slice(0, 15);

    if (!hasMoods) {
        return null;
    }

    return (
        <Card
            variant="elevated"
            padding="md"
            className={`mood-classification-card ${className}`}
        >
            {/* Header */}
            <div className="mood-classification-header">
                <Heart size={16} className="mood-classification-header-icon" />
                <h3 className="mood-classification-title">Moods & Themes</h3>
            </div>

            {/* Mood Tags */}
            {moodTags.length > 0 && (
                <div className="mood-classification-tags">
                    {moodTags.slice(0, 12).map((tag, index) => (
                        <span key={index} className="mood-classification-tag">
                            {formatMoodName(tag)}
                        </span>
                    ))}
                </div>
            )}

            {/* Mood Confidence Scores */}
            {moods.length > 0 && (
                <div className="mood-classification-confidence">
                    <div className="mood-classification-confidence-header">
                        <Tag size={14} className="mood-classification-confidence-icon" />
                        <span className="mood-classification-confidence-label">
                            Confidence Scores ({displayMoods.length} of {moods.length} detected)
                        </span>
                    </div>
                    <div className="mood-classification-list">
                        {displayMoods.map((mood, index) => (
                            <div key={index} className="mood-classification-item">
                                <span className="mood-classification-name">
                                    {formatMoodName(mood.name)}
                                </span>
                                <span className="mood-classification-bar">
                                    <div
                                        className="mood-classification-bar-fill"
                                        style={{ width: `${mood.confidence * 100}%` }}
                                    />
                                </span>
                                <span className="mood-classification-value">
                                    {Math.round(mood.confidence * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

export default MoodClassificationCard;
