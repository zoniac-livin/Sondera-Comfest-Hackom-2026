import { createServer } from "vite";

const input = process.argv.slice(2).join(" ").trim();
if (!input) {
  console.error('Usage: npm run analyze -- "<text or url>"');
  process.exitCode = 1;
} else {
  const server = await createServer({
    configFile: false,
    appType: "custom",
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const { analyze } = await server.ssrLoadModule("/src/analysis/index.ts");
    const result = analyze(input);
    console.log(JSON.stringify({
      inputType: result.inputType,
      level: result.level,
      levelExplanation: result.levelExplanation,
      indicators: result.indicators,
      unavailableChecks: result.unavailableChecks,
    }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await server.close();
  }
}
