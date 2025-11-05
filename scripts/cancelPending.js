// scripts/speedupMint.js  (ESM)
import 'dotenv/config';
import hardhat from 'hardhat';
const { ethers } = hardhat;

async function waitForReceipt(hash, { timeoutMs = 180_000, intervalMs = 2000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rc = await ethers.provider.getTransactionReceipt(hash);
    if (rc) return rc;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Receipt not found within ${timeoutMs} ms`);
}

async function main() {
  const badge = process.env.BADGE_ADDRESS;           // 0x65BD186E69765A250E3f3f0f9b2103DfcaFB63fd
  const uri   = process.env.TOKEN_URI;               // ipfs://QmdrDDjE...
  const nonce = Number(process.env.NONCE || '');     // 2
  const gasGwei = Number(process.env.GAS_GWEI || 20000); // try 80 first; bump if needed

  if (!badge || !uri || Number.isNaN(nonce)) {
    throw new Error('Set BADGE_ADDRESS, TOKEN_URI, NONCE, GAS_GWEI in .env');
  }

  const gasPrice = BigInt(gasGwei) * 1_000_000_000n;

  const [me] = await ethers.getSigners();
  const C = await ethers.getContractAt('DidLabBadge', badge);

  // estimate gas for the exact same call we’re replacing
  let gasLimit;
  try {
    const est = await C.mintTo.estimateGas(me.address, uri, { nonce, gasPrice });
    gasLimit = est + est / 5n; // +20% headroom
    console.log(`Estimated gas: ${est.toString()} -> using ${gasLimit.toString()}`);
  } catch (e) {
    console.log('Gas estimate failed; proceeding without explicit gasLimit:', e.message);
  }

  const overrides = gasLimit ? { nonce, gasPrice, gasLimit } : { nonce, gasPrice };

  console.log(`Replacing nonce ${nonce} with higher gasPrice ${gasGwei} gwei...`);
  const tx = await C.mintTo(me.address, uri, overrides);
  console.log('Replacement tx hash:', tx.hash);

  const rc = await waitForReceipt(tx.hash, { timeoutMs: 180_000 });
  console.log('Confirmed in block:', rc.blockNumber, ' status:', rc.status);

  try {
    const next = await C.nextId();
    const id = next - 1n;
    console.log('tokenId:', id.toString());
    try {
      console.log('tokenURI:', await C.tokenURI(id));
    } catch {}
  } catch {}
}

await main().catch(e => { console.error(e); process.exit(1); });
