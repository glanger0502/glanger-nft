import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  let _baseTokenURI = process.env.NFT_METADATA_URL != undefined ? process.env.NFT_METADATA_URL : '';
  let _openBoxBeforeTokenURI = "hidden.json";
  let _maxTotalSupply = 7777;
  let openBoxTime = 1669445844;
  let _executeAddress = process.env.NEXT_PUBLIC_EXECUTE_ADDRESS != undefined? process.env.NEXT_PUBLIC_EXECUTE_ADDRESS :'';

  const GlangerNFT = await ethers.getContractFactory("GlangerNFT");
  const glangerNFT = await GlangerNFT.deploy(_baseTokenURI, _openBoxBeforeTokenURI, _maxTotalSupply,openBoxTime, _executeAddress);

  console.log("Token address:", glangerNFT.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
