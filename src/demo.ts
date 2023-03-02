import Parser from "./parser";

const SAMPLE_JSON = `
[
	{
		"teamName": "Globo Gym Purple Cobras",
		"slogan": "We are the Globo Gym Purple Cobras. And we will... We will... Rock you!",
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

    console.log("Parsed sucessfully:\n\n", parsedJSON);
  } catch (e: any) {
    // @todo Fix type
    console.error("Failed to parse JSON:");
    console.error(e.message);
  }
};

run(SAMPLE_JSON);
