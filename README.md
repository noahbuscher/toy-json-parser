# (Yet Another) Toy Parser

`./src/parser.ts` is a **toy** JSON parser built in Typescript to educate myself a bit better on how lexers (tokenizers) and parsers work. I thought JSON would be easy enough as the spec is relatively small.

Please do not rely on this library. It's not fully to spec.

### Use

You can see the module in action in `./src/demo.ts`.

```ts
const jsonBlob = `
{
	"species": "Washingtonia filifera",
	"alternative_names": [
		"desert fan palm",
		"California fan palm"
	],
	"max_height": "66 ft"
}
`;
const parser = new Parser();

// Lex, parse, and retrieve the JS object
const parsedJSON = parser.parse(jsonBlob);
```

### Todo

- [ ] [Numbers](https://www.rfc-editor.org/rfc/rfc8259#section-6) support
- [ ] `null` support
