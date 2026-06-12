/**
 * Compile-check for the README "Developer experience" snippet: the code block
 * below (between the markers) is copied verbatim from velum-network/README.md
 * and must keep compiling against the real SDK.
 */
import express from "express";

const app = express();
app.use(express.json());

async function summarize(text: string) {
  return { summary: text.slice(0, 100) };
}

// --- README snippet starts here ---
import { VelumClient } from "@velum/sdk";

const velum = new VelumClient({ apiKey: process.env.VELUM_API_KEY });

app.post("/summarize", async (req, res) => {
  await velum.requirePayment(req);          // settles confidentially before the work runs
  const result = await summarize(req.body.text);
  res.json(result);
});
// --- README snippet ends here ---
