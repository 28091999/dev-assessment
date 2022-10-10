const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    const master = deployer.accountsByName.get("master");

    let globalState = await readAppGlobalState(deployer, master.addr, deployer.getCheckpointKV("mint_appid"));
    const assetID = globalState.get("teslaid");

    const burn = [convert.stringToBytes("burn"),convert.uint64ToBigEndian(2e5)];

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: deployer.getCheckpointKV("mint_appid"),
        payFlags: { totalFee: 1000 },
        accounts: [deployer.getCheckpointKV("burn_appAdress")],
        foreignAssets: [assetID],
        appArgs: burn,
    });

    let appAccountBurn = await deployer.algodClient.accountInformation(deployer.getCheckpointKV("mint_appAdress")).do();
    console.log(appAccountBurn);
    let appAccount = await deployer.algodClient.accountInformation(deployer.getCheckpointKV("burn_appAdress")).do();
    console.log(appAccount);

}

module.exports = { default: run };
