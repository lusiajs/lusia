import type { ApiEntry } from "./types.ts";

export const flowEntries: ApiEntry[] = [
	{
		id: "if",
		name: "<IF>",
		kind: "markup",
		group: "flow",
		signature: "<IF {condition}> ... </IF>",
		summary: "Shows its content only while the condition is true.",
		bullets: [
			"A variable works as it is: {loggedIn}. Compare with .value: {score.value > 3}.",
			"Shows only the first true branch. Add <ELSEIF> and <ELSE> after it.",
			"A new branch appears at once. The old one plays its DETACH animations first.",
			"Uses JavaScript truthiness: 0, empty text and null are false.",
		],
		example: `<script>\nimport { variable } from "lusiajs";\n\nconst loggedIn = variable(false);\n\nfunction logIn() {\n  loggedIn.value = true;\n}\n</script>\n\n<IF {loggedIn}>\n  <p>Welcome back.</p>\n</IF>\n<ELSE>\n  <button onclick={logIn}>Log in</button>\n</ELSE>`,
	},
	{
		id: "elseif",
		name: "<ELSEIF>",
		kind: "markup",
		group: "flow",
		signature: "<ELSEIF {condition}> ... </ELSEIF>",
		summary: "Another branch of an IF, checked when the branches before it are false.",
		bullets: [
			"Must come right after </IF> or another </ELSEIF>.",
			"Needs its own {condition}.",
			"Checked in order. The first true branch wins.",
		],
		example: `<script>\nimport { variable } from "lusiajs";\n\nconst score = variable(72);\n</script>\n\n<IF {score.value >= 90}>\n  <p>A</p>\n</IF>\n<ELSEIF {score.value >= 70}>\n  <p>C</p>\n</ELSEIF>\n<ELSE>\n  <p>Try again</p>\n</ELSE>`,
	},
	{
		id: "else",
		name: "<ELSE>",
		kind: "markup",
		group: "flow",
		signature: "<ELSE> ... </ELSE>",
		summary: "The last branch of an IF, shown when no earlier branch is true.",
		bullets: [
			"Takes no condition and no attributes.",
			"Must come right after </IF> or </ELSEIF>.",
			"Ends the chain. Nothing can follow it.",
		],
		example: `<script>\nimport { variable } from "lusiajs";\n\nconst loggedIn = variable(false);\n</script>\n\n<IF {loggedIn}>\n  <p>Welcome back.</p>\n</IF>\n<ELSE>\n  <p>Please log in.</p>\n</ELSE>`,
	},
	{
		id: "each",
		name: "<EACH>",
		kind: "markup",
		group: "flow",
		signature:
			"<EACH {list} as={item} index={i} key={item.id}> ... </EACH>",
		summary: "Repeats its content once for each item in a list.",
		bullets: [
			"as={name} names the item. Without it, the markup cannot read the item.",
			"index={name} holds the position. It is a variable, so show it as {i} or {i.value + 1}.",
			"key={expr} gives each row an identity. Rows with the same key move, not rebuild. Keys must be unique.",
			"Without key, the item itself is the key. The list can be an array or a variable that holds one.",
			"A removed row plays its DETACH animations before it leaves the page.",
		],
		example: `<script>\nimport { variable } from "lusiajs";\n\nconst todos = variable([\n  { id: 1, title: "Write docs" },\n  { id: 2, title: "Ship" },\n]);\n\nfunction remove(id: number) {\n  todos.value = todos.value.filter((todo) => todo.id !== id);\n}\n</script>\n\n<ul>\n  <EACH {todos} as={todo} index={i} key={todo.id}>\n    <li>{i.value + 1}. {todo.title} <button onclick={() => remove(todo.id)}>Remove</button></li>\n  </EACH>\n</ul>`,
	},
	{
		id: "for",
		name: "<FOR>",
		kind: "markup",
		group: "flow",
		signature: "<FOR {i} from={0} to={5} step={1}> ... </FOR>",
		summary: "Repeats its content for a range of numbers.",
		bullets: [
			"{i} names the number. It is a plain number, so {i + 1} works.",
			"from is the start, default 0. to is the end and is not included: to={3} gives 0, 1, 2.",
			"step is the gap, default 1. A negative step counts down: from={3} to={0} step={-1}.",
			"A step of 0 throws. The bounds are read reactively, so the rows update when they change.",
		],
		example: `<script>\nimport { variable } from "lusiajs";\n\nconst rows = variable(3);\n</script>\n\n<FOR {i} from={0} to={rows.value}>\n  <p>Row {i + 1}</p>\n</FOR>`,
	},
];
