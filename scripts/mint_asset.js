const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here
    const master = deployer.accountsByName.get("master");
    const approvalFile = "mint_approval.py";
    const clearStateFile = "mint_clearstate.py";
    const approvalFile1 = "holdings_approval.py";
    const clearStateFile1 = "holdings_clearstate.py";
    const approvalFile2 = "burn_approval.py";
    const clearStateFile2 = "burn_clearstate.py";

    await deployer.deployApp(
        approvalFile,
        clearStateFile,
        {
            sender: master,
            localInts: 1,
            localBytes: 0,
            globalInts: 1,
            globalBytes: 1,
        },
        { totalFee: 1000 }
    );

    // get app info
    const app = deployer.getApp(approvalFile, clearStateFile);

    // fund contract with some algos to handle inner txn
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: app.applicationAccount,
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });

    const createAsset = ["create_asset"].map(convert.stringToBytes);
    const appID = app.appID;

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appID,
        payFlags: { totalFee: 1000 },
        appArgs: createAsset,
    });

    let globalState = await readAppGlobalState(deployer, master.addr, appID);
    const assetID = globalState.get("teslaid");

    await deployer.deployApp(
        approvalFile1,
        clearStateFile1,
        {
            sender: master,
            localInts: 2,
            localBytes: 2,
            globalInts: 2,
            globalBytes: 2,
            appArgs: [convert.uint64ToBigEndian(assetID)],
        },
        { totalFee: 1000 }
    );
    
    const app1 = deployer.getApp(approvalFile1, clearStateFile1);

    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: app1.applicationAccount,
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });

    const appID1 = app1.appID;
    const optinAsset = ["optin_asset"].map(convert.stringToBytes);

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appID1,
        payFlags: { totalFee: 1000 },
        foreignAssets: [assetID],
        appArgs: optinAsset,
    });

    await deployer.deployApp(
        approvalFile2,
        clearStateFile2,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 0,
            globalBytes: 0,
        },
        { totalFee: 1000 }
    );

    // get app info
    const app2 = deployer.getApp(approvalFile2, clearStateFile2);
    const appID2 = app2.appID;

    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: app2.applicationAccount,
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });

    const optinAssetBurn = ["optin_asset_burn"].map(convert.stringToBytes);

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appID2,
        payFlags: { totalFee: 1000 },
        foreignAssets: [assetID],
        appArgs: optinAssetBurn,
    });

    let appAccountMint = await deployer.algodClient.accountInformation(app.applicationAccount).do();
    console.log(appAccountMint);
    let appAccountHold = await deployer.algodClient.accountInformation(app1.applicationAccount).do();
    console.log(appAccountHold);
    let appAccountBurn = await deployer.algodClient.accountInformation(app2.applicationAccount).do();
    console.log(appAccountBurn);
}

module.exports = { default: run };
