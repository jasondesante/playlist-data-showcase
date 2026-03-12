/**
 * TensorFlow.js Discogs EfficientNet Embedding Model
 *
 * Converts mel-spectrograms to 1280-dimensional embeddings
 * that can be used with the genre and mood/theme classifiers.
 *
 * Input: Mel-spectrogram with shape [batch, 128, 96] (128 mel bands, 96 time frames)
 * Output: Embedding with shape [batch, 1280]
 *
 * Note: This model requires pre-computed mel-spectrograms from audio.
 * You'll need a separate audio processing library to compute mel-spectrograms
 * from raw audio waveforms.
 *
 * Model outputs:
 * - Identity (activations): [batch, 400] - sigmoid outputs for Discogs-400 genres
 * - Identity_1 (embeddings): [batch, 1280] - embedding vectors for downstream classifiers
 */

import * as tf from '@tensorflow/tfjs';

export interface EmbeddingResult {
  embeddings: Float32Array;  // Shape: [batch * 1280]
  batch: number;
  dimensions: 1280;
}

export interface ActivationResult {
  activations: Float32Array;  // Shape: [batch * 400]
  batch: number;
  dimensions: 400;
}

export class TFJSDiscogsEffnet {
  private model: tf.GraphModel | null = null;
  private modelPath: string;

  // Model input specifications
  static readonly INPUT_MEL_BANDS = 128;
  static readonly INPUT_TIME_FRAMES = 96;
  static readonly OUTPUT_EMBEDDING_DIM = 1280;
  static readonly OUTPUT_ACTIVATION_DIM = 400;

  // Output node names (from frozen model)
  static readonly OUTPUT_EMBEDDINGS = 'Identity_1';  // [batch, 1280]
  static readonly OUTPUT_ACTIVATIONS = 'Identity';   // [batch, 400]

  constructor(modelPath: string = '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json') {
    this.modelPath = modelPath;
  }

  /**
   * Load the TensorFlow.js model
   */
  async load(): Promise<void> {
    if (this.model) return;

    console.log('Loading TF.js Discogs EffNet embedding model...');
    this.model = await tf.loadGraphModel(this.modelPath);
    console.log('Embedding model loaded successfully');

    // Log model info for debugging
    if (this.model.inputs) {
      console.log('Model inputs:', this.model.inputs.map((i: tf.SymbolicTensor) => ({ name: i.name, shape: i.shape })));
    }
  }

  /**
   * Check if the model is loaded
   */
  isLoaded(): boolean {
    return this.model !== null;
  }

  /**
   * Generate embeddings from a mel-spectrogram
   *
   * @param melSpectrogram - Float32Array with shape [batch, 128, 96]
   *                         128 mel bands, 96 time frames
   * @returns Embedding result with 1280-dimensional vectors
   */
  async predict(melSpectrogram: Float32Array, batchSize?: number): Promise<EmbeddingResult> {
    if (!this.model) {
      throw new Error('Model not loaded. Call load() first.');
    }

    // Infer batch size if not provided
    const batch = batchSize ?? melSpectrogram.length / (TFJSDiscogsEffnet.INPUT_MEL_BANDS * TFJSDiscogsEffnet.INPUT_TIME_FRAMES);

    // Create tensor with shape [batch, 128, 96]
    const inputTensor = tf.tensor3d(
      Array.from(melSpectrogram),
      [batch, TFJSDiscogsEffnet.INPUT_MEL_BANDS, TFJSDiscogsEffnet.INPUT_TIME_FRAMES]
    );

    try {
      // Run inference - the frozen model has two outputs, we need the embeddings (Identity_1)
      const outputs = await this.model.executeAsync({
        'melspectrogram': inputTensor
      }) as tf.Tensor[];

      // Find the embeddings output (Identity_1)
      let embeddingsTensor: tf.Tensor | null = null;

      if (Array.isArray(outputs)) {
        // The model returns multiple outputs, we need to find the right one
        // Identity_1 is the embeddings [batch, 1280]
        // Identity is the activations [batch, 400]
        // Typically the second output is embeddings
        if (outputs.length >= 2) {
          // Check shapes to identify which is which
          const shape1 = outputs[0].shape;
          const shape2 = outputs[1].shape;

          if (shape1[1] === TFJSDiscogsEffnet.OUTPUT_EMBEDDING_DIM) {
            embeddingsTensor = outputs[0];
          } else if (shape2[1] === TFJSDiscogsEffnet.OUTPUT_EMBEDDING_DIM) {
            embeddingsTensor = outputs[1];
          } else {
            // Fallback: assume second output is embeddings
            embeddingsTensor = outputs[1];
          }
        } else {
          embeddingsTensor = outputs[0];
        }
      } else {
        embeddingsTensor = outputs as tf.Tensor;
      }

      if (!embeddingsTensor) {
        throw new Error('Could not find embeddings output from model');
      }

      // Get embeddings
      const embeddings = await embeddingsTensor.data();

      // Dispose all output tensors
      if (Array.isArray(outputs)) {
        outputs.forEach(t => t.dispose());
      }

      return {
        embeddings: new Float32Array(embeddings),
        batch,
        dimensions: TFJSDiscogsEffnet.OUTPUT_EMBEDDING_DIM
      };

    } finally {
      inputTensor.dispose();
    }
  }

  /**
   * Get the mean embedding across all frames (useful for track-level analysis)
   */
  async getMeanEmbedding(melSpectrogram: Float32Array, batchSize?: number): Promise<Float32Array> {
    const result = await this.predict(melSpectrogram, batchSize);

    // Calculate mean across batch dimension
    const meanEmbedding = new Float32Array(TFJSDiscogsEffnet.OUTPUT_EMBEDDING_DIM);
    const numFrames = result.batch;

    for (let i = 0; i < numFrames; i++) {
      for (let j = 0; j < TFJSDiscogsEffnet.OUTPUT_EMBEDDING_DIM; j++) {
        meanEmbedding[j] += result.embeddings[i * TFJSDiscogsEffnet.OUTPUT_EMBEDDING_DIM + j];
      }
    }

    for (let j = 0; j < TFJSDiscogsEffnet.OUTPUT_EMBEDDING_DIM; j++) {
      meanEmbedding[j] /= numFrames;
    }

    return meanEmbedding;
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
export const discogsEffnet = new TFJSDiscogsEffnet();
