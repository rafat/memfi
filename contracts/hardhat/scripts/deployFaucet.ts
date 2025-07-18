import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    // Hardcoded METH amd MBTC addresses METH: '0x7a3BC65C2277F49D78e65D57eC841d7e88C2c99e',
    //MBTC: '0xA10E9A755b9B9fc6171A49be6fE3d22EBb557Bf3',

    const meth_address = "0x7a3BC65C2277F49D78e65D57eC841d7e88C2c99e";
    const mbtc_address = "0xA10E9A755b9B9fc6171A49be6fE3d22EBb557Bf3";

    // 1. Deploy Faucet
    console.log("Deploying Faucet...");
    const Faucet = await ethers.getContractFactory("Faucet");
    const faucet = await Faucet.deploy(
        meth_address,mbtc_address
    );
    await faucet.waitForDeployment();
    console.log(`Faucet deployed: ${await faucet.getAddress()}`);
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});