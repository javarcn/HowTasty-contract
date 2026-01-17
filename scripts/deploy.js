const hre = require("hardhat");

async function main() {
  console.log("Deploying HowTasty contract...");

  const HowTasty = await hre.ethers.getContractFactory("HowTasty");
  const howTasty = await HowTasty.deploy();

  await howTasty.waitForDeployment();

  const address = await howTasty.getAddress();
  console.log(`HowTasty deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
