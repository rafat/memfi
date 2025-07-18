import * as fs from "fs";
import * as path from "path";

// ✅ Customize this list with your contract names (file and class names must match)
const CONTRACTS = ["AMM", "LendingPool","MockERC20","MultiTokenPriceOracle","PortfolioTracker","Staking", "Faucet"];

// ✅ Directory to output ABI files — adjust if your frontend is in a different path
const ABI_OUTPUT_DIR = path.join(__dirname, "./abis");

function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function extractAbis() {
  ensureDirExists(ABI_OUTPUT_DIR);

  for (const name of CONTRACTS) {
    const artifactPath = path.join(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`);

    if (!fs.existsSync(artifactPath)) {
      console.error(`❌ Artifact not found: ${artifactPath}`);
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const abi = artifact.abi;

    const abiFilePath = path.join(ABI_OUTPUT_DIR, `${name}.json`);
    fs.writeFileSync(abiFilePath, JSON.stringify(abi, null, 2));

    console.log(`✅ Extracted ABI for ${name} → ${abiFilePath}`);
  }
}

extractAbis();
