#!/bin/bash
set -ex
cd "$(dirname "$0")"

# python api-deepseek-v4.py \
#   --input data/input.jsonl \
#   --output data/output.jsonl


python jsonl_to_md.py \
  --input data/output.jsonl \
  --output output/report.md