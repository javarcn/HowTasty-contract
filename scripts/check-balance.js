async function main() {
  const [signer] = await ethers.getSigners();
  const address = signer.address;
  const balance = await ethers.provider.getBalance(address);
  
  console.log("-----------------------------------------");
  console.log("当前部署账户地址:", address);
  console.log("当前账户余额 (MON):", ethers.formatEther(balance));
  console.log("-----------------------------------------");
  
  if (balance === 0n) {
    console.log("❌ 余额不足！请前往 Monad Testnet Faucet 领水。");
    console.log("领水地址: https://faucet.monad.xyz/");
  } else {
    console.log("✅ 余额充足，可以尝试重新部署。");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
