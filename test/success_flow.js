const { types } = require("@algo-builder/web");
const { assert, expect } = require("chai");
const { Runtime, AccountStore, ERRORS } = require("@algo-builder/runtime");
const algosdk = require("algosdk");
const { convert } = require("@algo-builder/algob");

const approvalFileMint = "mint_approval.py";
const clearStateFileMint = "mint_clearstate.py";

const approvalFileHolding = "holdings_approval.py";
const clearStateFileHolding = "holdings_clearstate.py";

const approvalFileBurn = "burn_approval.py";
const clearStateFileBurn = "burn_clearstate.py";

describe("Success Flow", function () {
    // Write your code here
    let master;
    let runtime;
    let appInfoMint;

    // do this before each test
    this.beforeEach(async function () {
        master = new AccountStore(1e9); //1000 Algos
        runtime = new Runtime([master]);
    });

    const initContract = (runtime, creatorAccount, approvalFile, clearStateFile, locInts, locBytes, gloInts, gloBytes, args) => {
        // create new app
        runtime.deployApp(
            approvalFile,
            clearStateFile,
            {
                sender: creatorAccount,
                localInts: locInts,
                localBytes: locBytes,
                globalInts: gloInts,
                globalBytes: gloBytes,
                appArgs: args,
            },
            { totalFee: 1000 }, //pay flags
        );

        const appInfo = runtime.getAppInfoFromName(approvalFile, clearStateFile);
        const appAddress = appInfo.applicationAccount;  

        // fund the contract
        runtime.executeTx({
            type: types.TransactionType.TransferAlgo,
            sign: types.SignType.SecretKey,
            fromAccount: creatorAccount, //use the account object
            toAccountAddr: appAddress, //app address
            amountMicroAlgos: 2e7, //20 algos
            payFlags: { totalFee: 1000 },
        });

        return appInfo;
    };

    const initMint = () => {
        return initContract(
            runtime, 
            master.account, 
            approvalFileMint, 
            clearStateFileMint,
            0,
            0,
            1,
            0,
            []
        );
    };


    const initBurn = () => {
        return initContract(
            runtime, 
            master.account, 
            approvalFileBurn, 
            clearStateFileBurn,
            0,
            0,
            0,
            0,
            []
        );
    };

    const initHolding = (ID) => {
        return initContract(
            runtime, 
            master.account, 
            approvalFileHolding, 
            clearStateFileHolding,
            0,
            0,
            2,
            0,
            [convert.uint64ToBigEndian(ID)]
        );
    };

    const optInBurn = (runtime, account, appID, asset) => {
        const optinAssetBurn = ["optin_asset_burn"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            foreignAssets: [asset],
            appArgs: optinAssetBurn,
        });
    };

    const optInHolding = (runtime, account, appID, asset) => {
        const optinAssetHolding = ["optin_asset"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            foreignAssets: [asset],
            appArgs: optinAssetHolding,
        });
    };
    

    const amountToSendBurn = 5;
    const Testburn = (runtime, account, appID, appAccount, assets) => {
        const burn = [convert.stringToBytes("burn"),convert.uint64ToBigEndian(amountToSendBurn)];
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            accounts: [appAccount],
            foreignAssets: [assets],
            appArgs: burn,
        });
    };
    

    const amountToSendTransfer = 3;
    const Testtransfer = (runtime, account, appID, appAccount, assets) => {
        const transfer = [convert.stringToBytes("transfer"),convert.uint64ToBigEndian(amountToSendTransfer)];
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            accounts: [appAccount],
            foreignAssets: [assets],
            appArgs: transfer,
        });
    };

    
    const newPrice = 1200000;
    const updatePrice = (runtime, account, appID) => {
        const updateprice = [convert.stringToBytes("UpdatePrice"),convert.uint64ToBigEndian(newPrice)];
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            appArgs: updateprice,
        });
    };


    const createdAsset = () => {
        const appID1 = appInfoMint.appID;

        //create asset
        const createAsset = ["create_asset"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: master.account,
            appID: appID1,
            payFlags: { totalFee: 1000 },
            appArgs: createAsset,
        });

        //get asset ID
        const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);
        const assetID = Number(getGlobal(appID1, "teslaid"));
        //console.log(assetID);

        return assetID;
    }
    
    it("Deploys mint contract successfully", () => {
        const appInfo = initMint();
        const appID = appInfo.appID;

        // verify app created
        assert.isDefined(appID);

        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);

    }).timeout(10000);


    it("Deploys holding contract successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfo = initHolding(ID);
        const appID = appInfo.appID;

        // verify app created
        assert.isDefined(appID);

        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);
    }).timeout(10000);

    it("Deploys Burn contract successfully", () => {
        const appInfo = initBurn();
        const appID = appInfo.appID;

        // verify app created
        assert.isDefined(appID);

        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);
    }).timeout(10000);

    it("Holding contract opts in successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding= initHolding(ID);

        // do opt in
        optInHolding(runtime, master.account, appInfoHolding.appID, ID);

    }).timeout(10000);

    it("burn contract opts in successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoBurn= initBurn();

        // do opt in
        optInBurn(runtime, master.account, appInfoBurn.appID, ID);

    }).timeout(10000);


    
    it("asset created successfully", () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        // verify assetID
        assert.isDefined(ID);

    }).timeout(10000);

    it("price updated successfully" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);

        //update price
        updatePrice(runtime,master.account,appInfoHolding.appID);

        //check new price
        const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);
        assert.equal(getGlobal(appInfoHolding.appID, "current_price"), newPrice);
        

    }).timeout(10000);

    
    it("Transfer successfully" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoHolding = initHolding(ID);

        optInHolding(runtime, master.account, appInfoHolding.appID, ID);
        
        //update price
        Testtransfer(runtime,master.account,appInfoMint.appID,appInfoHolding.applicationAccount,ID);

        const appAccount = runtime.getAccount(appInfoHolding.applicationAccount);
        //check new price
        console.log(Number(appAccount.assets.get(ID).amount));
        assert.equal(Number(appAccount.assets.get(ID).amount),3);

    }).timeout(10000);

    it("Burn successfully" , () => {
        appInfoMint = initMint();
        const ID = createdAsset();
        const appInfoBurn = initBurn();

        optInBurn(runtime, master.account, appInfoBurn.appID, ID);
        
        //update price
        Testburn(runtime,master.account,appInfoMint.appID,appInfoBurn.applicationAccount,ID);

        const appAccount = runtime.getAccount(appInfoBurn.applicationAccount);
        //check new price
        console.log(Number(appAccount.assets.get(ID).amount));
        assert.equal(Number(appAccount.assets.get(ID).amount),5);

    }).timeout(10000);
    

});
