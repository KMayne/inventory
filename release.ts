import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const IMAGE = "ghcr.io/kmayne/inventory";
const CONFIG_YAML = "inventory/config.yaml";
const PACKAGE_JSON = "package.json";

function run(cmd: string) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function readVersion(): [number, number, number] {
  const yaml = readFileSync(CONFIG_YAML, "utf-8");
  const match = yaml.match(/^version:\s*"?(\d+)\.(\d+)\.(\d+)"?/m);
  if (!match) throw new Error(`Could not parse version from ${CONFIG_YAML}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function setVersion(version: string) {
  // Update config.yaml
  const yaml = readFileSync(CONFIG_YAML, "utf-8");
  writeFileSync(CONFIG_YAML, yaml.replace(/^version:.*$/m, `version: "${version}"`));
  console.log(`Updated ${CONFIG_YAML}`);

  // Update package.json
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf-8"));
  pkg.version = version;
  writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`Updated ${PACKAGE_JSON}`);
}

async function main() {
  const [major, minor, patch] = readVersion();
  const current = `${major}.${minor}.${patch}`;

  const bumps = {
    patch: `${major}.${minor}.${patch + 1}`,
    minor: `${major}.${minor + 1}.0`,
    major: `${major + 1}.0.0`,
  };

  console.log(`Current version: ${current}\n`);
  console.log(`  1) patch  → ${bumps.patch}`);
  console.log(`  2) minor  → ${bumps.minor}`);
  console.log(`  3) major  → ${bumps.major}`);
  console.log();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const choice = await rl.question("Choose [1/2/3]: ");
  rl.close();

  const newVersion =
    choice === "1" ? bumps.patch :
    choice === "2" ? bumps.minor :
    choice === "3" ? bumps.major : null;

  if (!newVersion) {
    console.error("Invalid choice");
    process.exit(1);
  }

  console.log(`\nBumping ${current} → ${newVersion}\n`);

  setVersion(newVersion);

  run(`git add ${CONFIG_YAML} ${PACKAGE_JSON}`);
  run(`git commit -m "chore: release ${newVersion}"`);
  run(`git tag v${newVersion}`);

  console.log(`\nBuilding and pushing ${IMAGE}:${newVersion} ...\n`);
  run(
    `docker buildx build` +
    ` --platform linux/amd64,linux/arm64` +
    ` --tag ${IMAGE}:${newVersion}` +
    ` --tag ${IMAGE}:latest` +
    ` --push .`
  );

  console.log(`\nDone! Released v${newVersion}`);
  console.log(`  Config & package.json updated`);
  console.log(`  Git tag: v${newVersion}`);
  console.log(`  Docker: ${IMAGE}:${newVersion} + :latest`);
  console.log(`\nDon't forget to push: git push && git push --tags`);
}

main();
