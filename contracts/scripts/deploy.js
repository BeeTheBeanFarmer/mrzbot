import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

    const MRZTest = await hre.ethers.getContractFactory("MRZTest");

    // Get current gas price
    const feeData = await hre.ethers.provider.getFeeData();
    console.log("Gas price:", hre.ethers.formatUnits(feeData.gasPrice || 0n, "gwei"), "gwei");

    // Deploy with lower gas settings
    const contract = await MRZTest.deploy({
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: hre.ethers.parseUnits("0.1", "gwei")
    });

    console.log("Deploying...");
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("\n========================================");
    console.log("MRZTest deployed to:", address);
    console.log("Network:", hre.network.name);
    console.log("========================================");
    console.log("\nMint function: mint(uint256)");
    console.log("Mint price: 0.001 ETH per NFT");
    console.log("Max supply: 100");
    console.log("\nView on Etherscan: https://etherscan.io/address/" + address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
