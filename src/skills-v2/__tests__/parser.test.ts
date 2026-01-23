/**
 * Tests for the DSL Parser
 */

import { describe, it, expect } from 'vitest';
import { Parser, createSkill } from '../parser.js';
import { ERROR_HANDLING_PROTOCOL } from '../examples.js';

describe('Parser', () => {
  it('should parse a basic protocol', () => {
    const dsl = JSON.stringify({
      name: "Test Protocol",
      coreQuestion: "What is this test?",
      layers: [],
      traces: [],
      references: {}
    });

    const parser = new Parser(dsl);
    const ast = parser.parse();

    expect(ast.type).toBe('protocol');
    expect(ast.name).toBe('Test Protocol');
    expect(ast.coreQuestion).toBe('What is this test?');
    expect(ast.layers).toHaveLength(0);
    expect(ast.traces).toHaveLength(0);
  });

  it('should parse a protocol with layers', () => {
    const dsl = JSON.stringify({
      name: "Error Handling",
      coreQuestion: "How to handle errors?",
      layers: [
        {
          layer: "L1",
          transforms: [
            { from: "throw", to: "Result" }
          ]
        },
        {
          layer: "L2",
          patterns: [
            { name: "Result Type" }
          ]
        },
        {
          layer: "L3",
          constraints: [
            { condition: "Must be valid" }
          ]
        }
      ],
      traces: [],
      references: {}
    });

    const parser = new Parser(dsl);
    const ast = parser.parse();

    expect(ast.layers).toHaveLength(3);
    expect(ast.layers[0].layer).toBe('L1');
    expect(ast.layers[1].layer).toBe('L2');
    expect(ast.layers[2].layer).toBe('L3');
  });

  it('should parse constraints with validation and message', () => {
    const dsl = JSON.stringify({
      name: "Test",
      coreQuestion: "Test",
      layers: [
        {
          layer: "L3",
          constraints: [
            {
              condition: "Must be valid",
              validation: "isValid(x)",
              message: "Value must pass validation"
            }
          ]
        }
      ],
      traces: [],
      references: {}
    });

    const parser = new Parser(dsl);
    const ast = parser.parse();

    const l3Layer = ast.layers[0];
    expect(l3Layer.constraints).toHaveLength(1);
    expect(l3Layer.constraints[0].condition).toBe('Must be valid');
    expect(l3Layer.constraints[0].validation).toBe('isValid(x)');
    expect(l3Layer.constraints[0].errorMessage).toBe('Value must pass validation');
  });

  it('should parse patterns with examples', () => {
    const dsl = JSON.stringify({
      name: "Test",
      coreQuestion: "Test",
      layers: [
        {
          layer: "L2",
          patterns: [
            {
              name: "Factory",
              implementation: "Use factory method pattern",
              examples: ["createUser()", "createProduct()"]
            }
          ]
        }
      ],
      traces: [],
      references: {}
    });

    const parser = new Parser(dsl);
    const ast = parser.parse();

    const l2Layer = ast.layers[0];
    expect(l2Layer.patterns).toHaveLength(1);
    expect(l2Layer.patterns[0].pattern).toBe('Factory');
    expect(l2Layer.patterns[0].implementation).toBe('Use factory method pattern');
    expect(l2Layer.patterns[0].examples).toEqual(['createUser()', 'createProduct()']);
  });

  it('should parse traces', () => {
    const dsl = JSON.stringify({
      name: "Test",
      coreQuestion: "Test",
      layers: [],
      traces: [
        {
          direction: "up",
          steps: ["Step 1", "Step 2", "Step 3"]
        },
        {
          direction: "down",
          steps: ["Step A", "Step B"]
        }
      ],
      references: {}
    });

    const parser = new Parser(dsl);
    const ast = parser.parse();

    expect(ast.traces).toHaveLength(2);
    expect(ast.traces[0].direction).toBe('up');
    expect(ast.traces[0].steps).toEqual(['Step 1', 'Step 2', 'Step 3']);
    expect(ast.traces[1].direction).toBe('down');
    expect(ast.traces[1].steps).toEqual(['Step A', 'Step B']);
  });

  it('should parse references', () => {
    const dsl = JSON.stringify({
      name: "Test",
      coreQuestion: "Test",
      layers: [],
      traces: [],
      references: {
        "doc1": "https://example.com/doc1",
        "doc2": "https://example.com/doc2"
      }
    });

    const parser = new Parser(dsl);
    const ast = parser.parse();

    expect(ast.references).toHaveLength(2);
    expect(ast.references[0].value).toBe('https://example.com/doc1');
    expect(ast.references[1].value).toBe('https://example.com/doc2');
  });

  it('should handle syntax errors gracefully', () => {
    const dsl = '{ invalid json }';

    const parser = new Parser(dsl);
    expect(() => parser.parse()).toThrow();
  });

  it('should create skill from AST', () => {
    const dsl = JSON.stringify({
      name: "Test Skill",
      coreQuestion: "What is this?",
      layers: [
        {
          layer: "L2",
          patterns: []
        }
      ],
      traces: [],
      references: {}
    });

    const parser = new Parser(dsl);
    const ast = parser.parse();
    const skill = createSkill(ast, dsl);

    expect(skill.metadata.id).toBe('test-skill');
    expect(skill.metadata.name).toBe('Test Skill');
    expect(skill.protocol.coreQuestion).toBe('What is this?');
    expect(skill.source).toBe(dsl);
  });

  it('should parse the error handling protocol example', () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL);
    const ast = parser.parse();

    expect(ast.name).toBe('Error Handling');
    expect(ast.coreQuestion).toBe('How should errors be handled in this context?');
    expect(ast.layers).toHaveLength(3);
    expect(ast.traces).toHaveLength(2);
    expect(ast.references).toHaveLength(2);
  });
});