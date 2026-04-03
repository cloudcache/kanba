/**
 * Formula Engine
 * Phase 5: Support for formula fields in the multi-dimensional table
 */

// =============================================================================
// Types
// =============================================================================

export type FormulaValue = string | number | boolean | Date | null | FormulaValue[];

export type FormulaResultType = 'text' | 'number' | 'date' | 'boolean' | 'array';

export interface FormulaContext {
  // Field values by field ID
  fields: Record<string, FormulaValue>;
  // Current record/task data
  record: Record<string, unknown>;
  // Related records (for rollup)
  relatedRecords?: Record<string, unknown>[];
  // Current user
  currentUser?: { id: string; email: string; name?: string };
  // Current date/time
  now: Date;
}

export interface FormulaResult {
  value: FormulaValue;
  type: FormulaResultType;
  error?: string;
}

export interface FormulaFunction {
  name: string;
  description: string;
  syntax: string;
  examples: string[];
  category: FunctionCategory;
  minArgs: number;
  maxArgs: number;
  execute: (args: FormulaValue[], context: FormulaContext) => FormulaValue;
}

export type FunctionCategory = 
  | 'text'
  | 'number'
  | 'date'
  | 'logical'
  | 'array'
  | 'lookup'
  | 'user';

// =============================================================================
// Formula Parser
// =============================================================================

interface Token {
  type: 'number' | 'string' | 'identifier' | 'operator' | 'paren' | 'comma' | 'field';
  value: string | number;
}

class FormulaLexer {
  private input: string;
  private pos: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Skip whitespace
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      // Numbers
      if (/\d/.test(char) || (char === '.' && /\d/.test(this.input[this.pos + 1]))) {
        let num = '';
        while (this.pos < this.input.length && /[\d.]/.test(this.input[this.pos])) {
          num += this.input[this.pos++];
        }
        tokens.push({ type: 'number', value: parseFloat(num) });
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        const quote = char;
        this.pos++;
        let str = '';
        while (this.pos < this.input.length && this.input[this.pos] !== quote) {
          if (this.input[this.pos] === '\\' && this.pos + 1 < this.input.length) {
            this.pos++;
          }
          str += this.input[this.pos++];
        }
        this.pos++; // Skip closing quote
        tokens.push({ type: 'string', value: str });
        continue;
      }

      // Field references {field_name}
      if (char === '{') {
        this.pos++;
        let field = '';
        while (this.pos < this.input.length && this.input[this.pos] !== '}') {
          field += this.input[this.pos++];
        }
        this.pos++; // Skip closing brace
        tokens.push({ type: 'field', value: field });
        continue;
      }

      // Identifiers (function names)
      if (/[a-zA-Z_]/.test(char)) {
        let id = '';
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
          id += this.input[this.pos++];
        }
        tokens.push({ type: 'identifier', value: id });
        continue;
      }

      // Operators
      if (/[+\-*/%<>=!&|]/.test(char)) {
        let op = char;
        this.pos++;
        // Handle two-character operators
        if (this.pos < this.input.length) {
          const next = this.input[this.pos];
          if ((char === '=' && next === '=') ||
              (char === '!' && next === '=') ||
              (char === '<' && next === '=') ||
              (char === '>' && next === '=') ||
              (char === '&' && next === '&') ||
              (char === '|' && next === '|')) {
            op += next;
            this.pos++;
          }
        }
        tokens.push({ type: 'operator', value: op });
        continue;
      }

      // Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
        this.pos++;
        continue;
      }

      // Comma
      if (char === ',') {
        tokens.push({ type: 'comma', value: char });
        this.pos++;
        continue;
      }

      // Unknown character
      throw new Error(`Unexpected character: ${char} at position ${this.pos}`);
    }

    return tokens;
  }
}

// =============================================================================
// AST Nodes
// =============================================================================

type ASTNode = 
  | { type: 'literal'; value: FormulaValue; dataType: FormulaResultType }
  | { type: 'field'; name: string }
  | { type: 'function'; name: string; args: ASTNode[] }
  | { type: 'binary'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; operator: string; operand: ASTNode };

class FormulaParser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    return this.parseExpression();
  }

  private parseExpression(): ASTNode {
    return this.parseOr();
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();

    while (this.match('operator', '||')) {
      const right = this.parseAnd();
      left = { type: 'binary', operator: '||', left, right };
    }

    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseEquality();

    while (this.match('operator', '&&')) {
      const right = this.parseEquality();
      left = { type: 'binary', operator: '&&', left, right };
    }

    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseComparison();

    while (this.matchAny('operator', ['==', '!='])) {
      const operator = this.previous().value as string;
      const right = this.parseComparison();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseTerm();

    while (this.matchAny('operator', ['<', '>', '<=', '>='])) {
      const operator = this.previous().value as string;
      const right = this.parseTerm();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  private parseTerm(): ASTNode {
    let left = this.parseFactor();

    while (this.matchAny('operator', ['+', '-'])) {
      const operator = this.previous().value as string;
      const right = this.parseFactor();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  private parseFactor(): ASTNode {
    let left = this.parseUnary();

    while (this.matchAny('operator', ['*', '/', '%'])) {
      const operator = this.previous().value as string;
      const right = this.parseUnary();
      left = { type: 'binary', operator, left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.matchAny('operator', ['-', '!'])) {
      const operator = this.previous().value as string;
      const operand = this.parseUnary();
      return { type: 'unary', operator, operand };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    // Number literal
    if (this.check('number')) {
      const token = this.advance();
      return { type: 'literal', value: token.value as number, dataType: 'number' };
    }

    // String literal
    if (this.check('string')) {
      const token = this.advance();
      return { type: 'literal', value: token.value as string, dataType: 'text' };
    }

    // Field reference
    if (this.check('field')) {
      const token = this.advance();
      return { type: 'field', name: token.value as string };
    }

    // Function call or identifier
    if (this.check('identifier')) {
      const token = this.advance();
      const name = token.value as string;

      // Check for TRUE/FALSE literals
      if (name.toUpperCase() === 'TRUE') {
        return { type: 'literal', value: true, dataType: 'boolean' };
      }
      if (name.toUpperCase() === 'FALSE') {
        return { type: 'literal', value: false, dataType: 'boolean' };
      }

      // Function call
      if (this.match('paren', '(')) {
        const args: ASTNode[] = [];
        
        if (!this.check('paren', ')')) {
          do {
            args.push(this.parseExpression());
          } while (this.match('comma', ','));
        }

        this.consume('paren', ')');
        return { type: 'function', name: name.toUpperCase(), args };
      }

      // Standalone identifier (treat as field)
      return { type: 'field', name };
    }

    // Parenthesized expression
    if (this.match('paren', '(')) {
      const expr = this.parseExpression();
      this.consume('paren', ')');
      return expr;
    }

    throw new Error(`Unexpected token at position ${this.pos}`);
  }

  private match(type: Token['type'], value?: string | number): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchAny(type: Token['type'], values: (string | number)[]): boolean {
    for (const value of values) {
      if (this.match(type, value)) {
        return true;
      }
    }
    return false;
  }

  private check(type: Token['type'], value?: string | number): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private consume(type: Token['type'], value: string | number): Token {
    if (this.check(type, value)) return this.advance();
    throw new Error(`Expected ${type} '${value}' at position ${this.pos}`);
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length;
  }
}

// =============================================================================
// Built-in Functions
// =============================================================================

const BUILTIN_FUNCTIONS: Record<string, FormulaFunction> = {
  // Text Functions
  CONCAT: {
    name: 'CONCAT',
    description: 'Concatenates multiple text values',
    syntax: 'CONCAT(text1, text2, ...)',
    examples: ['CONCAT("Hello", " ", "World")'],
    category: 'text',
    minArgs: 1,
    maxArgs: Infinity,
    execute: (args) => args.map(String).join(''),
  },
  UPPER: {
    name: 'UPPER',
    description: 'Converts text to uppercase',
    syntax: 'UPPER(text)',
    examples: ['UPPER("hello")'],
    category: 'text',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => String(args[0] || '').toUpperCase(),
  },
  LOWER: {
    name: 'LOWER',
    description: 'Converts text to lowercase',
    syntax: 'LOWER(text)',
    examples: ['LOWER("HELLO")'],
    category: 'text',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => String(args[0] || '').toLowerCase(),
  },
  LEN: {
    name: 'LEN',
    description: 'Returns the length of text',
    syntax: 'LEN(text)',
    examples: ['LEN("Hello")'],
    category: 'text',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => String(args[0] || '').length,
  },
  TRIM: {
    name: 'TRIM',
    description: 'Removes leading and trailing whitespace',
    syntax: 'TRIM(text)',
    examples: ['TRIM("  hello  ")'],
    category: 'text',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => String(args[0] || '').trim(),
  },
  LEFT: {
    name: 'LEFT',
    description: 'Returns the leftmost characters',
    syntax: 'LEFT(text, count)',
    examples: ['LEFT("Hello", 2)'],
    category: 'text',
    minArgs: 2,
    maxArgs: 2,
    execute: (args) => String(args[0] || '').slice(0, Number(args[1]) || 0),
  },
  RIGHT: {
    name: 'RIGHT',
    description: 'Returns the rightmost characters',
    syntax: 'RIGHT(text, count)',
    examples: ['RIGHT("Hello", 2)'],
    category: 'text',
    minArgs: 2,
    maxArgs: 2,
    execute: (args) => {
      const str = String(args[0] || '');
      const count = Number(args[1]) || 0;
      return str.slice(-count);
    },
  },
  SUBSTITUTE: {
    name: 'SUBSTITUTE',
    description: 'Replaces text with new text',
    syntax: 'SUBSTITUTE(text, old_text, new_text)',
    examples: ['SUBSTITUTE("Hello World", "World", "Universe")'],
    category: 'text',
    minArgs: 3,
    maxArgs: 3,
    execute: (args) => String(args[0] || '').replace(new RegExp(String(args[1]), 'g'), String(args[2])),
  },

  // Number Functions
  SUM: {
    name: 'SUM',
    description: 'Adds all numbers',
    syntax: 'SUM(number1, number2, ...)',
    examples: ['SUM(1, 2, 3)'],
    category: 'number',
    minArgs: 1,
    maxArgs: Infinity,
    execute: (args) => {
      const flatten = (arr: FormulaValue[]): number[] => {
        return arr.flatMap(v => Array.isArray(v) ? flatten(v) : Number(v) || 0);
      };
      return flatten(args).reduce((a, b) => a + b, 0);
    },
  },
  AVERAGE: {
    name: 'AVERAGE',
    description: 'Returns the average of numbers',
    syntax: 'AVERAGE(number1, number2, ...)',
    examples: ['AVERAGE(1, 2, 3)'],
    category: 'number',
    minArgs: 1,
    maxArgs: Infinity,
    execute: (args) => {
      const flatten = (arr: FormulaValue[]): number[] => {
        return arr.flatMap(v => Array.isArray(v) ? flatten(v) : Number(v) || 0);
      };
      const nums = flatten(args);
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    },
  },
  MIN: {
    name: 'MIN',
    description: 'Returns the minimum value',
    syntax: 'MIN(number1, number2, ...)',
    examples: ['MIN(1, 2, 3)'],
    category: 'number',
    minArgs: 1,
    maxArgs: Infinity,
    execute: (args) => {
      const flatten = (arr: FormulaValue[]): number[] => {
        return arr.flatMap(v => Array.isArray(v) ? flatten(v) : Number(v) || 0);
      };
      return Math.min(...flatten(args));
    },
  },
  MAX: {
    name: 'MAX',
    description: 'Returns the maximum value',
    syntax: 'MAX(number1, number2, ...)',
    examples: ['MAX(1, 2, 3)'],
    category: 'number',
    minArgs: 1,
    maxArgs: Infinity,
    execute: (args) => {
      const flatten = (arr: FormulaValue[]): number[] => {
        return arr.flatMap(v => Array.isArray(v) ? flatten(v) : Number(v) || 0);
      };
      return Math.max(...flatten(args));
    },
  },
  ROUND: {
    name: 'ROUND',
    description: 'Rounds a number to specified decimal places',
    syntax: 'ROUND(number, decimals)',
    examples: ['ROUND(3.14159, 2)'],
    category: 'number',
    minArgs: 1,
    maxArgs: 2,
    execute: (args) => {
      const num = Number(args[0]) || 0;
      const decimals = Number(args[1]) || 0;
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },
  },
  FLOOR: {
    name: 'FLOOR',
    description: 'Rounds down to the nearest integer',
    syntax: 'FLOOR(number)',
    examples: ['FLOOR(3.7)'],
    category: 'number',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => Math.floor(Number(args[0]) || 0),
  },
  CEIL: {
    name: 'CEIL',
    description: 'Rounds up to the nearest integer',
    syntax: 'CEIL(number)',
    examples: ['CEIL(3.2)'],
    category: 'number',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => Math.ceil(Number(args[0]) || 0),
  },
  ABS: {
    name: 'ABS',
    description: 'Returns the absolute value',
    syntax: 'ABS(number)',
    examples: ['ABS(-5)'],
    category: 'number',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => Math.abs(Number(args[0]) || 0),
  },

  // Date Functions
  NOW: {
    name: 'NOW',
    description: 'Returns the current date and time',
    syntax: 'NOW()',
    examples: ['NOW()'],
    category: 'date',
    minArgs: 0,
    maxArgs: 0,
    execute: (_, context) => context.now,
  },
  TODAY: {
    name: 'TODAY',
    description: 'Returns the current date',
    syntax: 'TODAY()',
    examples: ['TODAY()'],
    category: 'date',
    minArgs: 0,
    maxArgs: 0,
    execute: (_, context) => {
      const d = new Date(context.now);
      d.setHours(0, 0, 0, 0);
      return d;
    },
  },
  DATEADD: {
    name: 'DATEADD',
    description: 'Adds a number of units to a date',
    syntax: 'DATEADD(date, count, unit)',
    examples: ['DATEADD(TODAY(), 7, "days")'],
    category: 'date',
    minArgs: 3,
    maxArgs: 3,
    execute: (args) => {
      const date = new Date(args[0] as Date);
      const count = Number(args[1]) || 0;
      const unit = String(args[2]).toLowerCase();

      switch (unit) {
        case 'days':
        case 'day':
          date.setDate(date.getDate() + count);
          break;
        case 'weeks':
        case 'week':
          date.setDate(date.getDate() + count * 7);
          break;
        case 'months':
        case 'month':
          date.setMonth(date.getMonth() + count);
          break;
        case 'years':
        case 'year':
          date.setFullYear(date.getFullYear() + count);
          break;
      }

      return date;
    },
  },
  DATEDIFF: {
    name: 'DATEDIFF',
    description: 'Returns the difference between two dates',
    syntax: 'DATEDIFF(date1, date2, unit)',
    examples: ['DATEDIFF({due_date}, TODAY(), "days")'],
    category: 'date',
    minArgs: 3,
    maxArgs: 3,
    execute: (args) => {
      const date1 = new Date(args[0] as Date);
      const date2 = new Date(args[1] as Date);
      const unit = String(args[2]).toLowerCase();
      const diffMs = date1.getTime() - date2.getTime();

      switch (unit) {
        case 'days':
        case 'day':
          return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        case 'weeks':
        case 'week':
          return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
        case 'months':
        case 'month':
          return (date1.getFullYear() - date2.getFullYear()) * 12 + (date1.getMonth() - date2.getMonth());
        case 'years':
        case 'year':
          return date1.getFullYear() - date2.getFullYear();
        default:
          return diffMs;
      }
    },
  },
  YEAR: {
    name: 'YEAR',
    description: 'Returns the year of a date',
    syntax: 'YEAR(date)',
    examples: ['YEAR(TODAY())'],
    category: 'date',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => new Date(args[0] as Date).getFullYear(),
  },
  MONTH: {
    name: 'MONTH',
    description: 'Returns the month of a date (1-12)',
    syntax: 'MONTH(date)',
    examples: ['MONTH(TODAY())'],
    category: 'date',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => new Date(args[0] as Date).getMonth() + 1,
  },
  DAY: {
    name: 'DAY',
    description: 'Returns the day of a date',
    syntax: 'DAY(date)',
    examples: ['DAY(TODAY())'],
    category: 'date',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => new Date(args[0] as Date).getDate(),
  },

  // Logical Functions
  IF: {
    name: 'IF',
    description: 'Returns one value if condition is true, another if false',
    syntax: 'IF(condition, value_if_true, value_if_false)',
    examples: ['IF({priority} == "high", "Urgent", "Normal")'],
    category: 'logical',
    minArgs: 3,
    maxArgs: 3,
    execute: (args) => args[0] ? args[1] : args[2],
  },
  AND: {
    name: 'AND',
    description: 'Returns true if all arguments are true',
    syntax: 'AND(condition1, condition2, ...)',
    examples: ['AND({is_done}, {priority} == "high")'],
    category: 'logical',
    minArgs: 1,
    maxArgs: Infinity,
    execute: (args) => args.every(Boolean),
  },
  OR: {
    name: 'OR',
    description: 'Returns true if any argument is true',
    syntax: 'OR(condition1, condition2, ...)',
    examples: ['OR({is_done}, {priority} == "low")'],
    category: 'logical',
    minArgs: 1,
    maxArgs: Infinity,
    execute: (args) => args.some(Boolean),
  },
  NOT: {
    name: 'NOT',
    description: 'Returns the opposite of a boolean value',
    syntax: 'NOT(value)',
    examples: ['NOT({is_done})'],
    category: 'logical',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => !args[0],
  },
  BLANK: {
    name: 'BLANK',
    description: 'Checks if a value is blank/empty',
    syntax: 'BLANK(value)',
    examples: ['BLANK({description})'],
    category: 'logical',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => args[0] === null || args[0] === undefined || args[0] === '',
  },

  // Array/Rollup Functions
  COUNT: {
    name: 'COUNT',
    description: 'Counts the number of items',
    syntax: 'COUNT(array)',
    examples: ['COUNT({subtasks})'],
    category: 'array',
    minArgs: 1,
    maxArgs: 1,
    execute: (args) => Array.isArray(args[0]) ? args[0].length : (args[0] ? 1 : 0),
  },
  COUNTA: {
    name: 'COUNTA',
    description: 'Counts non-empty values',
    syntax: 'COUNTA(array)',
    examples: ['COUNTA({values})'],
    category: 'array',
    minArgs: 1,
    maxArgs: Infinity,
    execute: (args) => {
      const flatten = (arr: FormulaValue[]): FormulaValue[] => {
        return arr.flatMap(v => Array.isArray(v) ? flatten(v) : v);
      };
      return flatten(args).filter(v => v !== null && v !== undefined && v !== '').length;
    },
  },
};

// =============================================================================
// Formula Evaluator
// =============================================================================

class FormulaEvaluator {
  private context: FormulaContext;

  constructor(context: FormulaContext) {
    this.context = context;
  }

  evaluate(node: ASTNode): FormulaValue {
    switch (node.type) {
      case 'literal':
        return node.value;

      case 'field':
        return this.context.fields[node.name] ?? this.context.record[node.name] ?? null;

      case 'function':
        return this.evaluateFunction(node.name, node.args);

      case 'binary':
        return this.evaluateBinary(node.operator, node.left, node.right);

      case 'unary':
        return this.evaluateUnary(node.operator, node.operand);

      default:
        throw new Error(`Unknown node type`);
    }
  }

  private evaluateFunction(name: string, argNodes: ASTNode[]): FormulaValue {
    const func = BUILTIN_FUNCTIONS[name];
    if (!func) {
      throw new Error(`Unknown function: ${name}`);
    }

    const args = argNodes.map(arg => this.evaluate(arg));

    if (args.length < func.minArgs) {
      throw new Error(`${name} requires at least ${func.minArgs} argument(s)`);
    }
    if (args.length > func.maxArgs) {
      throw new Error(`${name} accepts at most ${func.maxArgs} argument(s)`);
    }

    return func.execute(args, this.context);
  }

  private evaluateBinary(operator: string, left: ASTNode, right: ASTNode): FormulaValue {
    const leftVal = this.evaluate(left);
    const rightVal = this.evaluate(right);

    switch (operator) {
      case '+':
        if (typeof leftVal === 'string' || typeof rightVal === 'string') {
          return String(leftVal) + String(rightVal);
        }
        return (Number(leftVal) || 0) + (Number(rightVal) || 0);
      case '-':
        return (Number(leftVal) || 0) - (Number(rightVal) || 0);
      case '*':
        return (Number(leftVal) || 0) * (Number(rightVal) || 0);
      case '/':
        const divisor = Number(rightVal) || 0;
        return divisor === 0 ? null : (Number(leftVal) || 0) / divisor;
      case '%':
        return (Number(leftVal) || 0) % (Number(rightVal) || 0);
      case '==':
        return leftVal === rightVal;
      case '!=':
        return leftVal !== rightVal;
      case '<':
        return (Number(leftVal) || 0) < (Number(rightVal) || 0);
      case '>':
        return (Number(leftVal) || 0) > (Number(rightVal) || 0);
      case '<=':
        return (Number(leftVal) || 0) <= (Number(rightVal) || 0);
      case '>=':
        return (Number(leftVal) || 0) >= (Number(rightVal) || 0);
      case '&&':
        return Boolean(leftVal) && Boolean(rightVal);
      case '||':
        return Boolean(leftVal) || Boolean(rightVal);
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  private evaluateUnary(operator: string, operand: ASTNode): FormulaValue {
    const value = this.evaluate(operand);

    switch (operator) {
      case '-':
        return -(Number(value) || 0);
      case '!':
        return !value;
      default:
        throw new Error(`Unknown unary operator: ${operator}`);
    }
  }
}

// =============================================================================
// Public API
// =============================================================================

export class FormulaEngine {
  /**
   * Evaluate a formula expression
   */
  evaluate(expression: string, context: FormulaContext): FormulaResult {
    try {
      // Tokenize
      const lexer = new FormulaLexer(expression);
      const tokens = lexer.tokenize();

      if (tokens.length === 0) {
        return { value: null, type: 'text' };
      }

      // Parse
      const parser = new FormulaParser(tokens);
      const ast = parser.parse();

      // Evaluate
      const evaluator = new FormulaEvaluator(context);
      const value = evaluator.evaluate(ast);

      // Determine result type
      const type = this.getResultType(value);

      return { value, type };
    } catch (error) {
      return {
        value: null,
        type: 'text',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate a formula expression without executing it
   */
  validate(expression: string): { valid: boolean; error?: string } {
    try {
      const lexer = new FormulaLexer(expression);
      const tokens = lexer.tokenize();
      
      if (tokens.length > 0) {
        const parser = new FormulaParser(tokens);
        parser.parse();
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all available functions
   */
  getFunctions(): FormulaFunction[] {
    return Object.values(BUILTIN_FUNCTIONS);
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category: FunctionCategory): FormulaFunction[] {
    return Object.values(BUILTIN_FUNCTIONS).filter(f => f.category === category);
  }

  private getResultType(value: FormulaValue): FormulaResultType {
    if (value === null) return 'text';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    return 'text';
  }
}

// Export singleton instance
export const formulaEngine = new FormulaEngine();
