#!/usr/bin/env python3
"""完整的系统测试套件 / Complete System Test Suite"""

import os
import sys
import subprocess
from pathlib import Path

def test_imports():
    """测试模块导入 / Test module imports"""
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
    """测试命令行帮助 / Test CLI help"""
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
    """测试示例文件处理 / Test sample file processing"""
    print("测试 3: 示例处理...", end=" ")
    try:
        result = subprocess.run(
            ["python3", "ted_cli.py", "-i", "sample_transcript.txt", "-o", "test_output.md"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0 and Path("test_output.md").exists():
            # 验证输出 / Validate output
            with open("test_output.md", "r") as f:
                content = f.read()
            
            required_sections = [
                "# 0. Parameter Echo",
                "# 1. Content Overview",
                "# 2. Core Vocabulary",
                "# 9. Review Kit"
            ]
            
            if all(section in content for section in required_sections):
                print("✓ 通过")
                os.remove("test_output.md")
                return True
        print("✗ 失败")
        if Path("test_output.md").exists():
            os.remove("test_output.md")
        return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        if Path("test_output.md").exists():
            os.remove("test_output.md")
        return False

def test_material_library():
    """测试材料库 / Test material library"""
    print("测试 4: 材料库...", end=" ")
    try:
        from ted_material_library import MaterialLibrary
        
        # 清理旧的测试文件
        if Path("test_lib.json").exists():
            os.remove("test_lib.json")
        
        lib = MaterialLibrary("test_lib.json")
        m1 = lib.add_url("https://test.com", "Test Title", "Test Description")
        materials = lib.get_all_materials()
        
        # 测试 ID 生成 - 添加第二个材料
        m2 = lib.add_url("https://test2.com", "Test 2", "Desc 2")
        
        # 移除第一个并添加新的 - ID 应该继续递增
        lib.remove_material(1)
        m3 = lib.add_url("https://test3.com", "Test 3", "Desc 3")
        
        os.remove("test_lib.json")
        
        # 验证 ID 正确递增
        if len(materials) > 0 and m1['id'] == 1 and m2['id'] == 2 and m3['id'] == 3:
            print("✓ 通过")
            return True
        else:
            print(f"✗ 失败 (ID: {m1['id']}, {m2['id']}, {m3['id']})")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        if Path("test_lib.json").exists():
            os.remove("test_lib.json")
        return False

def test_different_levels():
    """测试不同难度级别 / Test different difficulty levels"""
    print("测试 5: 多级别处理...", end=" ")
    try:
        levels = [("B1", 5000), ("B2", 8000), ("C1", 12000)]
        
        for level, vocab in levels:
            result = subprocess.run(
                ["python3", "ted_cli.py", "-i", "sample_transcript.txt", 
                 "-o", f"test_{level}.md", "--level", level, "--vocab", str(vocab)],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                print(f"✗ 失败 (级别 {level})")
                return False
            
            # 验证文件存在且不为空
            if not Path(f"test_{level}.md").exists():
                print(f"✗ 失败 (文件不存在: {level})")
                return False
            
            file_size = Path(f"test_{level}.md").stat().st_size
            if file_size < 1000:  # 至少 1KB
                print(f"✗ 失败 (文件太小: {level})")
                os.remove(f"test_{level}.md")
                return False
            
            os.remove(f"test_{level}.md")
        
        print("✓ 通过")
        return True
    except Exception as e:
        print(f"✗ 失败: {e}")
        # 清理测试文件
        for level, _ in levels:
            if Path(f"test_{level}.md").exists():
                os.remove(f"test_{level}.md")
        return False

def test_output_structure():
    """测试输出结构完整性 / Test output structure completeness"""
    print("测试 6: 输出结构...", end=" ")
    try:
        from ted_learning_sop import TEDTranscriptProcessor, LearnerProfile
        
        profile = LearnerProfile(
            level="B2",
            vocabulary_size=8000,
            goals=["listening", "speaking"],
            output_language="bilingual",
            subtitle_format="plain_text",
            output_style="complete"
        )
        
        processor = TEDTranscriptProcessor(profile)
        output = processor.generate_markdown_output("Test transcript for structure validation.")
        
        # 检查所有必需的章节
        required_sections = [
            "# 0. Parameter Echo",
            "# 1. Content Overview",
            "# 2. Core Vocabulary",
            "# 3. High-Frequency Phrases",
            "# 4. Grammar",
            "# 5. Listening Training",
            "# 6. Speaking & Writing",
            "# 7. Extended Scenarios",
            "# 8. Shadowing",
            "# 9. Review Kit"
        ]
        
        missing = [s for s in required_sections if s not in output]
        if missing:
            print(f"✗ 失败 (缺少: {missing})")
            return False
        
        print("✓ 通过")
        return True
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def main():
    """运行所有测试 / Run all tests"""
    print("=" * 60)
    print("TED 英语学习 SOP - 系统测试")
    print("TED English Learning SOP - System Test")
    print("=" * 60)
    print()
    
    # 检查必需文件
    if not Path("sample_transcript.txt").exists():
        print("✗ 错误: 找不到 sample_transcript.txt")
        print("✗ Error: sample_transcript.txt not found")
        return 1
    
    tests = [
        test_imports,
        test_cli_help,
        test_sample_processing,
        test_material_library,
        test_different_levels,
        test_output_structure
    ]
    
    results = [test() for test in tests]
    
    print()
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"测试结果 / Test Results: {passed}/{total} 通过 / Passed")
    print("=" * 60)
    
    if passed == total:
        print("✓ 所有测试通过！系统正常工作。")
        print("✓ All tests passed! System is working correctly.")
        return 0
    else:
        print("✗ 部分测试失败。请检查错误信息。")
        print("✗ Some tests failed. Please check error messages.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
