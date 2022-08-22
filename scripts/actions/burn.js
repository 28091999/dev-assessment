const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    const master = deployer.accountsByName.get("master");
    const approvalFile = "mint_approval.py";
    const clearStateFile = "mint_clearstate.py";
    const approvalFile1 = "burn_approval.py";
    const clearStateFile1 = "burn_clearstate.py";

    const app = deployer.getApp(approvalFile, clearStateFile);
    const app1 = deployer.getApp(approvalFile1, clearStateFile1);
    const appID = app.appID;

    let globalState = await readAppGlobalState(deployer, master.addr, appID);
    const assetID = globalState.get("teslaid");

    const burn = [convert.stringToBytes("burn"),convert.uint64ToBigEndian(2e5)];

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appID,
        payFlags: { totalFee: 1000 },
        accounts: [app1.applicationAccount],
        foreignAssets: [assetID],
        appArgs: burn,
    });

    let appAccountBurn = await deployer.algodClient.accountInformation(app.applicationAccount).do();
    console.log(appAccountBurn);
    let appAccount = await deployer.algodClient.accountInformation(app1.applicationAccount).do();
    console.log(appAccount);

}

module.exports = { default: run };
