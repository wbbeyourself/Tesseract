#!/usr/bin/env python3
"""
批量并行调用 DeepSeek API 的脚本
输入：JSONL 文件，每行包含 {"input": "用户问题"}
输出：JSONL 文件，每行包含 {"input": "...", "output": "模型回复", "error": "错误信息(可选)"}
"""

import json
import argparse
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional, Any
import sys

# 尝试导入 OpenAI 库（推荐），若不存在则使用 requests
try:
    from openai import OpenAI
    USE_OPENAI_LIB = True
except ImportError:
    import requests
    USE_OPENAI_LIB = False
    print("未安装 openai 库，将使用 requests 发送 HTTP 请求。建议安装：pip install openai", file=sys.stderr)


class DeepSeekClient:
    """DeepSeek API 客户端，兼容 OpenAI 接口"""
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com/v1", model: str = "deepseek-chat"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        if USE_OPENAI_LIB:
            self.client = OpenAI(api_key=api_key, base_url=base_url)
        else:
            self.headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

    def chat_completion(self, prompt: str) -> Optional[str]:
        """发送单个 prompt，返回模型回复文本，失败返回 None"""
        try:
            if USE_OPENAI_LIB:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=4096
                )
                return response.choices[0].message.content
            else:
                url = f"{self.base_url}/chat/completions"
                payload = {
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 4096
                }
                resp = requests.post(url, headers=self.headers, json=payload, timeout=60)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"请求失败: {e}", file=sys.stderr)
            return None


def process_single_item(item: Dict[str, Any], client: DeepSeekClient) -> Dict[str, Any]:
    """处理单条 JSON 对象，返回带 output 或 error 的结果"""
    input_text = item.get("input", "")
    if not input_text:
        return {**item, "error": "缺少 input 字段或值为空", "output": None}
    
    output = client.chat_completion(input_text)
    result = {**item, "output": output}
    if output is None:
        result["error"] = "模型调用失败"
    return result


def read_jsonl(input_file: str) -> List[Dict]:
    """读取 JSONL 文件，返回字典列表"""
    data = []
    with open(input_file, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                data.append(obj)
            except json.JSONDecodeError as e:
                print(f"警告: 第 {line_num} 行 JSON 解析失败: {e}", file=sys.stderr)
    return data


def write_jsonl(output_file: str, results: List[Dict]):
    """将结果列表写入 JSONL 文件"""
    with open(output_file, "w", encoding="utf-8") as f:
        for obj in results:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description="批量并行调用 DeepSeek API")
    parser.add_argument("--input", "-i", required=True, help="输入 JSONL 文件路径")
    parser.add_argument("--output", "-o", required=True, help="输出 JSONL 文件路径")
    parser.add_argument("--api-key", "-k", help="DeepSeek API Key，也可通过环境变量 DEEPSEEK_API_KEY 设置")
    parser.add_argument("--model", "-m", default="deepseek-v4-flash", 
                        help="模型名称，例如 deepseek-chat, deepseek-reasoner，或您说的 DeepSeek-V4-Flash"
                             "（实际模型名请参考 DeepSeek 官方文档）")
    parser.add_argument("--base-url", default="https://api.deepseek.com/v1", help="API Base URL")
    parser.add_argument("--max-workers", "-w", type=int, default=5, help="最大并发线程数，默认 5")
    parser.add_argument("--preserve-order", action="store_true", default=True,
                        help="保持输入顺序输出 (默认开启，关闭则按完成顺序输出)")
    parser.add_argument("--no-preserve-order", dest="preserve_order", action="store_false",
                        help="不保持顺序，按完成顺序输出")
    args = parser.parse_args()

    # 获取 API Key
    api_key = args.api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("错误: 未提供 API Key。请通过 --api-key 参数或环境变量 DEEPSEEK_API_KEY 设置", file=sys.stderr)
        sys.exit(1)

    # 读取输入文件
    print(f"读取输入文件: {args.input}")
    items = read_jsonl(args.input)
    if not items:
        print("输入文件无有效数据，退出", file=sys.stderr)
        sys.exit(0)
    print(f"共读取 {len(items)} 条数据")

    # 初始化客户端
    client = DeepSeekClient(api_key=api_key, base_url=args.base_url, model=args.model)

    # 并发处理
    results = [None] * len(items) if args.preserve_order else []
    completed = 0
    with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        future_to_index = {}
        for idx, item in enumerate(items):
            future = executor.submit(process_single_item, item, client)
            future_to_index[future] = idx

        for future in as_completed(future_to_index):
            idx = future_to_index[future]
            try:
                result = future.result()
            except Exception as e:
                # 理论上 process_single_item 已捕获异常，这里做兜底
                result = {**items[idx], "error": f"处理异常: {e}", "output": None}
            if args.preserve_order:
                results[idx] = result
            else:
                results.append(result)
            completed += 1
            if completed % 10 == 0 or completed == len(items):
                print(f"进度: {completed}/{len(items)}")

    # 确保顺序模式下没有 None（理论上不会）
    if args.preserve_order:
        if any(r is None for r in results):
            print("警告: 部分结果未正确填充", file=sys.stderr)

    # 写入输出文件
    print(f"写入输出文件: {args.output}")
    write_jsonl(args.output, results if args.preserve_order else results)
    print("完成")


if __name__ == "__main__":
    main()