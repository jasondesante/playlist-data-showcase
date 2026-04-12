---
name: tfjs-convert
description: Inspect and convert TensorFlow models (frozen .pb graphs and SavedModel directories) to browser-compatible TensorFlow.js format. Use when the user wants to convert a TF model to TFJS, inspect a .pb or SavedModel to find input/output nodes, troubleshoot PartitionedCall/StatefulPartitionedCall conversion errors, or set up TF models for browser inference. Triggers on mentions of converting pb to tfjs, tensorflow to tensorflow.js, inspecting frozen graphs, SavedModel conversion, browser-compatible ML models, or tensorflowjs_converter.
---

# TF Model to TFJS Converter

Inspect TensorFlow models and convert them to browser-compatible TensorFlow.js format. Handles the common pain point of TF2 models with `PartitionedCall`/`StatefulPartitionedCall` ops that standard conversion silently fails on.

## Dependencies

Before running any script, verify the environment has:

```bash
pip install "tensorflow>=2.10,<2.16" "tensorflowjs>=4.0.0"
# Optional, for ONNX fallback path:
pip install tf2onnx onnx onnxruntime
```

## Workflow Decision Tree

```
What do you have?
  ├── .pb frozen graph file
  │   └── Run: scripts/inspect_pb.py <path>
  │       └── Read output to get input/output node names
  │           ├── No problematic ops → scripts/convert-pb-to-tfjs.py
  │           └── Has PartitionedCall → scripts/convert-pb-to-tfjs-browser.py
  │
  └── SavedModel directory (contains saved_model.pb)
      └── Run: scripts/inspect_savedmodel.py <path>
          └── Read output to get signatures and output nodes
              └── scripts/convert_savedmodel_to_tfjs.py (tries multiple strategies automatically)
```

## Step 1: Inspect the Model

### Frozen .pb file

```bash
python scripts/inspect_pb.py <path_to_file.pb>
```

Reports: input placeholders (name, type, shape), output nodes (nodes with no consumers), and all non-trivial operations. Use the output node names for the conversion step.

### SavedModel directory

```bash
python scripts/inspect_savedmodel.py <path_to_savedmodel_dir>
```

Reports: available signatures, input/output specs with shapes and dtypes, operation type counts, problematic ops for browser TFJS, and likely output nodes.

**Key thing to watch for:** If the output mentions `PartitionedCall` or `StatefulPartitionedCall`, the model needs special handling (see Step 2b).

## Step 2: Convert

### 2a. Simple conversion (no problematic ops)

For frozen .pb files with clean op graphs:

```bash
python scripts/convert-pb-to-tfjs.py <input.pb> <output_dir> --output_nodes "node1,node2"
```

Options:
- `--quantize_float16` — reduces model size ~50%
- `--skip_op_check` — bypasses op compatibility check (last resort)

### 2b. Browser-compatible conversion (PartitionedCall present)

For TF2 models that export function calls inside `PartitionedCall` ops — standard TFJS doesn't support these:

```bash
# Analyze first
python scripts/convert-pb-to-tfjs-browser.py <input.pb> --analyze

# Convert (tries multiple strategies automatically)
python scripts/convert-pb-to-tfjs-browser.py <input.pb> <output_dir> --output_nodes "node1,node2"
```

Automatic fallback chain:
1. Graph transform to inline function calls
2. SavedModel re-export approach
3. Manual graph extraction
4. ONNX intermediate format (requires `tf2onnx`)
5. Direct conversion with `--skip_op_check` (may not work in browser)

Each converted model is verified for browser compatibility by checking `model.json` for unsupported ops.

### 2c. SavedModel conversion (multi-strategy)

Tries multiple conversion strategies automatically and reports which ones produce browser-compatible models:

```bash
python scripts/convert_savedmodel_to_tfjs.py
```

Edit the `main()` function to set `savedmodel_path`, `output_base`, and `output_nodes` for your model. Strategies tried in order:
1. `standard` — direct SavedModel → TFJS
2. `with_control_flow_v2` — enables control flow v2
3. `strip_debug` — strips debug ops
4. `all_flags` — control_flow_v2 + strip_debug + skip_op_check
5. `skip_op_check` — skips compatibility check
6. `frozen` — freezes to .pb first, then converts

Outputs are written to `<output_base>-<strategy>/` directories. The script reports which strategies produced clean (browser-compatible) models.

## Step 3: Verify

After conversion, check `model.json` in the output directory. The browser-conversion scripts do this automatically. Manual check:

```bash
grep -o '"op":"[^"]*"' <output_dir>/model.json | sort -u
```

If `PartitionedCall` or `StatefulPartitionedCall` appear, the model will **not** work in browser TFJS. Try a different conversion strategy or the ONNX fallback path.

## Integration Example

After successful conversion, use the model in browser code:

```js
const model = await tf.loadGraphModel('/models/your-model/model.json');
const input = tf.tensor3d(data, [1, height, width, channels]);
const output = model.execute(input);
```

## Scripts Reference

| Script | Purpose | Key Flags |
|--------|---------|-----------|
| `inspect_pb.py` | Inspect frozen .pb graph | Positional: `<pb_path>` |
| `inspect_savedmodel.py` | Inspect SavedModel directory | Positional: `<savedmodel_dir>` |
| `convert-pb-to-tfjs.py` | Simple .pb → TFJS conversion | `--output_nodes`, `--quantize_float16`, `--skip_op_check` |
| `convert-pb-to-tfjs-browser.py` | Advanced .pb → TFJS (handles PartitionedCall) | `--output_nodes`, `--analyze`, `--skip_op_check` |
| `convert_savedmodel_to_tfjs.py` | SavedModel → TFJS (multi-strategy) | Edit `main()` for paths/nodes |
