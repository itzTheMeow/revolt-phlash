import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const apiPaths = ["./index.ts"];
function tryInclude(r) {
  const root = path.join(process.cwd(), "src/" + r);
  function doInclude(p) {
    const files = fs.readdirSync(p);
    files.forEach((f) => {
      const fp = path.join(p, f);
      if (fs.statSync(fp).isDirectory()) doInclude(fp);
      else if (f.endsWith(".ts")) apiPaths.push(fp.replace(root, "./" + r).replace(/\\/g, "/"));
    });
  }
  doInclude(root);
}
tryInclude("cmds");
fs.writeFileSync(
  path.join(process.cwd(), "src/dist.ts"),
  apiPaths.map((p) => `import "${p}";`).join("\n")
);

esbuild.buildSync({
  entryPoints: ["./src/dist.ts"],
  outfile: "dist.js",
  bundle: true,
  platform: "node",
  external: [
    "enhanced.db-new",
    "jsdom",
    "@distube/ytdl-core",
    "yt-dlp-exec",
    "ffmpeg-static",
    "soundcloud.ts",
  ],
});
