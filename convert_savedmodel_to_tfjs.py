#!/usr/bin/env python3
"""
Convert TensorFlow SavedModel to TensorFlow.js format with multiple strategies.
"""

import subprocess
import os
import sys
import shutil
import tensorflow as tf


def run_command(cmd, description):
    """Run a shell command and report results."""
    print(f"\n{'='*60}")
    print(f"STRATEGY: {description}")
    print(f"{'='*60}")
    print(f"Running: {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"FAILED: {result.stderr}")
        return False, result.stderr
    else:
        print(f"SUCCESS!")
        if result.stdout:
            print(result.stdout)
        return True, result.stdout


def check_model_for_problems(output_dir):
    """Check if the converted model has problematic ops."""
    model_json_path = os.path.join(output_dir, 'model.json')
    if not os.path.exists(model_json_path):
        return False, "model.json not found"

    with open(model_json_path, 'r') as f:
        content = f.read()

    problematic_ops = ['PartitionedCall', 'StatefulPartitionedCall', 'TensorListReserve']
    found = [op for op in problematic_ops if op in content]

    if found:
        return False, f"Contains problematic ops: {found}"
    return True, "No problematic ops found"


def freeze_savedmodel(savedmodel_path, output_pb_path, output_nodes):
    """
    Convert SavedModel to frozen graph .pb file.
    This can help remove PartitionedCall ops.
    """
    print(f"\nFreezing SavedModel to {output_pb_path}...")

    # Load the model
    model = tf.saved_model.load(savedmodel_path)
    sig = model.signatures['serving_default']

    # Get the concrete function
    cf = sig

    # Freeze the graph
    from tensorflow.python.framework import convert_to_constants

    # Get input and output specs
    input_specs = cf.structured_input_signature[1]
    print(f"Input specs: {input_specs}")

    # Convert to concrete function with constant tensors
    frozen_func = convert_to_constants.convert_variables_to_constants_v2(cf)

    # Get the graph def
    graph_def = frozen_func.graph.as_graph_def()

    # Save as frozen graph
    with tf.io.gfile.GFile(output_pb_path, 'wb') as f:
        f.write(graph_def.SerializeToString())

    print(f"Frozen graph saved to {output_pb_path}")

    # Print the ops in the frozen graph
    print("\nOps in frozen graph:")
    ops = [node.op for node in graph_def.node]
    op_counts = {}
    for op in ops:
        op_counts[op] = op_counts.get(op, 0) + 1
    for op, count in sorted(op_counts.items(), key=lambda x: -x[1])[:20]:
        print(f"  {op}: {count}")

    # Check for PartitionedCall
    if 'PartitionedCall' in ops:
        print("\n⚠️  WARNING: Frozen graph still contains PartitionedCall!")
        return False
    else:
        print("\n✅ No PartitionedCall in frozen graph!")

    return True


def convert_savedmodel_to_tfjs(savedmodel_path, output_dir, strategy='standard'):
    """
    Convert SavedModel to TFJS using different strategies.
    """

    strategies = {
        'standard': [
            'tensorflowjs_converter',
            '--input_format=tf_saved_model',
            '--output_format=tfjs_graph_model',
            savedmodel_path,
            output_dir
        ],
        'with_control_flow_v2': [
            'tensorflowjs_converter',
            '--input_format=tf_saved_model',
            '--output_format=tfjs_graph_model',
            '--control_flow_v2=True',
            savedmodel_path,
            output_dir
        ],
        'skip_op_check': [
            'tensorflowjs_converter',
            '--input_format=tf_saved_model',
            '--output_format=tfjs_graph_model',
            '--skip_op_check',
            savedmodel_path,
            output_dir
        ],
        'strip_debug': [
            'tensorflowjs_converter',
            '--input_format=tf_saved_model',
            '--output_format=tfjs_graph_model',
            '--strip_debug_ops=True',
            savedmodel_path,
            output_dir
        ],
        'all_flags': [
            'tensorflowjs_converter',
            '--input_format=tf_saved_model',
            '--output_format=tfjs_graph_model',
            '--control_flow_v2=True',
            '--strip_debug_ops=True',
            '--skip_op_check',
            savedmodel_path,
            output_dir
        ],
        'quantized': [
            'tensorflowjs_converter',
            '--input_format=tf_saved_model',
            '--output_format=tfjs_graph_model',
            '--quantize_float16',
            '--skip_op_check',
            savedmodel_path,
            output_dir
        ],
    }

    if strategy not in strategies:
        print(f"Unknown strategy: {strategy}")
        print(f"Available: {list(strategies.keys())}")
        return False

    cmd = strategies[strategy]
    success, result = run_command(cmd, f"SavedModel -> TFJS ({strategy})")

    if success:
        ok, msg = check_model_for_problems(output_dir)
        print(f"Model check: {msg}")
        return ok

    return False


def convert_frozen_to_tfjs(frozen_pb_path, output_dir, output_nodes):
    """Convert frozen graph to TFJS."""

    cmd = [
        'tensorflowjs_converter',
        '--input_format=tf_frozen_model',
        '--output_format=tfjs_graph_model',
        '--output_node_names', output_nodes,
        frozen_pb_path,
        output_dir
    ]

    success, result = run_command(cmd, "Frozen Graph -> TFJS")
    return success


def main():
    savedmodel_path = 'public/models/effnetdiscogs-bs64-1-savedmodel'
    output_base = 'public/models/discogs-effnet-bs64-1-tfjs-browser'

    # Output node names for the model (from inspection)
    # The Identity ops are the outputs: Identity (activations), Identity_1 (embeddings)
    output_nodes = 'Identity,Identity_1'

    print("="*60)
    print("TENSORFLOW SAVEDMODEL TO TFJS CONVERTER")
    print("="*60)
    print(f"Source: {savedmodel_path}")
    print(f"Target: {output_base}")
    print(f"Output nodes: {output_nodes}")

    # Strategy 1: Try direct SavedModel conversion with different flags
    strategies = ['standard', 'with_control_flow_v2', 'strip_debug', 'all_flags', 'skip_op_check']

    successful_conversions = []

    for strategy in strategies:
        output_dir = f"{output_base}-{strategy}"
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)

        if convert_savedmodel_to_tfjs(savedmodel_path, output_dir, strategy):
            ok, msg = check_model_for_problems(output_dir)
            if ok:
                successful_conversions.append((strategy, output_dir))
                print(f"\n✅ {strategy} produced a clean model!")
            else:
                print(f"\n⚠️  {strategy} produced model with issues: {msg}")

    # Strategy 2: Freeze the SavedModel first, then convert
    print("\n" + "="*60)
    print("TRYING FREEZE + CONVERT APPROACH")
    print("="*60)

    frozen_pb_path = '/tmp/discogs-effnet-frozen.pb'
    if os.path.exists(frozen_pb_path):
        os.remove(frozen_pb_path)

    if freeze_savedmodel(savedmodel_path, frozen_pb_path, output_nodes):
        output_dir = f"{output_base}-frozen"
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)

        if convert_frozen_to_tfjs(frozen_pb_path, output_dir, output_nodes):
            ok, msg = check_model_for_problems(output_dir)
            if ok:
                successful_conversions.append(('frozen', output_dir))
                print(f"\n✅ Frozen approach produced a clean model!")

    # Summary
    print("\n" + "="*60)
    print("CONVERSION SUMMARY")
    print("="*60)

    if successful_conversions:
        print("\nSuccessful browser-compatible conversions:")
        for strategy, path in successful_conversions:
            print(f"  ✅ {strategy}: {path}")
    else:
        print("\n❌ No successful browser-compatible conversions found.")
        print("\nTrying skip_op_check as last resort (may not work in browser)...")
        output_dir = f"{output_base}-skip_op_check"
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        convert_savedmodel_to_tfjs(savedmodel_path, output_dir, 'skip_op_check')


if __name__ == "__main__":
    main()
