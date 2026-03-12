#!/usr/bin/env python3
"""
Inspect a TensorFlow SavedModel to find input/output signatures.
"""

import tensorflow as tf
import sys
import os


def inspect_savedmodel(model_path):
    """Print signatures and operations in a SavedModel."""
    print(f"Inspecting SavedModel: {model_path}\n")

    if not os.path.exists(model_path):
        print(f"Error: Path '{model_path}' does not exist")
        return

    # Load the SavedModel
    model = tf.saved_model.load(model_path)

    # Get all signatures
    print("=== AVAILABLE SIGNATURES ===")
    signatures = model.signatures
    print(f"Signature keys: {list(signatures.keys())}\n")

    for sig_key in signatures.keys():
        print(f"\n=== SIGNATURE: {sig_key} ===")
        sig = signatures[sig_key]

        print(f"\n  Inputs:")
        for input_name, input_spec in sig.structured_input_signature[1].items():
            print(f"    {input_name}:")
            print(f"      Shape: {input_spec.shape}")
            print(f"      Dtype: {input_spec.dtype}")

        print(f"\n  Outputs:")
        if hasattr(sig, 'structured_outputs') and sig.structured_outputs:
            for output_name, output_spec in sig.structured_outputs.items():
                print(f"    {output_name}:")
                if hasattr(output_spec, 'shape'):
                    print(f"      Shape: {output_spec.shape}")
                    print(f"      Dtype: {output_spec.dtype}")
                else:
                    print(f"      Spec: {output_spec}")
        else:
            # Try to get output info from the concrete function
            print(f"    (checking concrete function outputs...)")
            cf = sig
            if hasattr(cf, 'outputs'):
                for i, output in enumerate(cf.outputs):
                    print(f"    output_{i}: shape={output.shape}, dtype={output.dtype}")

        # Print output names from the function def
        print(f"\n  Output tensor names:")
        if hasattr(sig, 'function_def') and sig.function_def:
            for node_def in sig.function_def.node_def:
                if node_def.op == 'Identity' and 'outputs' in str(node_def):
                    print(f"    {node_def.name}")

    # Also check for default serving signature
    if 'serving_default' in signatures:
        print("\n=== DETAILED serving_default ANALYSIS ===")
        sig = signatures['serving_default']

        # Get concrete function
        cf = sig

        # Print all input details
        print("\nFull input signature:")
        print(f"  {cf.structured_input_signature}")

        # Print output details
        print("\nFull output details:")
        if hasattr(cf, '_output_shapes'):
            print(f"  Output shapes: {cf._output_shapes}")
        if hasattr(cf, '_output_dtypes'):
            print(f"  Output dtypes: {cf._output_dtypes}")

        # List all operations
        print("\n=== ALL OPERATIONS IN GRAPH ===")
        graph = cf.graph
        ops = list(graph.get_operations())

        # Count by type
        op_types = {}
        for op in ops:
            op_types[op.type] = op_types.get(op.type, 0) + 1

        print("\nOperation type counts:")
        for op_type, count in sorted(op_types.items(), key=lambda x: -x[1]):
            print(f"  {op_type}: {count}")

        # Check for problematic ops
        problematic_ops = ['PartitionedCall', 'StatefulPartitionedCall', 'TensorListReserve']
        found_problematic = []
        for op in ops:
            if op.type in problematic_ops:
                found_problematic.append(f"{op.name} ({op.type})")

        if found_problematic:
            print(f"\n⚠️  PROBLEMATIC OPS FOUND (not supported in browser TF.js):")
            for op in found_problematic:
                print(f"    {op}")
        else:
            print(f"\n✅ No problematic ops found!")

        # Find output nodes (nodes with no consumers)
        print("\n=== LIKELY OUTPUT NODES (no consumers) ===")
        for op in ops:
            if op.type == 'Placeholder':
                continue
            has_consumers = False
            for output in op.outputs:
                if len(output.consumers()) > 0:
                    has_consumers = True
                    break
            if not has_consumers and op.outputs:
                print(f"  {op.name} ({op.type})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python inspect_savedmodel.py <path_to_savedmodel_directory>")
        print("Example: python inspect_savedmodel.py ./public/models/effnetdiscogs-bs64-1-savedmodel")
        sys.exit(1)

    inspect_savedmodel(sys.argv[1])
