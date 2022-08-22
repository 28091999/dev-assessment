const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    const master = deployer.accountsByName.get("master");
    const approvalFile = "holdings_approval.py";
    const clearStateFile = "holdings_clearstate.py";

    // get app info
    const app = deployer.getApp(approvalFile, clearStateFile);
    const appID = app.appID;

    globalState = await readAppGlobalState(deployer, master.addr, appID);
    console.log(globalState);

    const updateprice = [convert.stringToBytes("UpdatePrice"), convert.uint64ToBigEndian(1e7)];

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appID,
        payFlags: { totalFee: 1000 },
        appArgs: updateprice,
    });

    // get global and local state
    globalState = await readAppGlobalState(deployer, master.addr, appID);
    console.log(globalState);
}

module.exports = { default: run };
