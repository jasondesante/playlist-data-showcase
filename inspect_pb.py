#!/usr/bin/env python3
"""
Inspect a TensorFlow frozen graph .pb file to find input/output node names.
"""

import tensorflow as tf
import sys


def inspect_pb(pb_path):
    """Print operations in a frozen graph."""
    print(f"Inspecting: {pb_path}\n")

    with tf.io.gfile.GFile(pb_path, 'rb') as f:
        graph_def = tf.compat.v1.GraphDef()
        graph_def.ParseFromString(f.read())

    with tf.Graph().as_default() as graph:
        tf.import_graph_def(graph_def, name='')

        ops = list(graph.get_operations())

        # Find potential inputs (Placeholder nodes)
        print("=== INPUT NODES (Placeholders) ===")
        for op in ops:
            if op.type == 'Placeholder':
                shape = op.outputs[0].shape if op.outputs else 'unknown'
                print(f"  {op.name}")
                print(f"    Type: {op.type}")
                print(f"    Shape: {shape}")
                print()

        # Find nodes with no outputs (likely final outputs)
        print("\n=== NODES WITH NO CONSUMERS (likely outputs) ===")
        for op in ops:
            if op.type == 'Placeholder':
                continue
            # Check if any output tensor has no consumers
            has_consumers = False
            for output in op.outputs:
                if len(output.consumers()) > 0:
                    has_consumers = True
                    break
            if not has_consumers and op.outputs:
                print(f"  {op.name} ({op.type})")
                for i, output in enumerate(op.outputs):
                    print(f"    Output {i}: {output.name}, shape: {output.shape}")

        print(f"\n=== ALL OPERATIONS ({len(ops)} total) ===")
        for op in ops:
            if op.type not in ['Placeholder', 'Const', 'Identity']:
                print(f"  {op.name} ({op.type})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python inspect_pb.py <path_to_pb_file>")
        sys.exit(1)

    inspect_pb(sys.argv[1])
