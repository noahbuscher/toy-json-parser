/**
 * Allowed syntax in JSON
 *
 * https://www.rfc-editor.org/rfc/rfc8259#section-2
 */
const SYNTAX_TOKENS = {
  BEGIN_ARRAY: String.fromCharCode(91), // [
  BEGIN_OBJECT: String.fromCharCode(123), // {
  END_ARRAY: String.fromCharCode(93), // ]
  END_OBJECT: String.fromCharCode(125), // }
  NAME_SEPARATOR: String.fromCharCode(58), // :
  VALUE_SEPARATOR: String.fromCharCode(44), // ,
};

const QUOTATION_MARK = String.fromCharCode(34);

/**
 * Allowed whitespace characters in JSON
 *
 * https://www.rfc-editor.org/rfc/rfc8259#section-2
 */
const WHITESPACE_TOKENS = {
  SPACE: String.fromCharCode(32),
  TAB: String.fromCharCode(9),
  NEWLINE: String.fromCharCode(10),
};

const TOKEN_TYPES = {
  BOOLEAN: "BOOLEAN",
  STRING: "STRING",
  NUMBER: "NUMBER",
  SYNTAX: "SYNTAX",
};

/**
 * Types
 */
type TokenType = typeof TOKEN_TYPES[keyof typeof TOKEN_TYPES];
type TokenValue = string | boolean | number;
type Token = {
  type: TokenType;
  value: TokenValue;
};
type OutputObject = { [key: string]: any };
type OutputArray = Array<OutputObject | TokenValue>;

export default class JSONParser {
  public parse = (input: string) => {
    const tokens = this.lex(input);

    // First elem is only used by `this.parseTokens()`
    return this.parseTokens(tokens)[1];
  };

  /**
   * Splits the JSON blob into "tokens" or meaningful strings
   */
  lex = (blob: string): Token[] => {
    const chars = [...blob];
    let tokens: Token[] = [];

    while (chars.length > 0) {
      if (Object.values(WHITESPACE_TOKENS).includes(chars[0])) {
        chars.shift();
        continue;
      }

      if (Object.values(SYNTAX_TOKENS).includes(chars[0])) {
        const value = chars.shift()!;
        tokens.push({
          type: TOKEN_TYPES.SYNTAX,
          value: value,
        });
        continue;
      }

      // Entering a string
      if (chars[0] === QUOTATION_MARK) {
        // Remote first quote
        chars.shift();

        const [length, stringToken] = this.lexString(chars);

        // +1 to remove second quote
        chars.splice(0, length + 1);
        tokens.push(stringToken);
        continue;
      }

      // Entering a boolean
      if (chars[0] === "t" || chars[0] === "f") {
        const booleanToken = this.lexBoolean(chars);

        chars.splice(0, booleanToken.value.toString().length);
        tokens.push(booleanToken);
        continue;
      }

      throw new Error(`[lexer] Invalid character, "${chars[0]}", found.`);
    }

    return tokens;
  };

  /**
   * Tokenizes a string; also returns the length of the number
   * of characters consumed, as the length may be larger than the
   * initial string if there were escape chars, etc.
   */
  lexString = (chars: string[]): [number, Token] => {
    let c = [...chars];
    let length = 0;
    let str = "";

    while (true) {
      const isQuote = c[0] === QUOTATION_MARK;
      const isEscapeChar = c[0] === "\\";

      if (!isQuote && !isEscapeChar) {
        str += c[0];
        length++;
        c.shift();
      } else {
        if (!isEscapeChar) {
          break;
        }

        // Get unescaped char and jump over solidus (\)
        str += c[1];
        length += 2;
        c.splice(0, 2);
      }
    }

    return [
      length,
      {
        type: TOKEN_TYPES.STRING,
        value: str,
      },
    ];
  };

  /**
   * Tokenizes a boolean
   */
  lexBoolean = (chars: string[]): Token => {
    if (
      chars.slice(0, 4).join("") === "true" &&
      (chars[4] === SYNTAX_TOKENS.VALUE_SEPARATOR ||
        chars[4] === SYNTAX_TOKENS.END_OBJECT ||
        chars[4] === SYNTAX_TOKENS.END_ARRAY ||
        Object.values(WHITESPACE_TOKENS).includes(chars[5]))
    ) {
      return {
        type: TOKEN_TYPES.BOOLEAN,
        value: true,
      };
    }

    if (
      chars.slice(0, 5).join("") === "false" &&
      (chars[5] === SYNTAX_TOKENS.VALUE_SEPARATOR ||
        chars[5] === SYNTAX_TOKENS.END_OBJECT ||
        chars[5] === SYNTAX_TOKENS.END_ARRAY ||
        Object.values(WHITESPACE_TOKENS).includes(chars[5]))
    ) {
      return {
        type: TOKEN_TYPES.BOOLEAN,
        value: false,
      };
    }

    throw new Error(`[lexer.boolean] Unknown boolean value.`);
  };

  /**
   * Parses an array of Tokens, building up and returning an object
   */
  parseTokens = (
    tokens: Token[]
  ): [Token[], OutputObject | OutputArray | TokenValue] => {
    if (tokens[0].value === SYNTAX_TOKENS.BEGIN_OBJECT) {
      return this.parseObject(tokens.slice(1));
    } else if (tokens[0].value === SYNTAX_TOKENS.BEGIN_ARRAY) {
      return this.parseArray(tokens.slice(1));
    } else {
      // If not an array or object, the token must be a value
      return [tokens.slice(1), tokens[0].value];
    }
  };

  /**
   * Parses an object
   */
  parseObject = (tokens: Token[]): [Token[], OutputObject] => {
    const output: OutputObject = {};
    let t: Token[] = [...tokens];

    while (true) {
      if (t[0].type !== TOKEN_TYPES.STRING) break;
      const objectKey = t.shift()!;

      // Ensure trailing name seperator (:) and shift
      if (t[0].value !== SYNTAX_TOKENS.NAME_SEPARATOR) {
        throw new Error(
          `[parser.object] Invalid character, "${t[0]}", found. Expected "${SYNTAX_TOKENS.NAME_SEPARATOR}".`
        );
      }
      t.shift();

      const [outputTokens, objectValue] = this.parseTokens(t);
      output[objectKey.value.toString()] = objectValue;
      t = outputTokens;

      if (t[0].value === SYNTAX_TOKENS.VALUE_SEPARATOR) {
        if (t[1].value === SYNTAX_TOKENS.END_OBJECT)
          throw new Error(`[parser.object] No trailing commas allowed.`);

        t.shift();
      }

      if (t[0].value === SYNTAX_TOKENS.END_OBJECT) return [t.slice(1), output];
    }

    throw new Error(
      `[parser.object] Missing expected "${SYNTAX_TOKENS.END_OBJECT}".`
    );
  };

  /**
   * Parses an array
   */
  parseArray = (tokens: Token[]): [Token[], OutputArray] => {
    const output: OutputArray = [];
    let t: Token[] = [...tokens];

    while (true) {
      const [outputTokens, value] = this.parseTokens(t);

      if (
        !Array.isArray(value) &&
        Object.values(SYNTAX_TOKENS).includes(value as string)
      )
        break;

      output.push(value);
      t = outputTokens;

      if (!t.length) break;

      if (t[0].value === SYNTAX_TOKENS.VALUE_SEPARATOR) {
        if (t[1].value === SYNTAX_TOKENS.END_ARRAY)
          throw new Error(`[parser.array] No trailing commas allowed.`);

        t.shift();
      }

      if (t[0].value === SYNTAX_TOKENS.END_ARRAY) return [t.slice(1), output];
    }

    throw new Error(
      `[parser.array] Missing expected "${SYNTAX_TOKENS.END_ARRAY}".`
    );
  };
}
