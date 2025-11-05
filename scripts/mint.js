// scripts/mint.js (ESM, legacy gas override)
import 'dotenv/config';
import hardhat from 'hardhat';
const { ethers } = hardhat;

async function waitForTx(hash, { confirmations = 1, timeoutMs = 180_000 } = {}) {
  try {
    const rc = await ethers.provider.waitForTransaction(hash, confirmations, timeoutMs);
    return rc;
  } catch {
    console.warn(`waitForTransaction timed out after ${timeoutMs} ms; polling...`);
  }
  const start = Date.now();
  while (Date.now() - start < 300_000) { // 5 min
    const rc = await ethers.provider.getTransactionReceipt(hash);
    if (rc) return rc;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Transaction not mined after extended wait.');
}

async function main() {
  const a = process.env.BADGE_ADDRESS;
  const uri = process.env.TOKEN_URI;
  if (!a || !uri) throw new Error('Missing BADGE_ADDRESS or TOKEN_URI in .env');

  const [me] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const fee = await ethers.provider.getFeeData(); // legacy field gasPrice is used

  // Pick a higher gas price than current (e.g., 3x or fixed 30 gwei)
  const baseGwei = fee.gasPrice ? Number(fee.gasPrice / 1_000_000_000n) : 10;
  const gasGwei = Math.max(baseGwei * 3, 50); // at least 30 gwei
  const gasPrice = BigInt(gasGwei) * 1_000_000_000n;

  console.log(`Minter:   ${me.address}`);
  console.log(`Contract: ${a}`);
  console.log(`TOKEN_URI:${uri}`);
  console.log(`ChainId:  ${net.chainId.toString()}`);
  console.log(`Using gasPrice: ${gasGwei} gwei`);

  const C = await ethers.getContractAt('DidLabBadge', a);

  // optional: estimate gas and add headroom
  let gasLimit;
  try {
    const est = await C.mintTo.estimateGas(me.address, uri, { gasPrice });
    gasLimit = est + est / 5n; // +20%
    console.log(`Estimated gas: ${est.toString()} -> using ${gasLimit.toString()}`);
  } catch {
    console.log('Gas estimate failed, proceeding without explicit gasLimit');
  }

  console.log('Sending mint transaction with bumped gasPrice...');
  const overrides = gasLimit ? { gasPrice, gasLimit } : { gasPrice };
  const tx = await C.mintTo(me.address, uri, overrides);
  console.log('Transaction hash:', tx.hash);

  const rc = await waitForTx(tx.hash, { confirmations: 1, timeoutMs: 180_000 });
  console.log('Confirmed in block:', rc.blockNumber);

  // tokenId inference
  let id;
  try {
    const next = await C.nextId();
    id = next - 1n;
  } catch {
    const transferLog = rc.logs
      .map(l => { try { return C.interface.parseLog(l); } catch { return null; } })
      .find(p => p && p.name === 'Transfer');
    if (transferLog) id = transferLog.args?.tokenId;
  }

  if (id !== undefined) {
    console.log('tokenId:', id.toString());
    try {
      console.log('tokenURI:', await C.tokenURI(id));
    } catch {}
  }
}

await main().catch(e => { console.error(e); process.exit(1); });
