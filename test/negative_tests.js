const { types } = require("@algo-builder/web");
const { assert, expect } = require("chai");
const { Runtime, AccountStore, ERRORS } = require("@algo-builder/runtime");
const algosdk = require("algosdk");
const { convert } = require("@algo-builder/algob");

const mintApprovalFile = "mint_approval.py";
const mintClearStateFile = "mint_clearstate.py";

const holdingApprovalFile = "holdings_approval.py";
const holdingClearStateFile = "holdings_clearstate.py";

const burnApprovalFile = "burn_approval.py";
const burnclearStateFile = "burn_clearstate.py";

const RUNTIME_ERR1009 = 'RUNTIME_ERR1009: TEAL runtime encountered err opcode'; 

describe("Negative Tests", function () {
    // Write your code here
    let master;
    let runtime;
    let appInfoMint;
    let acc1;

    // do this before each test
    this.beforeEach(async function () {
        master = new AccountStore(100e6); //100 Algos
        acc1 = new AccountStore(600e6); //100 Algos
        runtime = new Runtime([master,acc1]);
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
    
    
    
    const initMint = (runtime,master) => {
        return initContract(
            runtime, 
            master, 
            mintApprovalFile, 
            mintClearStateFile,
            0,
            0,
            1,
            2,
            []
        );
    };
    
    
    const createAsset = (runtime,master,appID) => {
    
        //create asset
        const createAsset = ["create_asset"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: master,
            appID: appID,
            payFlags: { totalFee: 1000 },
            appArgs: createAsset,
        });
    
        //get asset ID
        const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);
        const assetID = Number(getGlobal(appID, "teslaid"));
    
        return assetID;
    }
    
    
    const initBurn = (runtime,master,assetID) => {
        return initContract(
            runtime, 
            master, 
            burnApprovalFile, 
            burnclearStateFile,
            0,
            0,
            1,
            0,
            [convert.uint64ToBigEndian(assetID)]
        );
    };
    
    const initHolding = (runtime,master,assetID) => {
        return initContract(
            runtime, 
            master, 
            holdingApprovalFile, 
            holdingClearStateFile,
            0,
            0,
            2,
            0,
            [convert.uint64ToBigEndian(assetID)]
        );
    };
    
    const optIn = (runtime, account, appID, assetID) => {
        const optinAsset = ["optin_asset"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            foreignAssets: [assetID],
            appArgs: optinAsset,
        });
    };
    
    const optInBurn = (runtime, account, appID, assetID) => {
        const optinAsset = ["optin_asset_burn"].map(convert.stringToBytes);
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            foreignAssets: [assetID],
            appArgs: optinAsset,
        });
    };

    const transfer = (runtime, type, amountToSend, account, appID, appAccount, assetID) => {
        const appArgs = [convert.stringToBytes(type),convert.uint64ToBigEndian(amountToSend)];
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            accounts: [appAccount],
            foreignAssets: [assetID],
            appArgs: appArgs,
        });
    };
    
    
    const updatePrice = (runtime, account, appID, newPrice) => {
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
    
    const saveAccounts = (runtime, account, appID, holdigsAppAdress,burnAppAdress) => {
        const save_accounts  = ["save_Adress"].map(convert.stringToBytes);
        const accounts = [holdigsAppAdress,burnAppAdress];
        runtime.executeTx({
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            accounts: accounts,
            appArgs: save_accounts,
        });
    }
    
    const selling = (runtime, account, assetID, appAccount, amountOfAlgo, appID, amountOfAsset) => {
        const appArgs = [convert.stringToBytes("purchase"),convert.uint64ToBigEndian(amountOfAsset)];
        runtime.executeTx([{
            type: types.TransactionType.TransferAlgo,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            toAccountAddr: appAccount,
            amountMicroAlgos: amountOfAlgo,
            payFlags: { totalFee: 1000 },
        },{
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appID,
            payFlags: { totalFee: 1000 },
            foreignAssets: [assetID],
            appArgs: appArgs,
        }]);
    }

    it("Double asset creation fails", () => {
        appInfoMint = initMint(runtime,master.account);
        
        // create asste 
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);

        // create asste again
        assert.throws(() => { const assetID = createAsset(runtime,master.account,appInfoMint.appID) }, RUNTIME_ERR1009);
    });

    it("Asset creation fails when non-creator calls", () => {
        appInfoMint = initMint(runtime,master.account);
        
        // create asste 
        assert.throws(() => { const assetID = createAsset(runtime,acc1.account,appInfoMint.appID) }, RUNTIME_ERR1009);
    });

    it("Asset transfer fails when supply is insufficient" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

       // do opt in
       optIn(runtime, master.account, appInfoHolding.appID, assetID);

        assert.throws(() => { transfer(runtime, 
            "transfer", 
            50000000, 
            master.account,
            appInfoMint.appID, 
            appInfoHolding.applicationAccount,
            assetID
        ) }, RUNTIME_ERR1009);
    }).timeout(10000);

    it("Asset burn fails when supply is insufficient" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

        // do opt in
        optInBurn(runtime, master.account, appInfoBurn.appID, assetID);

        assert.throws(() => { transfer(runtime, 
            "burn", 
            10000000, 
            master.account,
            appInfoMint.appID, 
            appInfoBurn.applicationAccount,
            assetID
        ) }, RUNTIME_ERR1009);
    }).timeout(10000);

    it("Asset transfer fails when non-creator calls" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

       // do opt in
       optIn(runtime, master.account, appInfoHolding.appID, assetID);

        assert.throws(() => { transfer(runtime, 
            "transfer", 
            50000000, 
            acc1.account,
            appInfoMint.appID, 
            appInfoHolding.applicationAccount,
            assetID
        ) }, RUNTIME_ERR1009);


    }).timeout(10000);

    it("Asset burn fails when non-creator calls" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);
        

        // do opt in
        optInBurn(runtime, master.account, appInfoBurn.appID, assetID);

        assert.throws(() => { transfer(runtime, 
            "burn", 
            10000000, 
            acc1.account,
            appInfoMint.appID, 
            appInfoBurn.applicationAccount,
            assetID
        ) }, RUNTIME_ERR1009);
    }).timeout(10000);

    it("Update price fails when called by non-creator" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        const newPrice = 8e6;
        //update price by non creator
        assert.throws(() => { updatePrice(runtime,acc1.account,appInfoHolding.appID,newPrice) }, RUNTIME_ERR1009);
    
    }).timeout(10000);

    it("Selling token fails when supply < amount sold" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);
        // do opt in
        optIn(runtime, master.account, appInfoHolding.appID, assetID);
        transfer(runtime, 
            "transfer", 
            50, 
            master.account,
            appInfoMint.appID, 
            appInfoHolding.applicationAccount,
            assetID
            );
        const amountOfAsset = 100;
        const amountOfAlgo = 5e6*100;
        assert.throws(() =>{selling(runtime, acc1.account, assetID, appInfoHolding.applicationAccount,amountOfAlgo, appInfoHolding.appID,amountOfAsset)}, RUNTIME_ERR1009);
    }).timeout(10000);

    it("Selling tokens fails when transaction is not grouped" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);
        // do opt in
        optIn(runtime, master.account, appInfoHolding.appID, assetID);
        transfer(runtime, 
            "transfer", 
            50, 
            master.account,
            appInfoMint.appID, 
            appInfoHolding.applicationAccount,
            assetID
            );
        const amountOfAsset = 100;
        assert.throws(() =>{
            runtime.executeTx({
                type: types.TransactionType.CallApp,
                sign: types.SignType.SecretKey,
                fromAccount: acc1.account,
                appID: appInfoHolding.appID,
                payFlags: { totalFee: 1000 },
                foreignAssets: [assetID],
                appArgs: [convert.stringToBytes("selling"),convert.uint64ToBigEndian(amountOfAsset)],
            })}, RUNTIME_ERR1009);
         }).timeout(10000);


    it("Buying 0 token fails" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);
        // do opt in
        optIn(runtime, master.account, appInfoHolding.appID, assetID);
        transfer(runtime, 
            "transfer", 
            50, 
            master.account,
            appInfoMint.appID, 
            appInfoHolding.applicationAccount,
            assetID
            );
        const amountOfAsset = 0;
        const amountOfAlgo = 5e6*100;
        assert.throws(() =>{selling(runtime, acc1.account, assetID, appInfoHolding.applicationAccount,amountOfAlgo, appInfoHolding.appID,amountOfAsset)}, RUNTIME_ERR1009);
    }).timeout(10000);


    it("Buying tockens with insufficient algos" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);
        // do opt in
        optIn(runtime, master.account, appInfoHolding.appID, assetID);
        transfer(runtime, 
            "transfer", 
            50, 
            master.account,
            appInfoMint.appID, 
            appInfoHolding.applicationAccount,
            assetID
            );
        const amountOfAsset = 100;
        const amountOfAlgo = 5e6;
        assert.throws(() =>{selling(runtime, acc1.account, assetID, appInfoHolding.applicationAccount,amountOfAlgo, appInfoHolding.appID,amountOfAsset)}, RUNTIME_ERR1009);
    }).timeout(10000);

    it("Transfer token to non holding app fails" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);

       // do opt in
       optIn(runtime, master.account, appInfoHolding.appID, assetID);

        assert.throws(() => { transfer(runtime, 
            "transfer", 
            50000000, 
            acc1.account,
            appInfoMint.appID, 
            appInfoBurn.applicationAccount,
            assetID
        ) }, RUNTIME_ERR1009);


    }).timeout(10000);

    it("Burn token to non burn app fails" , () => {
        appInfoMint = initMint(runtime,master.account);
        const assetID = createAsset(runtime,master.account,appInfoMint.appID);
        const appInfoBurn = initBurn(runtime,master.account,assetID);
        const appInfoHolding = initHolding(runtime,master.account,assetID);
        saveAccounts(runtime,
            master.account,
            appInfoMint.appID,
            appInfoHolding.applicationAccount,
            appInfoBurn.applicationAccount);
        

        // do opt in
        optInBurn(runtime, master.account, appInfoBurn.appID, assetID);

        assert.throws(() => { transfer(runtime, 
            "burn", 
            10000000, 
            acc1.account,
            appInfoMint.appID, 
            appInfoHolding.applicationAccount,
            assetID
        ) }, RUNTIME_ERR1009);
    }).timeout(10000);

});
