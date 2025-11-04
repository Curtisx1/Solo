async function main() {
  const hardhat = await import("hardhat");
  const hre = hardhat.default;
  
  // The ethers plugin should be attached to the HRE
  console.log("Checking for ethers in HRE...");
  console.log("HRE keys:", Object.keys(hre));
  
  // Check if ethers is available
  if (!hre.ethers) {
    console.error("Ethers plugin not loaded!");
    console.error("Make sure @nomicfoundation/hardhat-ethers is imported in hardhat.config.js");
    process.exit(1);
  }
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  
  const Badge = await hre.ethers.getContractFactory("DidLabBadge");
  const badge = await Badge.deploy(deployer.address);
  
  await badge.waitForDeployment();
  
  console.log("DidLabBadge deployed to:", await badge.getAddress());
}

main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
});