# TED 英语学习 SOP - 测试指南 / Testing Guide

## 快速测试 / Quick Test

### 方法 1: 使用示例文件测试 / Test with Sample Files

最简单的测试方法：

```bash
# 基础测试 - 生成学习包
python3 ted_cli.py -i sample_transcript.txt -o my_test_package.md

# 查看生成的文件
cat my_test_package.md
```

### 方法 2: 命令行工具测试 / CLI Tool Test

测试不同的参数配置：

```bash
# CET-4 水平测试
python3 ted_cli.py -i sample_transcript.txt -o test_cet4.md --level B1 --vocab 5000

# CET-6 水平测试
python3 ted_cli.py -i sample_transcript.txt -o test_cet6.md --level B2 --vocab 8000

# 雅思/托福水平测试
python3 ted_cli.py -i sample_transcript.txt -o test_ielts.md --level C1 --vocab 12000

# 指定学习目标
python3 ted_cli.py -i sample_transcript.txt -o test_goals.md --goals listening speaking

# 纯英文输出
python3 ted_cli.py -i sample_transcript.txt -o test_english.md --lang english_only
```

### 方法 3: Python API 测试 / Python API Test

创建测试脚本 `test_system.py`:

```python
#!/usr/bin/env python3
from ted_learning_sop import TEDTranscriptProcessor, LearnerProfile

# 配置学习者信息
profile = LearnerProfile(
    level="B2 (CET-6 / IELTS 6-6.5)",
    vocabulary_size=8000,
    goals=["listening", "speaking", "vocabulary"],
    output_language="bilingual",
    subtitle_format="plain_text",
    output_style="complete"
)

# 读取字幕
with open("sample_transcript.txt", "r") as f:
    transcript = f.read()

# 处理并生成
processor = TEDTranscriptProcessor(profile)
output = processor.generate_markdown_output(transcript)

# 保存结果
with open("api_test_output.md", "w") as f:
    f.write(output)

print("✓ 测试成功！生成了 api_test_output.md")
```

运行测试：
```bash
python3 test_system.py
```

## 完整功能测试 / Full Functionality Test

### 测试 1: 模块导入测试

```bash
python3 -c "
from ted_learning_sop import TEDTranscriptProcessor, LearnerProfile
from ted_material_library import MaterialLibrary
print('✓ 所有模块导入成功')
"
```

### 测试 2: 材料库测试

```bash
python3 -c "
from ted_material_library import MaterialLibrary

# 创建材料库
lib = MaterialLibrary('test_library.json')

# 添加 TED 演讲
lib.add_url('https://www.ted.com/talks/example', 'Test Talk', '测试演讲')

# 列出所有材料
print(lib.list_materials())

# 清理
import os
os.remove('test_library.json')
print('\n✓ 材料库测试成功')
"
```

### 测试 3: 命令行帮助测试

```bash
# 查看所有可用选项
python3 ted_cli.py --help
```

### 测试 4: 输出结构验证

```bash
python3 -c "
# 生成测试输出
import subprocess
subprocess.run(['python3', 'ted_cli.py', '-i', 'sample_transcript.txt', '-o', 'validation_test.md'], check=True)

# 验证结构
with open('validation_test.md', 'r') as f:
    content = f.read()

sections = [
    '# 0. Parameter Echo',
    '# 1. Content Overview',
    '# 2. Core Vocabulary',
    '# 3. High-Frequency Phrases',
    '# 4. Grammar',
    '# 5. Listening Training',
    '# 6. Speaking & Writing',
    '# 7. Extended Scenarios',
    '# 8. Shadowing',
    '# 9. Review Kit'
]

missing = [s for s in sections if s not in content]
if missing:
    print(f'✗ 缺少章节: {missing}')
else:
    print('✓ 所有 9 个章节都存在')
    print('✓ 输出结构验证成功')

# 清理
import os
os.remove('validation_test.md')
"
```

### 测试 5: 不同难度级别测试

```bash
# 创建批量测试脚本
cat > batch_test.sh << 'EOF'
#!/bin/bash
echo "批量测试不同难度级别..."

levels=("A1" "A2" "B1" "B2" "C1" "C2")
vocabs=(1500 2000 5000 8000 12000 15000)

for i in "${!levels[@]}"; do
    level="${levels[$i]}"
    vocab="${vocabs[$i]}"
    echo "测试级别 $level (词汇量: $vocab)..."
    python3 ted_cli.py -i sample_transcript.txt -o "test_${level}.md" --level "$level" --vocab "$vocab" 2>&1 | grep -q "successfully"
    if [ $? -eq 0 ]; then
        echo "  ✓ $level 测试通过"
        rm "test_${level}.md"
    else
        echo "  ✗ $level 测试失败"
    fi
done

echo "完成！"
EOF

chmod +x batch_test.sh
./batch_test.sh
```

## 实际使用测试 / Real-World Usage Test

### 步骤 1: 准备真实的 TED 字幕

1. 访问 TED.com 找一个演讲
2. 点击 "Transcript" 获取字幕
3. 复制并保存为 `my_ted_talk.txt`

### 步骤 2: 生成学习包

```bash
python3 ted_cli.py -i my_ted_talk.txt -o my_learning_package.md --level B2 --vocab 8000
```

### 步骤 3: 验证输出

打开 `my_learning_package.md` 检查：

- [ ] 参数回显部分显示正确
- [ ] 内容总览有简单和自然两个版本
- [ ] 词汇表包含 IPA、词性、释义、搭配
- [ ] 短语表有 Simple/Natural/Stretch 三个难度
- [ ] 听力练习有答案折叠块
- [ ] 口语卡片有评分标准
- [ ] 对话有 12-16 轮对话
- [ ] 跟读脚本有停顿和重读标记
- [ ] Anki 卡片表格格式正确
- [ ] 7 天学习计划完整

## 性能测试 / Performance Test

```bash
# 测试处理时间
time python3 ted_cli.py -i sample_transcript.txt -o perf_test.md

# 应该在 5 秒内完成
```

## 错误处理测试 / Error Handling Test

```bash
# 测试不存在的文件
python3 ted_cli.py -i nonexistent.txt -o output.md
# 应该显示错误信息

# 测试无效的级别
python3 ted_cli.py -i sample_transcript.txt -o output.md --level X1
# 应该显示有效选项

# 测试无效的词汇量
python3 ted_cli.py -i sample_transcript.txt -o output.md --vocab abc
# 应该显示错误
```

## 集成测试脚本 / Integration Test Script

创建完整的测试套件 `run_all_tests.py`:

```python
#!/usr/bin/env python3
"""完整的系统测试套件"""

import os
import sys
import subprocess
from pathlib import Path

def test_imports():
    """测试模块导入"""
    print("测试 1: 模块导入...", end=" ")
    try:
        from ted_learning_sop import TEDTranscriptProcessor, LearnerProfile
        from ted_material_library import MaterialLibrary
        print("✓ 通过")
        return True
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_cli_help():
    """测试命令行帮助"""
    print("测试 2: CLI 帮助...", end=" ")
    try:
        result = subprocess.run(
            ["python3", "ted_cli.py", "--help"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and "usage:" in result.stdout:
            print("✓ 通过")
            return True
        else:
            print("✗ 失败")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_sample_processing():
    """测试示例文件处理"""
    print("测试 3: 示例处理...", end=" ")
    try:
        result = subprocess.run(
            ["python3", "ted_cli.py", "-i", "sample_transcript.txt", "-o", "test_output.md"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0 and Path("test_output.md").exists():
            # 验证输出
            with open("test_output.md", "r") as f:
                content = f.read()
            if "# 0. Parameter Echo" in content and "# 9. Review Kit" in content:
                print("✓ 通过")
                os.remove("test_output.md")
                return True
        print("✗ 失败")
        return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_material_library():
    """测试材料库"""
    print("测试 4: 材料库...", end=" ")
    try:
        from ted_material_library import MaterialLibrary
        lib = MaterialLibrary("test_lib.json")
        lib.add_url("test_url", "Test Title", "Test Desc")
        materials = lib.get_all_materials()
        os.remove("test_lib.json")
        if len(materials) > 0:
            print("✓ 通过")
            return True
        else:
            print("✗ 失败")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_different_levels():
    """测试不同难度级别"""
    print("测试 5: 多级别处理...", end=" ")
    try:
        levels = ["B1", "B2", "C1"]
        for level in levels:
            result = subprocess.run(
                ["python3", "ted_cli.py", "-i", "sample_transcript.txt", 
                 "-o", f"test_{level}.md", "--level", level],
                capture_output=True,
                timeout=30
            )
            if result.returncode != 0:
                print(f"✗ 失败 (级别 {level})")
                return False
            os.remove(f"test_{level}.md")
        print("✓ 通过")
        return True
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def main():
    print("=" * 50)
    print("TED 英语学习 SOP - 系统测试")
    print("=" * 50)
    print()
    
    tests = [
        test_imports,
        test_cli_help,
        test_sample_processing,
        test_material_library,
        test_different_levels
    ]
    
    results = [test() for test in tests]
    
    print()
    print("=" * 50)
    passed = sum(results)
    total = len(results)
    print(f"测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("✓ 所有测试通过！系统正常工作。")
        return 0
    else:
        print("✗ 部分测试失败。请检查错误信息。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

运行完整测试：
```bash
python3 run_all_tests.py
```

## 预期输出示例 / Expected Output Example

成功的测试应该看到：

```
==================================================
TED 英语学习 SOP - 系统测试
==================================================

测试 1: 模块导入... ✓ 通过
测试 2: CLI 帮助... ✓ 通过
测试 3: 示例处理... ✓ 通过
测试 4: 材料库... ✓ 通过
测试 5: 多级别处理... ✓ 通过

==================================================
测试结果: 5/5 通过
✓ 所有测试通过！系统正常工作。
```

## 常见问题 / Troubleshooting

### 问题 1: ModuleNotFoundError
```bash
# 确保在正确的目录
cd /path/to/Baggio200cn
python3 ted_cli.py -i sample_transcript.txt -o output.md
```

### 问题 2: 输出文件为空
```bash
# 检查输入文件
cat sample_transcript.txt

# 使用详细输出
python3 ted_cli.py -i sample_transcript.txt -o output.md 2>&1
```

### 问题 3: 权限错误
```bash
# 确保文件可执行
chmod +x ted_cli.py

# 或使用 python3 运行
python3 ted_cli.py --help
```

## 总结 / Summary

最简单的测试方法：

```bash
# 一行命令测试整个系统
python3 ted_cli.py -i sample_transcript.txt -o test.md && echo "✓ 测试成功！" && cat test.md | head -20
```

如需更详细的测试，请运行上面的 `run_all_tests.py` 脚本。

---

**快速开始**: `python3 ted_cli.py -i sample_transcript.txt -o my_package.md`  
**验证输出**: `cat my_package.md`  
**完整测试**: `python3 run_all_tests.py`
