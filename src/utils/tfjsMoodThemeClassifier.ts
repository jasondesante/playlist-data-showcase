/**
 * TensorFlow.js Mood/Theme Classifier
 *
 * Uses the converted mtg_jamendo_moodtheme-discogs-effnet-1 model
 * to classify music by mood and theme from discogs-effnet embeddings.
 *
 * Input: 1280-dimensional embedding vector
 * Output: 56 mood/theme probabilities
 */

import * as tf from '@tensorflow/tfjs';

// Mood/Theme labels from the model metadata (in correct order)
export const MOOD_THEME_LABELS = [
  'action',
  'adventure',
  'advertising',
  'background',
  'ballad',
  'calm',
  'children',
  'christmas',
  'commercial',
  'cool',
  'corporate',
  'dark',
  'deep',
  'documentary',
  'drama',
  'dramatic',
  'dream',
  'emotional',
  'energetic',
  'epic',
  'fast',
  'film',
  'fun',
  'funny',
  'game',
  'groovy',
  'happy',
  'heavy',
  'holiday',
  'hopeful',
  'inspiring',
  'love',
  'meditative',
  'melancholic',
  'melodic',
  'motivational',
  'movie',
  'nature',
  'party',
  'positive',
  'powerful',
  'relaxing',
  'retro',
  'romantic',
  'sad',
  'sexy',
  'slow',
  'soft',
  'soundscape',
  'space',
  'sport',
  'summer',
  'trailer',
  'travel',
  'upbeat',
  'uplifting'
] as const;

export type MoodThemeLabel = typeof MOOD_THEME_LABELS[number];

export interface MoodThemePrediction {
  mood: MoodThemeLabel;
  probability: number;
}

export class TFJSMoodThemeClassifier {
  private model: tf.GraphModel | null = null;
  private modelPath: string;

  constructor(modelPath: string = '/models/mtg_jamendo_moodtheme/tfjs/model.json') {
    this.modelPath = modelPath;
  }

  /**
   * Load the TensorFlow.js model
   */
  async load(): Promise<void> {
    if (this.model) return;

    console.log('Loading TF.js mood/theme classifier model...');
    this.model = await tf.loadGraphModel(this.modelPath);
    console.log('Model loaded successfully');
  }

  /**
   * Check if the model is loaded
   */
  isLoaded(): boolean {
    return this.model !== null;
  }

  /**
   * Classify mood/theme from a 1280-dimensional embedding vector
   *
   * @param embedding - Float32Array or number[] of length 1280
   * @param topK - Number of top predictions to return (default: 5)
   * @returns Array of top mood/theme predictions sorted by probability
   */
  async predict(embedding: Float32Array | number[], topK: number = 5): Promise<MoodThemePrediction[]> {
    if (!this.model) {
      throw new Error('Model not loaded. Call load() first.');
    }

    // Create tensor from embedding (shape: [1, 1280])
    const inputTensor = tf.tensor2d([Array.from(embedding)], [1, 1280]);

    try {
      // Run inference
      const output = await this.model.predict(inputTensor) as tf.Tensor;

      // Get probabilities (sigmoid output)
      const probabilities = await output.data();

      // Create predictions array
      const predictions: MoodThemePrediction[] = Array.from(probabilities).map((prob, index) => ({
        mood: MOOD_THEME_LABELS[index],
        probability: prob
      }));

      // Sort by probability and return top K
      return predictions
        .sort((a, b) => b.probability - a.probability)
        .slice(0, topK);

    } finally {
      inputTensor.dispose();
    }
  }

  /**
   * Get all mood/theme predictions
   */
  async predictAll(embedding: Float32Array | number[]): Promise<MoodThemePrediction[]> {
    return this.predict(embedding, MOOD_THEME_LABELS.length);
  }

  /**
   * Dispose of the model and free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

// Export a singleton instance
export const moodThemeClassifier = new TFJSMoodThemeClassifier();
