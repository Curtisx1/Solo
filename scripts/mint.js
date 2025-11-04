const hre = require("hardhat");
async function main() {
 const a = process.env.BADGE_ADDRESS;
 const uri = process.env.TOKEN_URI;
 const [me] = await hre.ethers.getSigners();
 const C = await hre.ethers.getContractAt("DidLabBadge", a);
 const tx = await C.mintTo(me.address, uri);
 const rc = await tx.wait();
 console.log("tx:", rc.hash);
 const id = (await C.nextId()) - 1n;
 console.log("tokenId:", id.toString());
 console.log("tokenURI:", await C.tokenURI(id));
}
main().catch(e=>{console.error(e); process.exit(1);});