/**
 * TensorFlow.js Genre Classifier
 *
 * Uses the converted mtg_jamendo_genre-discogs-effnet-1 model
 * to classify music by genre from discogs-effnet embeddings.
 *
 * Input: 1280-dimensional embedding vector
 * Output: 87 genre probabilities
 */

import * as tf from '@tensorflow/tfjs';

// Genre labels from the model metadata
export const GENRE_LABELS = [
  '60s', '70s', '80s', '90s', 'acidjazz', 'alternative', 'alternativerock',
  'ambient', 'atmospheric', 'blues', 'bluesrock', 'bossanova', 'breakbeat',
  'celtic', 'chanson', 'chillout', 'choir', 'classical', 'classicrock',
  'club', 'contemporary', 'country', 'dance', 'darkambient', 'darkwave',
  'deephouse', 'disco', 'downtempo', 'drumnbass', 'dub', 'dubstep',
  'easylistening', 'edm', 'electronic', 'electronica', 'electropop',
  'ethno', 'eurodance', 'experimental', 'folk', 'funk', 'fusion',
  'groove', 'grunge', 'hard', 'hardrock', 'hiphop', 'house', 'idm',
  'improvisation', 'indie', 'industrial', 'instrumentalpop',
  'instrumentalrock', 'jazz', 'jazzfusion', 'latin', 'lounge',
  'medieval', 'metal', 'minimal', 'newage', 'newwave', 'orchestral',
  'pop', 'popfolk', 'poprock', 'postrock', 'progressive', 'psychedelic',
  'punkrock', 'rap', 'reggae', 'rnb', 'rock', 'rocknroll',
  'singersongwriter', 'soul', 'soundtrack', 'swing', 'symphonic',
  'synthpop', 'techno', 'trance', 'triphop', 'world', 'worldfusion'
] as const;

export type GenreLabel = typeof GENRE_LABELS[number];

export interface GenrePrediction {
  genre: GenreLabel;
  probability: number;
}

export class TFJSGenreClassifier {
  private model: tf.GraphModel | null = null;
  private modelPath: string;

  constructor(modelPath: string = '/models/mtg_jamendo_genre/tfjs/model.json') {
    this.modelPath = modelPath;
  }

  /**
   * Load the TensorFlow.js model
   */
  async load(): Promise<void> {
    if (this.model) return;

    console.log('Loading TF.js genre classifier model...');
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
   * Classify genre from a 1280-dimensional embedding vector
   *
   * @param embedding - Float32Array or number[] of length 1280
   * @param topK - Number of top predictions to return (default: 5)
   * @returns Array of top genre predictions sorted by probability
   */
  async predict(embedding: Float32Array | number[], topK: number = 5): Promise<GenrePrediction[]> {
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
      const predictions: GenrePrediction[] = Array.from(probabilities).map((prob, index) => ({
        genre: GENRE_LABELS[index],
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
   * Get all genre predictions
   */
  async predictAll(embedding: Float32Array | number[]): Promise<GenrePrediction[]> {
    return this.predict(embedding, GENRE_LABELS.length);
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
export const genreClassifier = new TFJSGenreClassifier();
