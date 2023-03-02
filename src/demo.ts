import Parser from "./parser";

/**
 * Using String.raw to preserve escape chars to emulate
 * a JSON response blob
 */
const SAMPLE_JSON = String.raw`
[
	{
		"slogan": "We are the Globo Gym \"Purple\" Cobras. And we will... We will... Rock you!",
		"badGuys": true,
		"members": [
			"White Goodman",
			"Fran Stalinovskovichdavidovitchsky",
			"Blade",
			"Lazer",
			"Blazer",
			"Me'Shell Jones"
		]
	}
]
`;

const run = (input: string) => {
  try {
    const parser = new Parser();
    const parsedJSON: any = parser.parse(input);

    console.log("Parsed sucessfully:\n\n", parsedJSON[0]);
  } catch (e: any) {
    console.error("Failed to parse JSON:");
    console.error(e.message);
  }
};

run(SAMPLE_JSON);
