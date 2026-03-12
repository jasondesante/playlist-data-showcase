#!/usr/bin/env python3
"""
Convert TensorFlow frozen graph .pb files to TensorFlow.js format.

Usage:
    python convert-pb-to-tfjs.py input.pb ./output_dir --output_nodes "output_node_name"

Example:
    python convert-pb-to-tfjs.py public/models/mtg_jamendo_genre/mtg_jamendo_genre-discogs-effnet-1.pb \
        public/models/mtg_jamendo_genre/tfjs \
        --output_nodes "model/Sigmoid"
"""

import subprocess
import os
import argparse
import sys


def convert_pb_to_tfjs(input_pb, output_dir, output_nodes=None, quantize_float16=False, skip_op_check=False):
    """
    Convert a frozen graph .pb file to TensorFlow.js format.

    Args:
        input_pb: Path to the input .pb file
        output_dir: Directory to save the TF.js model
        output_nodes: Comma-separated list of output node names (required for frozen models)
        quantize_float16: Whether to quantize weights to float16 (reduces model size by ~50%)
        skip_op_check: Skip the op compatibility check (use for models with unsupported ops)
    """

    cmd = [
        'tensorflowjs_converter',
        '--input_format', 'tf_frozen_model',
        '--output_format', 'tfjs_graph_model',
    ]

    # Output nodes are required for frozen models
    if output_nodes:
        cmd.extend(['--output_node_names', output_nodes])

    # Optional quantization for smaller model size
    if quantize_float16:
        cmd.append('--quantize_float16')

    # Skip op check for models with unsupported TensorFlow ops
    if skip_op_check:
        cmd.append('--skip_op_check')

    cmd.extend([input_pb, output_dir])

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    else:
        print(f"Success! Model saved to {output_dir}")
        if result.stdout:
            print(result.stdout)
        return True


def main():
    parser = argparse.ArgumentParser(
        description='Convert .pb frozen graph to TensorFlow.js',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
    python convert-pb-to-tfjs.py model.pb ./tfjs_model --output_nodes "model/Sigmoid"
        """
    )
    parser.add_argument('input_pb', help='Path to input .pb file')
    parser.add_argument('output_dir', help='Output directory for TF.js model')
    parser.add_argument('--output_nodes', required=True,
                        help='Comma-separated output node names (required for frozen models)')
    parser.add_argument('--quantize_float16', action='store_true',
                        help='Quantize weights to float16 to reduce model size')
    parser.add_argument('--skip_op_check', action='store_true',
                        help='Skip op compatibility check (use for models with unsupported ops)')

    args = parser.parse_args()

    if not os.path.exists(args.input_pb):
        print(f"Error: Input file '{args.input_pb}' not found")
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)

    success = convert_pb_to_tfjs(
        args.input_pb,
        args.output_dir,
        args.output_nodes,
        args.quantize_float16,
        args.skip_op_check
    )
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
