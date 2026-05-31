#!/usr/bin/env python3
"""
将 DeepSeek 批量输出 JSONL 文件转换为美观的 Markdown 报告
用法: python jsonl_to_md.py --input output.jsonl --output report.md
"""

import json
import argparse
import re
from pathlib import Path


def is_code_block(text: str) -> bool:
    """简单判断回答是否可能包含代码块（用于渲染提示）"""
    # 如果已经包含代码块标记，直接保留
    if "```" in text:
        return True
    # 常见代码特征：def、import、class、=、;、{} 等，且文本较长
    code_indicators = ["def ", "import ", "class ", "print(", "return ",
                       "if __name__", "```", "function(", "=>", "{", "};"]
    if any(ind in text for ind in code_indicators) and len(text) > 50:
        return True
    return False


def format_markdown(input_jsonl: str, output_md: str, title: str = "DeepSeek 模型回答报告"):
    """读取 JSONL，生成 Markdown 文件"""
    records = []
    with open(input_jsonl, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                records.append(record)
            except json.JSONDecodeError as e:
                print(f"警告: 第 {line_num} 行解析失败: {e}")

    if not records:
        print("没有有效数据，退出")
        return

    with open(output_md, 'w', encoding='utf-8') as md:
        # 写入 Markdown 头部
        md.write(f"# {title}\n\n")
        md.write(f"**生成时间**: {Path(__file__).stat().st_mtime}\n\n")
        md.write(f"**总问答数**: {len(records)}\n\n")
        md.write("---\n\n")

        for idx, rec in enumerate(records, 1):
            question = rec.get("input", "")
            answer = rec.get("output")
            error = rec.get("error")

            # 问题部分
            md.write(f"## 问题 {idx}\n\n")
            md.write(f"> {question}\n\n")

            # 回答部分
            md.write("### 🤖 模型回答\n\n")
            if error:
                md.write(f"**❌ 错误**: {error}\n\n")
            elif answer is None:
                md.write("**⚠️ 无回答**\n\n")
            else:
                # 判断是否可能包含代码，使用代码块包裹
                if is_code_block(answer):
                    # 尝试提取语言（简单规则）
                    lang = ""
                    if "def " in answer or "import " in answer or "class " in answer:
                        lang = "python"
                    elif "function(" in answer or "console.log" in answer:
                        lang = "javascript"
                    elif "#include" in answer or "int main" in answer:
                        lang = "cpp"
                    md.write(f"```{lang}\n{answer}\n```\n\n")
                else:
                    # 普通文本，转义 Markdown 特殊字符（简单处理）
                    answer_escaped = answer.replace("*", "\\*").replace("_", "\\_")
                    # 分段
                    paragraphs = answer_escaped.split("\n\n")
                    for para in paragraphs:
                        if para.strip():
                            md.write(f"{para}\n\n")
            md.write("---\n\n")


def main():
    parser = argparse.ArgumentParser(description="将 DeepSeek 输出 JSONL 转为 Markdown")
    parser.add_argument("--input", "-i", required=True, help="输入的 output.jsonl 文件")
    parser.add_argument("--output", "-o", required=True, help="输出的 .md 文件")
    parser.add_argument("--title", "-t", default="DeepSeek 模型回答报告", help="Markdown 报告标题")
    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"错误: 输入文件 {args.input} 不存在")
        return

    format_markdown(args.input, args.output, args.title)
    print(f"✅ Markdown 报告已生成: {args.output}")


if __name__ == "__main__":
    main()