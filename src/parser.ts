/**
 * Allowed syntax in JSON
 *
 * https://www.rfc-editor.org/rfc/rfc8259#section-2
 */
const JSON_syntax = {
  LEFT_SQUARE_BRACKET: String.fromCharCode(91),
  LEFT_CURLY_BRACKET: String.fromCharCode(123),
  RIGHT_SQUARE_BRACKET: String.fromCharCode(93),
  RIGHT_CURLY_BRACKET: String.fromCharCode(125),
  NAME_SEPARATOR: String.fromCharCode(58), // Colon
  VALUE_SEPARATOR: String.fromCharCode(44), // Comma
};

const QUOTATION_MARK = String.fromCharCode(34);

/**
 * Allowed whitespace characters in JSON
 *
 * https://www.rfc-editor.org/rfc/rfc8259#section-2
 */
const JSON_whitespace = {
  SPACE: String.fromCharCode(32),
  TAB: String.fromCharCode(9),
  NEWLINE: String.fromCharCode(10),
};

enum token_types {
  BOOLEAN = "boolean",
  STRING = "string",
  NUMBER = "number",
  SYNTAX = "syntax",
}

/**
 * Types
 */
type TokenType = "boolean" | "string" | "number" | "syntax";
type TokenValue = string | boolean | number;
type Token = {
  type: TokenType;
  text: string;
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
   *
   * Example:
   * Input: `{ "name": "John" }`   ->   Output: ["{", "name", ":", "John", "}"]
   */
  lex = (blob: string): Token[] => {
    const chars = blob.split("");
    let tokens: Token[] = [];

    while (chars.length > 0) {
      if (Object.values(JSON_whitespace).includes(chars[0])) {
        chars.shift();
        continue;
      }

      if (Object.values(JSON_syntax).includes(chars[0])) {
        const value = chars.shift()!;
        tokens.push({
          type: token_types.SYNTAX,
          text: value,
          value: value,
        });
        continue;
      }

      // Entering a string
      if (chars[0] === QUOTATION_MARK) {
        // Remote first quote
        chars.shift();
        const stringToken = this.lexString(chars);

        // +1 to remove second quote
        chars.splice(0, stringToken.text.length + 1);
        tokens.push(stringToken);
        continue;
      }

      // Entering a boolean
      if (chars[0] === "t" || chars[0] === "f") {
        const booleanToken = this.lexBoolean(chars);

        chars.splice(0, booleanToken.text.length);
        tokens.push(booleanToken);
        continue;
      }

      // @todo Parse numbers

      throw new Error(`[lexer] Invalid character, "${chars[0]}", found.`);
    }

    return tokens;
  };

  /**
   * Tokenizes a string
   *
   * Example:
   * Input: `name": "Noah" }`   ->   Output: "name"
   */
  lexString = (chars: string[]): Token => {
    let str = "";

    while (true) {
      if (chars[str.length] !== QUOTATION_MARK) {
        str += chars[str.length];
      } else {
        break;
      }
    }

    return {
      type: token_types.STRING,
      text: str,
      value: str,
    };
  };

  /**
   * Tokenizes a boolean
   *
   * Example:
   * Input: `isActive": "Noah" }`   ->   Output: true
   */
  lexBoolean = (chars: string[]): Token => {
    // Here we "peek" ahead to see if the boolean is followed by a comma
    if (
      chars.slice(0, 4).join("") === "true" &&
      chars[4] === JSON_syntax.VALUE_SEPARATOR
    ) {
      return {
        type: token_types.BOOLEAN,
        text: "true",
        value: true,
      };
    }

    if (
      chars.slice(0, 5).join("") === "false" &&
      chars[5] === JSON_syntax.VALUE_SEPARATOR
    ) {
      return {
        type: token_types.BOOLEAN,
        text: "false",
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
    if (tokens[0].value === JSON_syntax.LEFT_CURLY_BRACKET) {
      return this.parseObject(tokens.slice(1));
    } else if (tokens[0].value === JSON_syntax.LEFT_SQUARE_BRACKET) {
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

    while (t.length > 1) {
      // Get key token and shift
      const objectKey = t.shift()!;

      // Ensure trailing colon and shift
      if (t[0].value !== JSON_syntax.NAME_SEPARATOR) {
        throw new Error(`[parser.object] Invalid character, "${t[0]}", found.`);
      }
      t.shift();

      /**
       * Get the value for the key. This may be a primitive value, an array,
       * or another object! We also want to set the tokens to the slice
       * returned from `parseTokens`.
       */
      const [outputTokens, objectValue] = this.parseTokens(t);
      output[objectKey.text] = objectValue;
      t = outputTokens;

      if (t[0].text === JSON_syntax.VALUE_SEPARATOR) t.shift();

      if (t[0].text === JSON_syntax.RIGHT_CURLY_BRACKET)
        return [t.slice(1), output];
    }

    if (t[0].text !== JSON_syntax.RIGHT_SQUARE_BRACKET)
      throw new Error(`[parser.object] Missing expected "}".`);

    return [t, output];
  };

  /**
   * Parses an array
   */
  parseArray = (tokens: Token[]): [Token[], OutputArray] => {
    const output: OutputArray = [];
    let t: Token[] = [...tokens];

    while (t.length > 0) {
      // output.push(t.shift()?.value);
      const [outputTokens, value] = this.parseTokens(t);
      output.push(value);
      t = outputTokens;

      if (t[0].text === JSON_syntax.VALUE_SEPARATOR) t.shift();

      if (t[0].text === JSON_syntax.RIGHT_SQUARE_BRACKET)
        return [t.slice(1), output];
    }

    if (t[0].text !== JSON_syntax.RIGHT_SQUARE_BRACKET)
      throw new Error(`[parser.array] Missing expected "]".`);

    return [t, output];
  };
}