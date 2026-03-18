# Playlist Data Engine Changelog

All notable changes to the Playlist Data Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **Octave Resolution for TempoDetector**: New `useOctaveResolution` configuration option to fix half-tempo/double-tempo ambiguity in beat tracking. When enabled, uses the TPS2 (duple meter) calculation from the Ellis 2007 paper to prefer tempos with strong half-period evidence.
  - Addresses the issue where a 146 BPM track might be detected as 73 BPM
  - Opt-in feature (defaults to `false`) to preserve backward compatibility
  - Implements Equation 7 from Ellis 2007: `TPS2(τ) = TPS(τ) + 0.5×TPS(2τ) + 0.25×TPS(2τ-1) + 0.25×TPS(2τ+1)`
  - See `TempoDetectorConfig` in [DATA_ENGINE_REFERENCE.md](./DATA_ENGINE_REFERENCE.md) for usage details

- **Triple Meter Resolution for TempoDetector**: New `useTripleMeter` configuration option to improve beat tracking for triple meter music (3/4, 6/8 time signatures). When enabled, uses the TPS3 calculation from the Ellis 2007 paper to prefer tempos with strong third-period evidence.
  - Ideal for waltzes, 6/8 shuffle feels, and other triple-meter music where beats occur in groups of three
  - Opt-in feature (defaults to `false`) to preserve backward compatibility
  - Works independently of `useOctaveResolution` - both can be enabled simultaneously
  - Implements triple meter formula from Ellis 2007: `TPS3(τ) = TPS(τ) + 0.33×TPS(3τ) + 0.33×TPS(3τ-1) + 0.33×TPS(3τ+1)`
  - See `TempoDetectorConfig` in [DATA_ENGINE_REFERENCE.md](./DATA_ENGINE_REFERENCE.md) for usage details
