const fs = require("fs");
const path = require("path");

const ABIS_TO_PARSE = [
  "confidential_erc20_abi.json",
];

function extractAbis() {
  const baseDir = __dirname; // current folder (abis/)
  
  for (const fileName of ABIS_TO_PARSE) {
    const filePath = path.join(baseDir, fileName);
    const raw = fs.readFileSync(filePath, "utf8");

    const match = raw.match(/\[.*\]/s);
    if (!match) throw new Error(`❌ No ABI JSON array found in ${fileName}`);

    const abiJson = JSON.parse(match[0]);

    const humanReadable = abiJson
      .filter((item) => item.type === "function")
      .map((fn) => {
        const inputs = (fn.inputs || [])
          .map((i) => `${i.type} ${i.name || ""}`.trim())
          .join(", ");
        const outputs = (fn.outputs || [])
          .map((o) => o.type)
          .join(", ");
        const mutability =
          fn.stateMutability === "view" || fn.stateMutability === "pure"
            ? ` ${fn.stateMutability}`
            : "";
        const returns = outputs ? ` returns (${outputs})` : "";
        return `function ${fn.name}(${inputs})${mutability}${returns}`;
      });

    const outputPath = path.join(baseDir, fileName.replace(".json", "_flat.txt"));
    fs.writeFileSync(outputPath, JSON.stringify(humanReadable, null, 2));

    console.log(`✅ Parsed ABI written to: ${outputPath}`);
  }
}

extractAbis();
