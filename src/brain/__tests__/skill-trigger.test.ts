import { describe, expect, it } from 'vitest'
import { SkillTriggerEngine } from '../skill-trigger'

describe('SkillTriggerEngine', () => {
  const engine = new SkillTriggerEngine('zh-CN')

  describe('Browser Triggers', () => {
    it('should detect "访问 github.com"', () => {
      const match = engine.getBestMatch('访问 github.com')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
      expect(match?.confidence).toBeGreaterThan(0.5)
      expect(match?.extractedParams?.param1).toContain('github.com')
    })

    it('should detect "打开 https://google.com"', () => {
      const match = engine.getBestMatch('打开 https://google.com')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
      expect(match?.extractedParams?.param1).toContain('google.com')
    })

    it('should detect "浏览这个网站：example.com"', () => {
      const match = engine.getBestMatch('浏览这个网站：example.com')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
    })

    it('should detect "查看 www.baidu.com"', () => {
      const match = engine.getBestMatch('查看 www.baidu.com')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
    })

    it('should detect "搜索 TypeScript 教程"', () => {
      const match = engine.getBestMatch('搜索 TypeScript 教程')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
      expect(match?.extractedParams?.param1).toContain('TypeScript')
    })

    it('should detect "google React hooks"', () => {
      const match = engine.getBestMatch('google React hooks')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
    })

    it('should detect "去 stackoverflow.com"', () => {
      const match = engine.getBestMatch('去 stackoverflow.com')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
    })

    it('should detect "open github.com"', () => {
      const match = engine.getBestMatch('open github.com')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
    })

    it('should detect "visit https://npmjs.com"', () => {
      const match = engine.getBestMatch('visit https://npmjs.com')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('browser')
    })
  })

  describe('Commit Triggers', () => {
    it('should detect "提交代码"', () => {
      const match = engine.getBestMatch('提交代码')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('commit')
    })

    it('should detect "git commit"', () => {
      const match = engine.getBestMatch('git commit')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('commit')
    })

    it('should detect "保存更改"', () => {
      const match = engine.getBestMatch('保存更改')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('commit')
    })
  })

  describe('Review Triggers', () => {
    it('should detect "审查代码"', () => {
      const match = engine.getBestMatch('审查代码')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('review')
    })

    it('should detect "code review"', () => {
      const match = engine.getBestMatch('code review')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('review')
    })

    it('should detect "检查这段代码"', () => {
      const match = engine.getBestMatch('检查这段代码')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('review')
    })
  })

  describe('Test Triggers', () => {
    it('should detect "写测试"', () => {
      const match = engine.getBestMatch('写测试')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('test')
    })

    it('should detect "添加测试"', () => {
      const match = engine.getBestMatch('添加测试')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('test')
    })

    it('should detect "test this function"', () => {
      const match = engine.getBestMatch('test this function')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('test')
    })
  })

  describe('Debug Triggers', () => {
    it('should detect "调试这个问题"', () => {
      const match = engine.getBestMatch('调试这个问题')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('debug')
    })

    it('should detect "修复这个 bug"', () => {
      const match = engine.getBestMatch('修复这个 bug')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('debug')
    })

    it('should detect "为什么不工作"', () => {
      const match = engine.getBestMatch('为什么不工作')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('debug')
    })

    it('should detect "这里报错了"', () => {
      const match = engine.getBestMatch('这里报错了')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('debug')
    })
  })

  describe('Plan Triggers', () => {
    it('should detect "规划登录功能"', () => {
      const match = engine.getBestMatch('规划登录功能')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('plan')
    })

    it('should detect "实现用户认证"', () => {
      const match = engine.getBestMatch('实现用户认证')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('plan')
    })

    it('should detect "怎么做文件上传"', () => {
      const match = engine.getBestMatch('怎么做文件上传')
      expect(match).toBeTruthy()
      expect(match?.skillName).toBe('plan')
    })
  })

  describe('Confidence Levels', () => {
    it('should have high confidence for exact pattern match', () => {
      const match = engine.getBestMatch('访问 https://github.com')
      expect(match?.confidence).toBeGreaterThan(0.7)
    })

    it('should have medium confidence for keyword match', () => {
      const match = engine.getBestMatch('我想看看 github 网站')
      expect(match?.confidence).toBeGreaterThan(0.3)
      expect(match?.confidence).toBeLessThan(0.7)
    })

    it('should return null for no match', () => {
      const match = engine.getBestMatch('今天天气真好')
      expect(match).toBeNull()
    })
  })

  describe('Auto Execute Decision', () => {
    it('should auto-execute for high confidence with params', () => {
      const match = engine.getBestMatch('访问 https://github.com')
      expect(match).toBeTruthy()
      expect(engine.shouldAutoExecute(match!)).toBe(true)
    })

    it('should not auto-execute for low confidence', () => {
      const match = engine.getBestMatch('看看 github')
      if (match) {
        expect(engine.shouldAutoExecute(match)).toBe(false)
      }
    })
  })

  describe('Multiple Matches', () => {
    it('should return multiple matches sorted by confidence', () => {
      const matches = engine.analyze('调试这个测试问题')
      expect(matches.length).toBeGreaterThan(0)
      // Should match both 'debug' and 'test'
      const skillNames = matches.map(m => m.skillName)
      expect(skillNames).toContain('debug')
    })
  })

  describe('Suggestion Generation', () => {
    it('should generate suggestion with confidence', () => {
      const match = engine.getBestMatch('访问 github.com')
      expect(match).toBeTruthy()
      const suggestion = engine.generateSuggestion(match!)
      expect(suggestion).toContain('浏览器访问和搜索')
      expect(suggestion).toContain('置信度')
      expect(suggestion).toContain('/browser')
    })
  })

  describe('Command Generation', () => {
    it('should generate skill command with params', () => {
      const match = engine.getBestMatch('访问 https://github.com')
      expect(match).toBeTruthy()
      const command = engine.generateSkillCommand(match!)
      expect(command).toContain('/browser')
      expect(command).toContain('github.com')
    })
  })
})
