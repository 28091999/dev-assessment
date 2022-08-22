<template>
    <div id="buyasset" class="mb-5">
        <h3>Buy TESLA coin</h3>
        <p>You can only mint up to 1000 TESLA coins</p>
        <div
            v-if="this.acsTxId !== ''"
            class="alert alert-success"
            role="alert"
        >
            Txn Ref:
            <a :href="explorerURL" target="_blank">{{ this.acsTxId }}</a>
        </div>
        <p>TESLA coins left: {{ this.asset_left }}</p>
        <form
            action="#"
            @submit.prevent="handleBuyAsset"
        >
            <div class="mb-3">
                <label for="asset_amount" class="form-label"
                    >Buy amount</label
                >
                <input
                    type="number"
                    class="form-control"
                    id="asset_amount"
                    v-model="asset_amount"
                />
            </div>
            <button type="submit" class="btn btn-primary">Buy</button>
        </form>
    </div>
</template>

<script>
import algosdk from 'algosdk';
//import { createDecipheriv } from 'crypto';
import { getAlgodClient } from "../client.js";
import * as helpers from '../helpers';
import configHolding from "../artifacts/mint_asset.js.cp.yaml"; 
import wallets from "../wallets.js";


export default {
    props: {
        connection: String,
        network: String,
    },
    data() {
        return {
            acsTxId: "",
            asset_left: 0,
            asset_amount: 0,
            explorerURL: "",
        };
    },
    created(){
        this.amountTesla();
    },
    methods: {
        
        async amountTesla(){
            const algodClient = getAlgodClient("Localhost");
            let applicationInfoResponse1 = await algodClient.accountInformation(configHolding.default.ssc.holdings_approval.applicationAccount).do();
            this.asset_left=applicationInfoResponse1.assets[0].amount;
        },

        async updateTxn(value) {
            this.acsTxId = value;
            this.explorerURL = helpers.getExplorerURL(this.acsTxId, this.network);
        },
        async handleBuyAsset() {
            // write code here
            this.amountTesla();
            const algodClient = getAlgodClient("Localhost");
            let userAccount = algosdk.mnemonicToSecretKey(process.env.VUE_APP_ACC1_MNEMONIC);
            let sender = userAccount.addr;

            let params = await algodClient.getTransactionParams().do();
            params.fee = 1000
            params.flatFee = true

            const index= configHolding.default.ssc.holdings_approval.appID;

            //OptIn the app
           // let txnforOptin = algosdk.makeApplicationOptInTxn(sender, params, index);

            //await wallets.sendAlgoSignerTransaction(txnforOptin, algodClient); 

            let applicationInfoResponse = await algodClient.getApplicationByID(index).do();
            
            let txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                sender,
                sender,
                undefined,
                undefined,
                0,
                undefined,
                applicationInfoResponse['params']['global-state'][0].value.uint,
                params
            );

            let txn2 = algosdk.makePaymentTxnWithSuggestedParams(sender, configHolding.default.ssc.holdings_approval.applicationAccount, applicationInfoResponse['params']['global-state'][1].value.uint*this.asset_amount, undefined, undefined, params);

            const big0 = window.btoa('purchase'); 
            var bytes = [];
            var x=this.asset_amount;
                var i = 8;
                do {
                bytes[--i] = x & (255);
                x = x>>8;
                } while ( i );

            let appArgs = [];

            appArgs.push(new Uint8Array(Buffer.from(big0, "base64")));
            appArgs.push(new Uint8Array(Buffer.from(bytes, "base64")));

            let txn3 = algosdk.makeApplicationNoOpTxn(sender, params, index,appArgs,undefined,undefined,[applicationInfoResponse['params']['global-state'][0].value.uint]);
            // Store txns
            let txns = [txn1, txn2, txn3];

            // Assign group ID
            algosdk.assignGroupID(txns);

            await wallets.sendAlgoSignerTransaction(txns, algodClient);
            this.amountTesla();
},
    },
};
</script>
